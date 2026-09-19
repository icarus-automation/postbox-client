# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, etc.) working in this repository.

## Product overview

- **What this app is:** the human-facing client for the cms-api lead pipeline. Machines
  write leads into the API with an API key. This app is where a person reads and works them.
- **Who uses it:** the owner of a single organization, signed in with email and password.
  One user, one organization, nothing to pick and no organization to switch between.
- **What it does for them:** turns a stream of agent-written leads into something
  scannable. The organization's lead fields decide what a lead holds. Every organization
  starts with system fields for the candidate, product, source, signal, why the lead is
  worth a message, the status and when the lead arrived. The owner can add custom fields
  after those.
- **The loop it serves:** open the source from the list, open the lead, read what they
  said, fill in or correct values, then set the status, and archive what is done with.
  Agents file every lead as `new`. Only a person moves it to contacted or qualified, and
  only a person archives it. The API refuses status, archive and value changes from an API
  key.
- **Primary screens:** sign in, sign up, the leads inbox (filterable, paged list), lead
  detail (values, value edits, status and archive), Settings (the way into everything
  below it), and Lead fields (the field list and the Add field dialog).
- **Not built yet:** no lead creation in the UI (machines do that over the API), no API
  key management screen, no Organization screen (Settings shows it as Soon), and no Google
  sign-in. Lead fields can only be listed and added here. Renaming, reordering, deleting and changing select options happen over the API.
  Status options are fixed by the API, so there is no status editor, and archiving is a
  flag on the lead rather than one of them. The Google button
  stays disabled and says "Soon" until the API has a Google provider.

The API contract this client is written against is in two docs.
[docs/fe-phase1-api.md](docs/fe-phase1-api.md) covers sign in, sessions and API keys.
[docs/fe-lead-fields-api.md](docs/fe-lead-fields-api.md) covers leads, their values and the
field definitions behind them. Both are copies of the docs in cms-api. Read them before
changing anything that talks to the server, and treat them as the source of truth over
guesswork.

## Project

Angular SPA client for the cms-api lead pipeline. Data-heavy, read-focused, dense screens.

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

Built so far: sign in, sign up, the leads inbox, lead detail with value edits and status
changes, and the Lead fields settings screen. The inbox and detail take their columns,
labels, order and value formats from the field definitions. The inbox opens on a short set
of columns and lets a person pick the rest. The `welcome` smoke screen that shipped with
the template is gone.

```
src/app/
  core/
    api/           # apiErrorMessage, credentials + 401 interceptors
    auth/          # Auth service (session signal), auth.types, authGuard/guestGuard
    lead-fields/   # LeadFields service and field definition types, used by leads and settings
  layout/          # main-layout, header (account, sign out, phone link to Lead fields), sidebar
  modules/
    auth/          # auth-shell (centered card), login, sign-up. Rendered outside MainLayout
    leads/         # list, detail, value display, status badge and picker, leads service
    settings/      # the Settings index, and Lead fields: the field list and the add field dialog
  shared/ui/       # vendored spartan helm components
```

Things worth knowing before changing them:

- **The session is an HTTP-only cookie on the API origin.** `credentialsInterceptor` sets
  `withCredentials` on every call to `apiBaseUrl`. Drop it and every authenticated request
  starts failing with a 401.
- **`GET /auth/get-session` answers 200 with a literal `null` body when signed out**, not
  401. `Auth.restore()` handles that, caches the answer for the app's lifetime, and shares
  one request between guards that run together.
- **Errors arrive in two shapes**: the Nest envelope (where `message` is a string or an
  array of validation strings) and Better Auth's own (`{ message, code }`). Use
  `apiErrorMessage()` rather than reading `error.error.message` by hand.
- **Reading `value()` on a resource in an error state throws.** Go through `hasValue()`,
  the way `LeadList.rows` and `LeadDetail.value` do.
- **List state lives in the query string.** `page`, `status` and `archived` arrive as signal inputs
  through `withComponentInputBinding()`, so filters and paging are linkable and survive a
  refresh. Both are validated, because anyone can type nonsense into the URL. Links from
  the list into a lead, and back, use `queryParamsHandling="preserve"`, so a person returns
  to the tab they came from.
