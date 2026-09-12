# angular-boilerplate

An opinionated Angular starter for admin dashboards, data-heavy CRUD apps, and MVPs.

Ships agent-ready for Claude Code, Cursor, and Codex: shared rules in `AGENTS.md`, the `unslop` skill, and MCP servers for both Angular and spartan/ui, so your AI tools follow current Angular 22 conventions instead of guessing at v16 ones.

![Angular 22](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![spartan/ui](https://img.shields.io/badge/spartan%2Fui-brain_%2B_helm-1F1F1F)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-testing-6E9F18?logo=vitest&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-package_manager-F69220?logo=pnpm&logoColor=white)
![MIT](https://img.shields.io/badge/license-MIT-green)

Every dependency is MIT. PrimeNG was dropped at v22 because it moved to a paid licence above small-team thresholds.

## Use this template

1. Click **Use this template**, then **Create a new repository** at the top of this repository.
2. Clone your repository and start the dev server:

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
pnpm install
pnpm start
```

The welcome screen that loads is a smoke test. It renders the theme tokens, both fonts, and a row of spartan buttons, so you can confirm the setup works before writing anything. Delete it once your first feature exists.

> [!TIP]
> **Outdated template?**
> If this repository has not been updated in a while, feed this prompt into your AI coding assistant:
> ```text
> Update all project dependencies to their latest stable versions, including Angular.
> Check peer ranges first: @angular/build pins the allowed TypeScript and Vitest versions,
> and @spartan-ng/brain pins the allowed Angular range.
> ```

## After cloning

1. **`AGENTS.md`**: fill in the `Product overview` section (what the app is, who uses it, what it does for them). Your AI tools read this first.
2. **`src/styles.css`**: brand tokens. Hex belongs here and nowhere else. Read the warning in [Design tokens](#design-tokens) before renaming any of them.
3. **`src/environments/`**: `apiBaseUrl` for dev and prod.
4. **`package.json`**, **`angular.json`**, **`src/index.html`**, **`src/app/layout/header/header.html`**: replace the `angular-boilerplate` name. `angular.json` has the project key plus two `buildTarget` references.
5. **`LICENSE`**: copyright holder.
6. Delete `src/app/modules/welcome/` and its route in `src/app/app.routes.ts`, then start building.

## What's wired up

- `src/app/layout/`: header, sidebar, and `MainLayout`, already routed. `MainLayout` provides the skip link, the `<main>` landmark, and the `page-container` width wrapper, so pages do not repeat them
- `src/app/app.config.ts`: router with `withComponentInputBinding()` (route params arrive as signal `input()`s) and `withInMemoryScrolling()`, plus `provideHttpClient(withFetch())`
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

Pick a component from the prompt. The CLI vendors its source into `src/app/shared/ui/` and registers a `@ui/<name>` path alias. Those files are yours, so restyle them in place rather than overriding them from outside. Config lives in `components.json`.

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
