#!/usr/bin/env node
/**
 * Launch, doctor, seed, and tear down a Lead Inbox verification run.
 *
 * From the cms-client repo root:
 *
 *   node .cursor/skills/verify-lead-inbox/scripts/verify.mjs launch
 *   node .cursor/skills/verify-lead-inbox/scripts/verify.mjs doctor
 *   node .cursor/skills/verify-lead-inbox/scripts/verify.mjs account-create
 *   node .cursor/skills/verify-lead-inbox/scripts/verify.mjs seed-lead
 *   node .cursor/skills/verify-lead-inbox/scripts/verify.mjs cleanup
 */

import { spawn, execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_URL = 'http://localhost:4200';
const API_BASE = 'http://localhost:8000/api/v1';
const ORIGIN = 'http://localhost:4200';
const TITLE_MARK = '<title>Lead Inbox</title>';
const READY_MS = 90_000;
const POLL_MS = 500;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(skillDir, '../../..');
const runDir = path.join(skillDir, '.run');
const statePath = path.join(runDir, 'state.json');
const accountPath = path.join(runDir, 'account.json');
const leadPath = path.join(runDir, 'lead.json');
const serveLogPath = path.join(runDir, 'serve.log');

const command = process.argv[2] ?? 'help';

try {
  await dispatch(command);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

async function dispatch(name) {
  switch (name) {
    case 'launch':
      await launch();
      break;
    case 'doctor':
      await doctor();
      break;
    case 'account-create':
      await accountCreate();
      break;
    case 'seed-lead':
      await seedLead();
      break;
    case 'cleanup':
      cleanup();
      break;
    case 'help':
    case '--help':
      help();
      break;
    default:
      fail(`Unknown command ${name}. Run with help.`);
  }
}

function help() {
  process.stdout.write(`Lead Inbox verification helper

Usage: node .cursor/skills/verify-lead-inbox/scripts/verify.mjs <command>

  launch          Start pnpm start on ${APP_URL} if the port is free. Adopt a
                  Lead Inbox already listening there. Never bind another port.
  doctor          Read-only check: app identity, cms-api health, CORS, and
                  whether this run owns the client process.
  account-create  Rejects email sign-up, writes a password user with no
                  organization, then creates that workspace. Writes
                  .run/account.json. Use this for inbox and detail proofs.
                  Do not use it for the account feature.
  seed-lead       Sign in with .run/account.json, mint an API key, POST one
                  lead. Writes .run/lead.json. Machines create leads this
                  way. The UI has no create-lead screen.
  cleanup         Stop a client this run started. Leave an adopted client,
                  cms-api, and evidence/ alone. Deletes .run/.
`);
}

async function launch() {
  await assertApi();

  const existing = await appIdentity();
  if (existing.ok) {
    writeState({
      owned: false,
      pid: null,
      url: APP_URL,
      api: API_BASE,
      adoptedAt: new Date().toISOString(),
    });
    ok(`adopted url=${APP_URL} owned=false`);
    return;
  }

  if (existing.listening) {
    fail(
      `${APP_URL} is in use, but the response is not Lead Inbox (${existing.reason}). Stop that process or use its own port. This app must stay on 4200 because cms-api CORS allows ${ORIGIN} only.`,
    );
  }

  mkdirSync(runDir, { recursive: true });
  writeFileSync(serveLogPath, '');

  const out = (await import('node:fs')).openSync(serveLogPath, 'a');
  const child = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['start'], {
    cwd: repoRoot,
    stdio: ['ignore', out, out],
    detached: true,
    windowsHide: true,
    env: process.env,
  });
  child.unref();

  writeState({
    owned: true,
    pid: child.pid,
    url: APP_URL,
    api: API_BASE,
    startedAt: new Date().toISOString(),
  });

  try {
    await waitForApp();
  } catch (error) {
    killPid(child.pid);
    throw error;
  }

  ok(`started pid=${child.pid} url=${APP_URL} owned=true`);
}

async function doctor() {
  const state = readState();
  const app = await appIdentity();
  if (!app.ok) {
    fail(`app ${APP_URL}: ${app.reason}`);
  }

  const api = await apiHealth();
  if (!api.ok) {
    fail(`api ${API_BASE}/health: ${api.reason}`);
  }

  const cors = await corsAllowsOrigin();
  if (!cors.ok) {
    fail(`cors: ${cors.reason}`);
  }

  const session = await getSession(new Map());
  if (!session.ok) {
    fail(`auth get-session: ${session.reason}`);
  }

  let ownership = 'unowned';
  if (state?.owned && state.pid) {
    ownership = pidAlive(state.pid) ? `owned pid=${state.pid}` : `owned pid=${state.pid} (dead)`;
    if (!pidAlive(state.pid)) {
      fail(`${ownership}. The process this run started is gone. Run launch again.`);
    }
  } else if (state && state.owned === false) {
    ownership = 'adopted';
  }

  ok(`url=${APP_URL} title=Lead Inbox ${ownership}`);
  ok(`api=${API_BASE} health=ok database=${api.database}`);
  ok(`cors origin=${ORIGIN} allow-credentials=true`);
  ok(`get-session status=${session.status} signed-in=${session.signedIn}`);
}

async function accountCreate() {
  await assertApi();

  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const account = {
    name: 'Verify Owner',
    email: `verify.${stamp}@lead-inbox.test`,
    password: `verify-${stamp}`,
    createdAt: new Date().toISOString(),
  };
  const slug = `verify-${stamp}`;

  const signUp = await apiFetch('/auth/sign-up/email', {
    method: 'POST',
    origin: true,
    body: {
      name: account.name,
      email: account.email,
      password: account.password,
    },
  });
  if (signUp.json?.code !== 'EMAIL_PASSWORD_SIGN_UP_DISABLED') {
    fail(`email sign-up must be disabled, got ${signUp.status}: ${signUp.text}`);
  }

  const apiRoot = path.resolve(repoRoot, '../cms-api');
  const provision = path.join(
    apiRoot,
    '.cursor/skills/verify-cms-api/scripts/provision-owner.mjs',
  );
  execFileSync(
    process.execPath,
    [
      provision,
      '--database',
      'dev',
      '--name',
      account.name,
      '--email',
      account.email,
      '--password',
      account.password,
    ],
    { cwd: apiRoot, stdio: 'inherit' },
  );

  const jar = new Map();
  const signIn = await apiFetch('/auth/sign-in/email', {
    method: 'POST',
    jar,
    origin: true,
    body: { email: account.email, password: account.password },
  });
  if (!signIn.ok) {
    fail(`sign-in failed (${signIn.status}): ${signIn.text}`);
  }

  const before = await apiFetch('/workspaces/admission', { method: 'GET', jar, origin: true });
  if (before.json?.phase !== 'onboarding') {
    fail(`new user must have no organization, got ${before.text}`);
  }

  const found = await apiFetch('/workspaces', {
    method: 'POST',
    jar,
    origin: true,
    body: { name: account.name, slug, website: null, logoHoldKey: null },
  });
  if (!found.ok) {
    fail(`workspace create failed (${found.status}): ${found.text}`);
  }
  if (found.json?.role !== 'owner' || found.json?.slug !== slug) {
    fail(`workspace create did not make this user the owner of ${slug}: ${found.text}`);
  }

  mkdirSync(runDir, { recursive: true });
  writeFileSync(accountPath, `${JSON.stringify(account, null, 2)}\n`);
  ok(`email=${account.email} slug=${slug} file=${rel(accountPath)}`);
}

async function seedLead() {
  await assertApi();
  const account = readJson(accountPath);
  if (!account?.email || !account?.password) {
    fail(`Missing ${rel(accountPath)}. Run account-create, or sign up in the browser and write the same shape there.`);
  }

  const jar = new Map();
  const signIn = await apiFetch('/auth/sign-in/email', {
    method: 'POST',
    jar,
    origin: true,
    body: { email: account.email, password: account.password },
  });
  if (!signIn.ok) {
    fail(`sign-in failed (${signIn.status}): ${signIn.text}`);
  }

  const keyRes = await apiFetch('/api-keys', {
    method: 'POST',
    jar,
    origin: true,
    body: { name: 'verify-lead-inbox' },
  });
  if (!keyRes.ok) {
    fail(`api-keys failed (${keyRes.status}): ${keyRes.text}`);
  }

  const rawKey = keyRes.json?.key;
  if (typeof rawKey !== 'string') {
    fail('api-keys response had no key. The raw key is only returned at creation.');
  }

  const fieldsRes = await apiFetch('/leads/fields', {
    method: 'GET',
    apiKey: rawKey,
  });
  if (!fieldsRes.ok) {
    fail(`leads/fields failed (${fieldsRes.status}): ${fieldsRes.text}`);
  }

  const stamp = `${Date.now()}`;
  const candidate = `Verify Candidate ${stamp}`;
  const values = valuesFor(fieldsRes.json, stamp, candidate);

  const leadRes = await apiFetch('/leads', {
    method: 'POST',
    apiKey: rawKey,
    body: { values },
  });
  if (!leadRes.ok) {
    fail(`POST /leads failed (${leadRes.status}): ${leadRes.text}`);
  }

  const record = {
    id: leadRes.json.id,
    candidate,
    source: values.source,
    createdAt: new Date().toISOString(),
  };
  mkdirSync(runDir, { recursive: true });
  writeFileSync(leadPath, `${JSON.stringify(record, null, 2)}\n`);
  ok(`id=${record.id} candidate=${candidate} file=${rel(leadPath)}`);
}

function cleanup() {
  const state = readState();
  if (state?.owned && state.pid) {
    killPid(state.pid);
    ok(`stopped pid=${state.pid}`);
  } else if (state?.owned === false) {
    ok(`left adopted client at ${APP_URL}`);
  } else {
    ok('no client started by this run');
  }

  if (existsSync(runDir)) {
    rmSync(runDir, { recursive: true, force: true });
    ok(`removed ${rel(runDir)}`);
  }

  ok('evidence/ kept');
}

async function assertApi() {
  const api = await apiHealth();
  if (!api.ok) {
    fail(
      `cms-api is not answering at ${API_BASE}/health (${api.reason}). Start cms-api on http://localhost:8000 with CORS_ALLOWED_ORIGINS including ${ORIGIN}.`,
    );
  }
}

async function waitForApp() {
  const deadline = Date.now() + READY_MS;
  while (Date.now() < deadline) {
    const app = await appIdentity();
    if (app.ok) {
      return;
    }
    await sleep(POLL_MS);
  }
  fail(`Timed out waiting for ${APP_URL} after ${READY_MS}ms. See ${rel(serveLogPath)}.`);
}

async function appIdentity() {
  try {
    const response = await fetch(APP_URL, { redirect: 'follow' });
    const text = await response.text();
    if (!response.ok) {
      return { ok: false, listening: true, reason: `HTTP ${response.status}` };
    }
    if (!text.includes(TITLE_MARK)) {
      return {
        ok: false,
        listening: true,
        reason: 'HTML has no <title>Lead Inbox</title>',
      };
    }
    return { ok: true, listening: true };
  } catch (error) {
    return { ok: false, listening: false, reason: errorMessage(error) };
  }
}

async function apiHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const text = await response.text();
    if (!response.ok) {
      return { ok: false, reason: `HTTP ${response.status} ${text}` };
    }
    let database = 'unknown';
    try {
      database = JSON.parse(text)?.details?.database?.status ?? 'unknown';
    } catch {
      database = 'unparsed';
    }
    return { ok: true, database };
  } catch (error) {
    return { ok: false, reason: errorMessage(error) };
  }
}

