# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, etc.) working in this repository.

## Product overview

<!-- FILL THIS IN after cloning. Agents read it first and it shapes every decision below. -->

- **What this app is:** TODO
- **Who uses it:** TODO
- **What it does for them:** TODO
- **Primary screens:** TODO

## Project

Angular boilerplate / GitHub template repository for SPAs: admin dashboards, data-heavy CRUD apps, MVPs.

Stack: Angular 22 (standalone, signals, zoneless), spartan/ui (`@spartan-ng/brain` + vendored helm components), Tailwind CSS v4, TypeScript 6 (strict), Vitest. Package manager: **pnpm**.

Not animation-heavy. Not UI-experiment-heavy. Favour boring, dense, accessible screens.

## Commands

- `pnpm install`: install dependencies
- `pnpm start`: dev server
- `pnpm build`: production build
- `pnpm test`: run tests (Vitest)
- `pnpm verify`: **build + test. Run this before claiming work is done.**
- `pnpm ng g @spartan-ng/cli:ui`: add a spartan/ui component (interactive picker)

## MCP servers

`.mcp.json` registers two. Prefer them over guessing an API or shelling out:

- **angular** (`ng mcp`): `list_projects`, `get_best_practices`, documentation search, modernisation helpers. Call `get_best_practices` before writing Angular code.
- **spartan**: component documentation, source, and blocks for spartan/ui. Use it instead of guessing a helm API.

## Writing

The `unslop` skill applies to every prose surface in this repo: README, this file, rules
files, code comments, commit messages, PR descriptions, and UI copy. No em dashes,
sentence case headings, plain words, active voice.

## Current state of the repo

This is an **empty template**. `src/app/modules/` contains only the throwaway `welcome`
feature. There are no example features to copy from. Do not look for them.

What exists:

```
src/app/
  core/            # empty. cross-cutting singletons go here
  layout/          # main-layout, header, sidebar (wired and rendering)
  modules/welcome/ # DELETE ME smoke screen, referenced from app.routes.ts
  shared/ui/       # vendored spartan helm components (button, utils)
```

## Required rules

- [.claude/rules/angular-standards.md](.claude/rules/angular-standards.md): TypeScript/Angular/component/a11y standards
- [.claude/rules/architecture.md](.claude/rules/architecture.md): feature-folder architecture, routing, naming
- [.claude/rules/theming.md](.claude/rules/theming.md): colors, typography, spartan/ui theming

## Key conventions (summary)

- Standalone components only; do NOT set `standalone: true`
- **Do NOT set `changeDetection`. OnPush is the Angular 22 default.** Never use
  `ChangeDetectionStrategy.Eager`: it is the renamed pre-v22 `Default` and exists only
  for back-compat with old codebases.
- Signals for state, `computed()` for derived state, `input()`/`output()` functions
- Native control flow (`@if`, `@for`, `@switch`): no `*ngIf` / `*ngFor`
- `class`/`style` bindings: no `ngClass` / `ngStyle`
- Reactive Forms (or Signal Forms, stable in v22); `inject()` over constructor injection
- Feature folders under `src/app/modules/<feature>/` with their own `<feature>.routes.ts`, lazy-loaded
- File naming: `<name>.ts|html|css|spec.ts` (no `.component` suffix)
- Theme tokens only (`bg-primary`, `text-heading`, `border-border`, ...): never hardcode hex in components
- spartan/ui first, Tailwind second, custom CSS last
- WCAG AA minimum

## Imports

Path aliases (see `tsconfig.json` `paths`):

- `@ui/<component>`: vendored spartan helm components, e.g. `import { HlmButton } from '@ui/button'`
- `@core/*`: `src/app/core/*`
- `@env/*`: `src/environments/*`

Everything else uses relative imports.

## spartan/ui

`@spartan-ng/brain` is an npm dependency (headless behaviour + a11y). The styled "helm"
layer is **vendored into `src/app/shared/ui/`** by the CLI: those files are ours, edit
them freely, they are not node_modules.

- Add a component: `pnpm ng g @spartan-ng/cli:ui` then import from `@ui/<name>`
- The `spartan` MCP server (configured in `.mcp.json`) serves component docs and examples.
  Use it instead of guessing APIs.
- Helm sources contain `dark:` variants. This project is **light-scheme only**; those
  variants never activate. Leave them, do not spend effort stripping them.

## Testing

Specs assert real behaviour, not just construction. `expect(component).toBeTruthy()`
alone is not an acceptable test. Assert rendered landmarks, ARIA attributes, emitted
outputs, or computed state. Components using the router need `provideRouter([])`.

## Environment config

`src/environments/environment.ts` (dev) / `environment.prod.ts` (prod), swapped via `fileReplacements` in `angular.json`. HTTP is provided in `app.config.ts` via `provideHttpClient(withFetch())`.
