# cms-client

Lead Inbox: the web client for cms-api. Agents and automations post leads into the API
with an API key. This app is where a person signs in, reads them, and works them.

It covers sign in and sign up, a filterable and paged leads inbox, lead detail, and a Lead
fields settings screen. On lead detail a person copies the suggested first message, edits
values and sets the status. The inbox and detail take their fields from the organization's
lead fields: the table opens on the short ones and a Columns menu adds the rest, while long
text and links stay on the lead. The settings screen lists those fields and adds custom
ones in a dialog. There is no lead creation, API key management or Google sign-in in the UI
yet.

The API contract is in two docs. [docs/fe-phase1-api.md](docs/fe-phase1-api.md) covers
sessions and API keys, and [docs/fe-lead-fields-api.md](docs/fe-lead-fields-api.md) covers
leads and lead fields.

Built on Angular 22 (zoneless, signals), spartan/ui, Tailwind CSS v4 and Vitest.

## Run it locally

You need cms-api running on `http://localhost:8000` with `CORS_ALLOWED_ORIGINS` including
`http://localhost:4200` (its local default).

```bash
pnpm install
pnpm start
```

Open `http://localhost:4200`. Signed-out visitors land on the sign in screen, which links
to `/sign-up` for a new account. The account comes with its own organization and an
empty inbox.

Leads come from `POST /api/v1/leads` with an `x-api-key` header, minted with
`POST /api/v1/api-keys` from a signed-in session. A lead's `values` must match the
organization's lead fields, which `GET /api/v1/leads/fields` lists. Scripts that call the
`/auth` routes must send an `Origin` header, because Better Auth rejects browser-shaped
requests without one. The contract docs have the full shapes.

`apiBaseUrl` lives in `src/environments/environment.ts` (dev) and
`environment.prod.ts` (prod). The prod value is still a placeholder.

## What's wired up

- `src/app/core/auth/`: session service and route guards. `src/app/core/lead-fields/`: the field definitions service. `src/app/modules/`: `auth` (sign in and sign up in one centered card shell), `leads` (inbox and detail) and `settings` (Lead fields)
- `src/app/layout/`: header, sidebar, and `MainLayout`, already routed. `MainLayout` provides the skip link, the `<main>` landmark, and the `shell-gutter` padding, so pages do not repeat them. Each page picks `page-wide` or `page-standard` on its host
- `src/app/app.config.ts`: router with `withComponentInputBinding()` (route params arrive as signal `input()`s) and `withInMemoryScrolling()`, plus `provideHttpClient(withFetch())` with a credentials interceptor (sends the session cookie) and a 401 interceptor (sends a stale session back to sign in)
- `src/styles.css`: brand tokens, Tailwind v4 `@theme inline` mapping, and the spartan preset. Light scheme only
- `src/app/shared/ui/`: spartan helm components vendored into the repo, imported through `@ui/<name>`
- `tsconfig.json`: `@ui/*`, `@core/*`, and `@env/*` path aliases
- Zoneless and OnPush by default. `zone.js` is not installed
- `AGENTS.md`, `.claude/rules/`, `.claude/skills/`, `.mcp.json`: agent rules, the `unslop` writing skill, and the Angular and spartan MCP servers

## Scripts

```bash
pnpm start    # dev server
pnpm build    # production build
pnpm watch    # dev build, watch mode
pnpm test     # vitest
pnpm verify   # build + test, the gate before calling work done
```

## Adding UI components

```bash
pnpm ng g @spartan-ng/cli:ui
```

Pick a component from the prompt, or name it (`pnpm ng g @spartan-ng/cli:ui textarea`). The CLI vendors its source into `src/app/shared/ui/` and registers a `@ui/<name>` path alias. Those files are yours, so restyle them in place rather than overriding them from outside. Config lives in `components.json`. Restart `pnpm start` afterwards. A dev server started before the new alias existed serves components that import it uncompiled.

`@spartan-ng/brain` stays an npm dependency and supplies the behaviour and accessibility underneath. `@spartan-ng/cli` is a schematics collection with no executable, so it has to stay a devDependency. `pnpm dlx` cannot run it.

## Design tokens

Tokens live as CSS variables in `src/styles.css` and reach Tailwind through `@theme inline`.

Their names follow the spartan and shadcn contract, because the vendored helm components read `--background`, `--primary`, `--muted`, `--accent`, `--border`, `--ring`, `--radius`, and the `--sidebar-*` set directly. Adding tokens is safe. Renaming one silently breaks every component that reads it.

One trap worth knowing: `--secondary` and `--accent` are low-contrast surfaces in this contract, used for secondary buttons and hover states. They are not a second brand colour. The vivid accent sits in `--ring`.

Fonts are Poppins for headings and Work Sans for body, loaded from Google Fonts in `src/index.html` and applied globally.

## Conventions

Read before contributing, human or agent:

- [.claude/rules/angular-standards.md](.claude/rules/angular-standards.md)
- [.claude/rules/architecture.md](.claude/rules/architecture.md)
- [.claude/rules/theming.md](.claude/rules/theming.md)

The ones that bite most often:

- Never set `changeDetection`. OnPush is the Angular 22 default, and `ChangeDetectionStrategy.Eager` opts a component out of it
- The app is zoneless, so state has to flow through signals or the view will not update
- Native control flow (`@if`, `@for`, `@switch`), always with `track`
- `class` and `style` bindings, never `ngClass` or `ngStyle`
- Feature folders under `src/app/modules/<feature>/`, lazy-loaded through their own `<feature>.routes.ts`
- No hardcoded hex outside `src/styles.css`
- WCAG AA minimum, must pass AXE
- A spec asserting only `toBeTruthy()` is not a test

## License

[MIT](LICENSE)