async function corsAllowsOrigin() {
  try {
    const response = await fetch(`${API_BASE}/auth/get-session`, {
      method: 'OPTIONS',
      headers: {
        Origin: ORIGIN,
        'Access-Control-Request-Method': 'GET',
      },
    });
    const allowOrigin = response.headers.get('access-control-allow-origin');
    const allowCreds = response.headers.get('access-control-allow-credentials');
    if (allowOrigin !== ORIGIN && allowOrigin !== '*') {
      return {
        ok: false,
        reason: `Access-Control-Allow-Origin is ${allowOrigin ?? '(missing)'}, expected ${ORIGIN}`,
      };
    }
    if (allowCreds !== 'true') {
      return {
        ok: false,
        reason: `Access-Control-Allow-Credentials is ${allowCreds ?? '(missing)'}, expected true`,
      };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: errorMessage(error) };
  }
}

async function getSession(jar) {
  const result = await apiFetch('/auth/get-session', { method: 'GET', jar, origin: true });
  if (result.status === 0) {
    return { ok: false, reason: result.text, status: 0, signedIn: false };
  }
  if (result.status !== 200) {
    return { ok: false, reason: `HTTP ${result.status} ${result.text}`, status: result.status, signedIn: false };
  }
  return { ok: true, status: 200, signedIn: result.json !== null };
}