- **Leads have no fixed columns.** A lead is `{ id, values, createdAt, updatedAt }`, and
  `values` is keyed by field key. Format values by field type in `LeadFieldValue`, never by
  key. The client names one key, `status`, a system field that cannot be deleted, because
  the API gives it its own route and its own filter. A lead is named after the first text
  field, which is the system `candidate` field unless another text field moves ahead of it.
- **The lead page reads as what they said, then the facts, and it has no boxes.** Every
  passage is a `field-label` heading over its text, told apart by that label and the
  space around it, and they read in field order with nothing singled out. A long text
  value is only a section when it is a passage: under `NARRATIVE_MIN_LENGTH`, and with
  no line break, it is a row in Details instead, so a one-word custom field never gets a
  heading to itself. Do not put a card back around any of it.
- **Two lines on the page, and no more.** A hairline between passages was noise once
  there were only a couple of them, so the record carries the vertical rule that splits
  it from the facts rail, and the quiet one over Updated and the lead id. Do not put a
  rule back between the sections, and do not add another anywhere else.
- **The lead header is who, then where the lead stands, then what to do about it.** The
  name and the status badge sit together on the left, and Open source, Edit and Archive on
  the right. Open source is the loud one, because it is the thing to do from this page.
  The control that moves the status is not up there: it is a labelled field at the top of
  the details rail, with the rest of the record. It is a select, never a segmented bar,
  because the inbox filters many leads with tabs and an edit to one lead must not wear
  that chrome. Archive is an action beside it, never one of the stages.
- **Nothing empty is on the lead page.** Details lists only values the lead holds, and one
  line says how many are still empty. Filling them in is the edit form's job, and the form
  still shows every writable field. Last updated and the lead id are one muted line under
  the record, not a card competing with it.
- **`field-label` is the one label treatment.** The section headings, the Details terms and
  the status picker's label all use it, so a record reads as one set of labels. It lives in
  `styles.css` next to the page widths.
- **The link out is named after its field, not its host.** "Open source" stays true when
  the same lead points at another site; the host goes in the button's screen reader text.
- **The inbox opens on the short fields, not on every field.** `defaultColumnKeys` takes
  the types that fit a cell (`text`, `select`, `number`, `date`, `datetime`) in position
  order, up to `DEFAULT_COLUMN_LIMIT`, and always keeps the name column, because that is
  the one that links into the lead. Long text and links stay on the lead page until someone
  ticks them in the Columns menu, so the default table never has to scroll sideways.
- **The Columns menu is a popover, aligned to the end of the tab row.** It sits on the
  toolbar row opposite the tabs, not floating over the page header, and `align="end"` keeps
  the panel opening inward instead of off the right edge. It closes on an outside click and
  on Escape, which a native disclosure cannot do, so it earns the overlay. A spec opens the
  menu first and then looks for it in the document, not in the fixture element.
- **The column pick lives in this browser.** `LeadColumns` keeps it in `localStorage` under
  `leadColumns`, because it is a view preference and the API has nowhere to keep it. `null`
  means nobody has picked, so the table follows the default set and a field added later
  lands in it. Storage throws in a browser that blocks it, so every read and write is
  wrapped and the pick still holds for the visit. A spec that touches columns clears
  storage first, because the pick outlives a test.
- **A link cell is named after the site it opens.** `linkHost` turns the value into
  `facebook.com`, so a person sees where a link goes rather than a chip that says "Open".
  Detail spells the whole URL out, and its header button reads "Open facebook.com".
- **Each screen reads the field definitions itself.** `LeadFields.all()` returns a new
  resource per call, the way `Leads.page()` does. Nothing caches definitions for the whole
  app, so signing in to another organization never shows the last one's fields, and a
  change made over the API shows on the next navigation.
- **The Add field key follows the label.** Typing a label fills the key until the person
  types their own. Clearing the key hands it straight back to the label rather than leaving
  a required box empty, so the key is never blank while a label is set. The key box sits in
  a section headed Advanced at the foot of the form, always visible, so an error on it is
  never hidden behind something to open.
