You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

Your code must reflect production-grade practices used in enterprise applications.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
- TypeScript 6: `baseUrl` is deprecated. Path mappings in `tsconfig.json` must start with `./`

## Angular Best Practices (v22)

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It has been the default since v20
- **Must NOT set `changeDetection` at all. `OnPush` is the default in Angular 22.**
  `ChangeDetectionStrategy.Eager` is the renamed pre-v22 `Default` and exists only so old
  codebases keep working. Writing it in new code silently opts that component out of
  OnPush. If you see it, delete it.
- The app is zoneless. `zone.js` is not installed. Never add it, and never call
  `provideZoneChangeDetection()`. State changes must flow through signals; anything else
  will not trigger a render
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images (it does not work for inline base64)
- Prefer `injectAsync` for deferring heavy optional dependencies

## Accessibility Requirements

- It MUST pass all AXE checks
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes
- Every interactive element needs an accessible name. Icon-only buttons need `aria-label`
- Landmarks: one `<main>`, `<nav>` elements carry `aria-label` when there is more than one
- `MainLayout` already supplies the skip link and `<main>` landmark. Do not duplicate them
- Prefer `@angular/aria` primitives (stable in v22) or spartan `brain` directives over hand-rolled ARIA

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Prefer inline templates for components under roughly 20 lines of markup; use an external `<name>.html` beyond that
- Prefer Reactive Forms or Signal Forms (stable in v22) over template-driven forms
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead
- Prefer `resource()` / `httpResource()` for async reads over manual subscribe-and-assign

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Always provide `track` on `@for`
- Use the async pipe to handle observables
- Do not assume globals like `new Date()` are available

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
- HTTP goes through `HttpClient` (provided with `withFetch()`), with the base URL from `@env/environment`

## Testing

- A spec that only asserts `expect(component).toBeTruthy()` is not a test. Assert rendered
  output, ARIA attributes, emitted outputs, or computed signal values
- Components that use the router need `provideRouter([])` in the TestBed providers
- Run `pnpm verify` before considering work done

## spartan/ui Usage (Modern + Controlled)

- Use **spartan/ui as a UI layer**, not as a logic layer
- `@spartan-ng/brain` provides headless behaviour and accessibility. The styled "helm"
  layer is vendored into `src/app/shared/ui/` and is **our code**: edit it in place rather
  than fighting it with override CSS
- Add components with `pnpm ng g @spartan-ng/cli:ui`, import them from `@ui/<name>`
- Consult the `spartan` MCP server for component APIs instead of guessing
- Avoid tight coupling between business logic and any UI library's APIs