async function apiFetch(pathname, options) {
  const headers = { ...(options.headers ?? {}) };
  if (options.origin) {
    headers.Origin = ORIGIN;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.apiKey) {
    headers['x-api-key'] = options.apiKey;
  } else if (options.jar) {
    const cookie = cookieHeader(options.jar);
    if (cookie) {
      headers.Cookie = cookie;
    }
  }

  try {
    const response = await fetch(`${API_BASE}${pathname}`, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    if (options.jar) {
      storeCookies(response.headers.getSetCookie?.() ?? [], options.jar);
    }
    const text = await response.text();
    let json = null;
    if (text !== '') {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    return { ok: response.ok, status: response.status, text, json };
  } catch (error) {
    return { ok: false, status: 0, text: errorMessage(error), json: null };
  }
}

function valuesFor(fields, stamp, candidate) {
  const values = {};
  for (const field of fields) {
    if (field.isReadOnly) {
      continue;
    }
    if (!field.isRequired && field.key !== 'candidate') {
      continue;
    }
    switch (field.key) {
      case 'candidate':
        values[field.key] = candidate;
        break;
      case 'product':
        values[field.key] = field.options?.[0] ?? 'POS';
        break;
      case 'source':
        values[field.key] = `https://example.com/verify/${stamp}`;
        break;
      case 'signal':
        values[field.key] =
          'Asked which POS handles split bills for a forty-seat cafe during lunch.';
        break;
      case 'whyLead':
        values[field.key] =
          'Opening a second location next month and comparing POS vendors now.';
        break;
      default:
        values[field.key] = valueForType(field, stamp);
    }
  }
  return values;
}

function valueForType(field, stamp) {
  switch (field.type) {
    case 'select':
      return field.options?.[0] ?? 'x';
    case 'number':
      return 1;
    case 'url':
      return `https://example.com/verify/${stamp}`;
    case 'date':
      return '2026-09-20';
    case 'long_text':
      return `Verification long text for ${field.key} on ${stamp}.`;
    default:
      return `Verify ${field.key} ${stamp}`;
  }
}

function storeCookies(setCookie, jar) {
  for (const header of setCookie) {
    const pair = header.split(';', 1)[0];
    const eq = pair.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) {
      jar.set(name, value);
    }
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function writeState(state) {
  mkdirSync(runDir, { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function readState() {
  return readJson(statePath);
}

function readJson(file) {
  if (!existsSync(file)) {
    return null;
  }
  return JSON.parse(readFileSync(file, 'utf8'));
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killPid(pid) {
  if (!pid) {
    return;
  }
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch {
    // Already gone.
  }
}

function rel(file) {
  return path.relative(repoRoot, file).replaceAll('\\', '/');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function ok(message) {
  process.stdout.write(`ok ${message}\n`);
}

function fail(message) {
  process.stderr.write(`fail ${message}\n`);
  process.exit(1);
}