- **Add field is a dialog, and the form inside it knows nothing about dialogs.**
  `AddLeadField` emits `added` and `dismissed`, and the settings page closes the dialog and
  says what happened in its own `role="status"` line, which outlives the dialog.
  `hlmDialogTitle` injects `BrnDialogRef`, so the form uses a plain heading with an id and
  `<hlm-dialog aria-labelledby>` points at it: the form still renders, and tests still mount
  it, outside a dialog. Dialog content is portaled into an overlay, so a spec looks for it
  in the document rather than in the fixture element.
- **Built-in, not system, on screen.** `isSystem` shows as a "Built-in" badge and
  `isReadOnly` as an "Automatic" badge, both beside the label, rather than as
  API talk in the Required column.
- **Settings is an index, and it sits at the foot of the sidebar.** `/settings` is a page
  of sections, not a redirect: General holds Organization and Leads holds Lead fields. The
  sidebar nav fills the column and a second nav, labelled Settings, is pinned under a rule
  at the bottom, away from the work. On a phone the header's icon link goes there too.
- **A screen that does not exist yet still gets a card.** It is dashed, quiet, marked Soon
  and has no link, so the shape of the product is on screen rather than only in a plan.
  Every card is one shape: the title's link stretches its `::after` over the card, the way
  a lead name does over its table cell.
- **Nothing on Lead fields collapses or toggles.** Keys are a plain column in the table,
  always on screen. Advanced is a heading over the Key box in the Add field dialog, not a
  disclosure, and there is no switch that shows or hides columns.
- **The Type column carries the type name and nothing else.** A select's options used to
  hang under it, which made those rows twice the height of the others. Options belong with
  the field, in the Add field dialog, not in the list.
- **A status filter in the URL waits for the definitions.** `LeadList` checks `?status=`
  against the status field's options before it asks for leads. With no filter, both
  requests go out together.
- **Archiving is not a stage.** `Lead.isArchived` is its own flag beside `values`, moved by
  `PATCH /leads/:id/archive`, and it never touches `status`, so a restored lead comes back
  at the stage it left on. The status picker holds stages only. `GET /leads` reads the
  inbox by default and the archive with `archived=true`, never both, which is why Archived
  is its own tab after a rule at the end of the row and drops `?status=` when picked.
- **Archive asks first, restore does not.** Archiving takes a lead off the board, so it is
  a destructive-looking action behind an `hlm-dialog` confirm. Restoring undoes nothing, so
  it is one click from the strip at the top of an archived lead.
- **A confirmation is a toast, a failure is an alert.** "Status saved" and "Changes saved"
  go to the one `hlm-toaster` in `App`, through `toast` from `@spartan-ng/brain/sonner`, so
  no page keeps a line that says a save landed. Anything that failed stays on the page in
  an alert beside the control, because it needs reading and retrying. `toastState` is
  global, so a spec reads `toastState.toasts()` and clears it with `toastState.dismiss()`
  before each test.
- **Removing a select option retires it.** Leads that hold a retired option keep it. The
  list and detail show it with "(retired)", and the editor shows it as a selected but
  disabled option, so nobody can pick it again. `PATCH /leads/:id` sends only the keys that
  changed, because the API refuses a retired option even when the lead already holds it.
- **Status saves the moment someone picks it.** `LeadDetail.changeStatus` shows the pick at
  once, saves one request at a time, and sends a later pick after the save in flight
  lands, so the API always ends on the last pick. A failed save puts back the status the
  API last confirmed.
- **A value save, a status save and an archive save can overlap.** Each one applies only
  its own part of the lead it gets back: a status response sets `status`, an archive
  response sets `isArchived`, and a value response keeps both of those as they are on
  screen. Keep that split if you change any of the three.
- **Helm directives rewrite their host's class list.** `classes()` in `@ui/utils` sets
  `className` on the host element, which can drop classes an Angular `[class]` binding put
  on the same element. Put dynamic classes on a child, the way `LeadList` does for its
  table cells.
- **Sign in and sign up sit outside `MainLayout` on purpose.** A signed-out visitor has no
  nav to show, so `AuthShell` supplies the `<main>` landmark and the centered card. Their
  routes mount at `''` after the `MainLayout` route, so app URLs never load the auth chunk.
- **Two page widths, picked on the page's host.** `page-wide` fills the main column (the
  leads table). `page-standard` caps a single record at `max-w-4xl` (lead detail). Both
  start at the same left edge, and `shell-gutter` gives the header and main column one
  side gutter. Do not add a third width or a centered column inside a page.
