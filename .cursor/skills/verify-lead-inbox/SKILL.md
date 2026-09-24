---
name: verify-lead-inbox
description: Drive the Lead Inbox Angular web client in a real browser to prove sign-in, the leads inbox, lead detail, and lead fields against cms-api. Use after UI, routing, or API-client changes, or when you need a scripted user-path proof.
---

# Verify Lead Inbox

Lead Inbox is the human client for cms-api. A person signs in, reads agent-filed leads, edits values, sets status, and archives them. This skill drives that web UI the way a person does. Vitest specs are not a substitute.

Read `features/README.md` and the matching feature file before you drive. A proof that uses one convenient entry point is incomplete when the map lists others.

## Launch

The client is `pnpm start` at `http://localhost:4200`. cms-api must already be on `http://localhost:8000` with `CORS_ALLOWED_ORIGINS` including `http://localhost:4200`. The session cookie lives on the API origin. A second client port will fail CORS. Do not start this app on any other port.

From the cms-client repo root:

```bash
node .cursor/skills/verify-lead-inbox/scripts/verify.mjs launch
```

Ready means `launch` printed `ok` and `GET http://localhost:4200` returns HTML that includes `<title>Lead Inbox</title>`. Angular route titles then become `Sign in | Lead Inbox`, `Leads | Lead Inbox`, and so on.

If 4200 already serves Lead Inbox, launch adopts it and prints `owned=false`. If 4200 serves something else, launch refuses. If 4200 is free, launch starts `pnpm start` and records the PID under `.cursor/skills/verify-lead-inbox/.run/`.

Do not drive a random tab the user already had open in Chrome. Drive the Cursor IDE browser against `http://localhost:4200`. Do not start a second `pnpm start` while one is listening.

Teardown is `cleanup` below. It kills only a process this run started.

## Doctor

Run this first whenever anything looks off, and once after launch:

```bash
node .cursor/skills/verify-lead-inbox/scripts/verify.mjs doctor
```

It is read-only. It must report:

- `url=http://localhost:4200 title=Lead Inbox` plus `owned pid=...` or `adopted`
- `api=http://localhost:8000/api/v1 health=ok database=up`
- CORS from `http://localhost:4200` with credentials allowed
- `GET /auth/get-session` with `Origin: http://localhost:4200` answering HTTP 200

Refuse to drive if doctor fails. A client with a down API shows sign-in and then `Sign in failed`. That is not a product bug to file as a verification pass.

## Drive

Use the Cursor IDE browser tools: `browser_navigate`, `browser_lock`, `browser_snapshot`, `browser_click`, `browser_fill`, `browser_press_key`, `browser_take_screenshot`. Lock the tab after navigate. Unlock when the whole proof is done.

Prefer accessible names from the snapshot. Dialogs, select lists, and popovers are portaled into the document. After you open one, snapshot the page again and look there, not inside the triggering control.

Use a desktop viewport so the sidebar is visible (`md` and up). Under that, the sidebar is hidden. On a phone-sized viewport the header has `Settings` as an icon link (`aria-label="Settings"`) and the `Lead Inbox` brand link goes to `/leads`.

After `browser_navigate`, wait until an `h1` has the route heading. The first snapshot is often an empty document titled `Lead Inbox` while Angular boots. Poll `document.querySelector('h1')?.textContent` rather than sleeping.

### Routes

| URL | Who can open it | Heading |
| --- | --- | --- |
| `/login` | signed out. A session redirects to `/leads` | Sign in to Lead Inbox |
| `/sign-up` | signed out. A session redirects to `/leads` | Create account |
| `/leads` | signed in. Otherwise `/login?returnUrl=/leads` | Leads (N) |
| `/leads/:id` | signed in | the lead's Contact value, or Untitled lead |
| `/settings` | signed in | Settings |
| `/settings/lead-fields` | signed in | Lead fields |

A deep link while signed out becomes `/login?returnUrl=<that path>`. After sign-in the app follows `returnUrl` only when it starts with a single `/`.

### Stable handles

**Sign in.** Textboxes `Email` (`#email`) and `Password` (`#password`). Submit `Sign in`. The button reads `Signing in` while the request is in flight. Failures use an alert titled `Sign in failed`. Footer link `Create one` goes to `/sign-up`. The Google control's accessible name is `Continue with Google (coming soon)`. It is disabled. The visible badge still reads `Soon`.

**Sign up.** Textboxes `Name` (`#name`), `Email` (`#email`), `Password` (`#password`). Submit `Create account`. Description: `Your account includes an organization and an empty leads list.` Password help: `At least 8 characters.` Failures use `Sign up failed`. Footer link `Sign in` goes to `/login`.

**Chrome.** Brand link `Lead Inbox`. Nav `Main` has `Leads`. Nav `Settings` has `Settings`. Header shows the user email and `Sign out`. Sign out opens a dialog titled `Sign out?` with `Stay signed in` and a second `Sign out`.

**Inbox.** Heading `Leads (N)` once the page lands, including `Leads (0)` on an empty org. Filter nav `Filter leads by status` with `All`, `New`, `Contacted`, `Qualified`, then a rule, then `Archived`. The current tab has `aria-current="page"`. Table `aria-label="Leads"`. The Contact cell is a link named after the person. Empty copy: `No leads yet`, `No leads with this status`, `No archived leads`. Columns is a button that opens a popover with legend `Fields to show in the table` and `Reset columns` once someone has picked. Pagination, when present, is `Pagination` with `Previous` and `Next`. Query params: `page`, `status`, `archived=true`. Links into a lead use `queryParamsHandling="preserve"`. The header email is visible text, not an ARIA name. Prove it from the screenshot.

