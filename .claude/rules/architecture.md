This project uses a feature-based architecture. Place new code accordingly.

## Directory layout

```
src/app/
  core/           # cross-cutting singletons (auth, interceptors, guards, types)
  layout/         # app chrome: main-layout, header, sidebar
  modules/        # feature folders, see below
  shared/ui/      # vendored spartan helm components + reusable presentational components
  app.routes.ts   # top-level routes
  app.config.ts   # providers: router, http, error listeners
  app.ts          # root component, renders <router-outlet /> only
```

## This repo is empty on purpose

`src/app/modules/` contains only `welcome`, a throwaway smoke screen that the first real
feature should replace. **There are no example features to copy from.** Do not search for
`crm`, `tickets`, `auth` or similar; they do not exist here. Build from the conventions
below instead.

## Features (`src/app/modules/<feature>/`)

- Each feature owns its routes file, `<feature>.routes.ts`, lazy-loaded from `app.routes.ts` via `loadChildren`.
- Feature components live at the feature root or in subfolders.
- Sub-features nest the same pattern (`modules/crm/newsletter/subscribers/`), and each level can have its own routes file.
- Feature-scoped services go in `modules/<feature>/services/`.

Example wiring in `app.routes.ts`:

```ts
{
  path: 'leads',
  loadChildren: () => import('./modules/leads/leads.routes').then((m) => m.routes),
}
```

## Core vs shared

- `core/` holds singletons and app-wide concerns: auth service, guards, HTTP interceptors, global types. Use `providedIn: 'root'`. Import via `@core/*`.
- `shared/ui/` holds presentational components reused across features, including the vendored spartan helm components. No business logic, no feature imports. Import helm via `@ui/<name>`.
- If a service or component is used by exactly one feature, keep it in that feature folder. Promote to `shared/ui` or `core` only when a second consumer actually appears.

## Layout

- New pages render inside `MainLayout` (header + sidebar) by default, as children of the root route in `app.routes.ts`.
- Do NOT strip app chrome for "premium feel" pages unless explicitly asked.
- `MainLayout` already provides the skip link, the `<main id="main-content">` landmark and the `.page-container` max-width wrapper. Do not re-add those per page.

## Routing

- Feature routes are lazy-loaded via `loadChildren` from `app.routes.ts`.
- Keep route definitions inside the feature's own `<feature>.routes.ts`.
- `withComponentInputBinding()` is enabled, so route params and query params arrive as signal `input()`s on the routed component. Do not inject `ActivatedRoute` to read them.

## File naming

- `<name>.ts`, `<name>.html`, `<name>.css`, `<name>.spec.ts`. No `.component` suffix.
- Use external templates with paths relative to the component TS file.
- Do not create an empty `.css` file alongside a component. Add one only when it has rules.
