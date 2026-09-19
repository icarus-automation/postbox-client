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

## Existing features

`src/app/modules/` holds `auth` (the centered `auth-shell` card, sign in and sign up),
`leads` (inbox list, detail, value display, status badge, status picker, and
a feature-scoped `services/leads.ts`) and `settings` (the Lead fields list and its add
field form, at `/settings/lead-fields`). The field definitions service is in
`core/lead-fields/`, because both `leads` and `settings` use it. Copy the shape of `leads`
when adding a feature: a routes file, one folder per screen, types beside the routes file,
and services under `services/`.

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
- `MainLayout` already provides the skip link, the `<main id="main-content">` landmark and the `shell-gutter` side padding. Do not re-add those per page.
- Every page inside `MainLayout` picks one of two widths with a host class: `host: { class: 'page-wide' }` for tables that use the whole main column, `page-standard` for a single record. Everything on a standard page shares its left and right edges. Do not add a third width, and do not nest a narrower column under a wider header.
- Signed-out screens (sign in, sign up) render outside `MainLayout` inside `AuthShell`, the one centered card. It supplies their `<main>` landmark.
- The sidebar lists only destinations that ship. Do not add placeholder nav items.

## Routing

- Feature routes are lazy-loaded via `loadChildren` from `app.routes.ts`.
- Keep route definitions inside the feature's own `<feature>.routes.ts`.
- `withComponentInputBinding()` is enabled, so route params and query params arrive as signal `input()`s on the routed component. Do not inject `ActivatedRoute` to read them.

## File naming

- `<name>.ts`, `<name>.html`, `<name>.css`, `<name>.spec.ts`. No `.component` suffix.
- Use external templates with paths relative to the component TS file.
- Do not create an empty `.css` file alongside a component. Add one only when it has rules.