**Lead.** `Back to leads`. Title plus a status badge. Loud action `Open source` when a URL field is set, with screen-reader text `(facebook.com, opens in a new tab)` using the real host. `Edit` and `Archive` sit beside it. Archive asks `Archive this lead?` then `Archive lead`. An archived lead shows `This lead is archived.` and `Restore` with no confirm. Status is a labelled select in the details rail, not in the header. Passages use `field-label` headings `What they said` and `Why this is a lead`. Details is an `aside` named `Details`. Empty writable fields are counted as `N fields are empty.` not as rows. Last line is `Updated ...` and the lead id. Toasts: `Status saved`, `Changes saved`, `No changes`. Failures stay on the page: `Status not saved`, `Changes not saved`, `Could not archive`, `Could not restore`. Selects and dialogs: after open, read `[data-slot="select-item"]` or the dialog from the document.

**Lead fields.** Heading `Lead fields`. Table `aria-label="Lead fields"` with columns Field, Type, Required on new leads, Key. System rows show `Built-in`. `status` and `receivedAt` also show `Automatic`. `Add field` opens a dialog whose heading id is `add-lead-field-heading`. Form fields: `Label` (`#lead-field-label`), `Type` (`#lead-field-type`, closed value is the type name such as `Text`, never `long_text`), `Options` when Type is Select, checkbox `Required on new leads`, Advanced `Key` (`#lead-field-key`). Submit is the dialog's `Add field`. Cancel emits dismiss. Status line: `Added {label}.`

### Accounts and seed data

Do not sign in as the user's own account. Create a verification org.

- For the [account](features/account.md) feature, sign up in the browser.
- For every other feature, create the org through the helper so you do not re-prove sign-up:

```bash
node .cursor/skills/verify-lead-inbox/scripts/verify.mjs account-create
```

That writes `.cursor/skills/verify-lead-inbox/.run/account.json`. Sign in through the UI with that email and password.

The UI cannot create leads. Machines post them with an API key:

```bash
node .cursor/skills/verify-lead-inbox/scripts/verify.mjs seed-lead
```

That mints a key from the verification session and `POST /leads`. It writes `.run/lead.json` with `id` and `candidate`. Reload `/leads` afterwards. Do not send `x-api-key` from the browser. CORS does not allow that header.

Start each recipe from doctor-ok plus the feature's preconditions. If the Cursor browser still has an old session, sign out through the header dialog before you sign in as the verification user.

## Evidence

Put proof under `.cursor/skills/verify-lead-inbox/evidence/<feature-id>/`. Cleanup must not delete that directory.

A pass needs:

- The real user path in the running app. Do not call Angular internals, Vitest, or test-only endpoints.
- The action and the resulting state. A final screenshot alone is not enough. Capture before the submit or click when the result would otherwise be ambiguous.
- An ARIA snapshot (`browser_snapshot` written to `*.aria.txt`) and a screenshot (`*.png`) that show Lead Inbox and the thing you proved. `browser_take_screenshot` `filename` is a basename. The file lands under Cursor's temp screenshots directory. Copy it into `evidence/<feature-id>/`. An absolute destination fails on Windows.
- For mutations, a second user-facing view. After sign-up, the inbox. After a status change, the badge and a toast, then the inbox filter for that status. After archive, the archived strip, then the Archived tab. After adding a field, the Lead fields table and the status line.
- Side effects at the production boundary. A new account answers `GET /auth/get-session` in the app as the header email. A seeded lead is one `POST /leads` with an API key, which is how agents file leads. Do not stub cms-api.

Record the feature id and the entry point on the artifact names, for example `evidence/account/signup-from-link.aria.txt`.

If a mapped entry point is blocked, report the URL or control you tried and the unmet precondition. Do not call a skip verified through a different path.

## Cleanup

```bash
node .cursor/skills/verify-lead-inbox/scripts/verify.mjs cleanup
```

Stops the `pnpm start` this run launched. Leaves an adopted client on 4200 running. Never kills by process name. Never stops cms-api. Deletes `.cursor/skills/verify-lead-inbox/.run/` (PID, serve log, account.json, lead.json). Leaves `evidence/` in place.

Sign out of the verification user in the Cursor browser if you will keep using that browser, so the next run does not inherit the session. That is optional. The next run must still check.

## Helpers

All live in `.cursor/skills/verify-lead-inbox/scripts/verify.mjs`. Run them from the cms-client repo root.

| Command | What it does |
| --- | --- |
| `launch` | Adopt or start the client on 4200 after cms-api answers |
| `doctor` | Identity, API health, CORS, session route |
| `account-create` | Unique user and org through `POST /auth/sign-up/email` |
| `seed-lead` | Mint an API key and `POST /leads` for that org |
| `cleanup` | Kill only what launch started, keep evidence |

`account-create` and `seed-lead` send `Origin: http://localhost:4200` on `/auth` calls. Better Auth rejects those routes with `403 MISSING_OR_NULL_ORIGIN` when the header is missing. `POST /leads` uses `x-api-key` and no session cookie. The two auth modes do not mix.