- **Forms are built out of the field helm.** Wrap a label, a control, its help text and
  its error in `hlmField`. The field fills in the label's `for` from the control, composes
  `aria-describedby` from every `hlmFieldDescription` and `hlm-field-error` inside it, and
  holds the error back until the control is invalid and touched. Do not hand-write ids,
  `aria-describedby` or "show the error yet?" helpers. `hlm-field-error` is always in the
  DOM and carries `hidden` while there is nothing to say, so a spec checks the `hidden`
  attribute rather than the element's presence.
- **The field helm is edited and trimmed.** Upstream paints the whole field with
  `destructive` when it is invalid, which tints the value the person typed in a fill token
  that fails contrast as text. That cue moved to `hlm-field-label` in
  `text-destructive-ink`, and the error line uses the ink token too. Only the four parts
  this app uses are vendored: regenerate the component to get the fieldset, legend, group,
  content, title and separator back, then re-apply both edits.
- **Do not use `maxLength` from Signal Forms on a text box.** It sets the native
  `maxlength`, which cuts a pasted value without saying so. Check the length in a
  `validate` rule and return `maxLengthError(...)`, the way `AddLeadField` does, so the
  person is told why the value was refused.
- **Selects are the spartan select, not the browser's.** `@ui/select` gives a styled
  trigger and a portaled listbox, which the native control could never be. `hlm-select`
  binds through `ControlValueAccessor`, so it takes `formControlName` and Signal Forms
  `[formField]` alike, and `hlm-select-trigger [buttonId]` is what `hlmFieldLabel`, and the
  status picker's own `field-label`, point `for` at. Where the lead holds a retired option, `[itemToString]` makes the closed control
  read "Gold (retired)" instead of the bare value. The vendored native select is gone; do
  not bring it back.
- **A select says the name, not the key.** `BrnSelectValue` prints the raw value unless
  `itemToString` says otherwise, which showed `long_text` in the Add field Type box. Bind
  it wherever the stored value is not what a person should read.
- **Option lists are portaled, so specs look in the document.** Open the select, then read
  `[data-slot="select-item"]` from `document`, the way the lead detail and Add field specs
  do. A disabled option carries `aria-disabled`.
- **jsdom has no `ResizeObserver` and no `scrollIntoView`.** The select needs both, so
  `src/test-setup.ts` stubs them and `angular.json` loads it through `setupFiles`. Without
  it every select test throws on open.
- **Sign in, sign up and Add field use Signal Forms.** A writable signal holds the model,
  `form()` holds the rules, and `submission.action` owns the request. The form marks every
  field touched, refuses a second submit while one is in flight, and only runs the action
  when it is valid, so none of that lives in the component. A field-specific failure comes
  back from the action as a submission error, which clears itself when the value changes.
  `LeadDetail` stays on Reactive Forms: its controls are built from the field definitions
  at runtime.
- **Restart `pnpm start` after the spartan CLI adds a component.** The CLI adds a
  `@ui/<name>` path alias to `tsconfig.json`. A dev server that was already running served
  components importing the new aliases uncompiled, and they failed with a JIT compiler
  error in the browser. `pnpm build` and `pnpm test` were fine.

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
- Signal Forms for fixed forms, Reactive Forms where controls are built at runtime;
  `inject()` over constructor injection
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

Shared spec data is in `core/lead-fields/lead-fields.testing.ts` (the system fields as the
API returns them, plus one custom field of each writable type) and
`modules/leads/leads.testing.ts` (a lead with a value for each of those fields).

Wait for the thing the test set off, never for a timer. `await fixture.whenStable()` after
the last response when the assertion reads the rendered view, `await vi.waitFor(() => ...)`
when one answered request sets off the next one or when a promise inside a component has to
land first, and the promise itself when a service method returns one. Do not add a sleep
helper: a test that passes after a blind wait proves nothing.

## Environment config

`src/environments/environment.ts` (dev) / `environment.prod.ts` (prod), swapped via `fileReplacements` in `angular.json`. HTTP is provided in `app.config.ts` via `provideHttpClient(withFetch())`.
