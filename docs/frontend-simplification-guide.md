# Frontend simplification guide

This guide covers four repository changes:

1. Migrate fixed forms to Angular Signal Forms.
2. Replace timer-based test settling.
3. Use one HTTP URL validator.
4. Remove redundant change detection metadata.

Keep each change behavior-preserving. Do not add dependencies. Do not include the Spartan field migration from the repository audit in this work.

## Working rules

- Use Angular 22 public APIs from the installed packages.
- Keep the app zoneless.
- Keep the existing API request bodies, endpoint URLs, messages, focus behavior, and navigation behavior.
- Keep the lead detail form on Reactive Forms during this work. Its dynamic fields, changed-only request body, retired options, and overlapping saves need a separate migration.
- Update tests with each change. Do not weaken assertions to make a migration pass.
- Run the relevant spec after each change. Run `pnpm verify` after all four changes.

## Migrate fixed forms to Signal Forms

### Scope

Migrate these forms:

- `src/app/modules/auth/login/login.ts`
- `src/app/modules/auth/login/login.html`
- `src/app/modules/auth/sign-up/sign-up.ts`
- `src/app/modules/auth/sign-up/sign-up.html`
- `src/app/modules/settings/add-lead-field/add-lead-field.ts`
- `src/app/modules/settings/add-lead-field/add-lead-field.html`

Update their existing specs. Do not migrate `LeadDetail` in this change.

### Use the Angular APIs

Import form APIs from `@angular/forms/signals`:

- `form`
- `FormField`
- `FormRoot`
- Built-in validators such as `required`, `email`, `minLength`, `maxLength`, and `pattern`
- `validate` for rules that need application logic

Use a writable signal as the form model. Bind the form with `[formRoot]` and each control with `[formField]`.

The form submission action must own the asynchronous request. Read submission state from `form().submitting()`. Angular prevents concurrent submission and marks fields touched before it calls the action. Remove code that duplicates those behaviors.

Reference: [Angular Signal Forms submission](https://angular.dev/guide/forms/signals/field-state-management#form-submission)

### Login

Preserve these behaviors:

- Email and password are required.
- Email uses Angular's email validator.
- Errors appear only after the field is touched or a submit attempt marks it touched.
- The form accepts only an internal `returnUrl`.
- A successful sign-in reads the canonical session before navigation.
- An authentication failure says "Sign in failed".
- A navigation failure says the person is signed in but the inbox could not load.
- The submit button stays disabled while the submission action runs.

Remove:

- The `FormBuilder` and `ReactiveFormsModule` imports.
- The local `submitting` signal.
- The duplicate-submission guard.
- `markAllAsTouched()` and the manual invalid-form return.
- The `invalid()` helper.

Use field state directly in the template:

```html
@if (form.email().touched() && form.email().invalid()) {
  <!-- Existing error copy -->
}
```

Keep the current `aria-describedby` behavior until the separate Spartan field migration replaces it.

### Sign-up

Preserve these behaviors:

- Name rejects whitespace-only values and is trimmed before submission.
- Email is required and valid.
- Password is at least `PASSWORD_MIN_LENGTH` characters.
- Existing help and error copy stays unchanged.
- A successful sign-up reads the canonical session and opens the inbox.
- Account creation errors and navigation errors remain distinct.

Remove the same Reactive Forms lifecycle code listed for login. Put validation messages in the Signal Forms schema so the template reads form errors instead of duplicating validator-to-message logic.

Use `validate` for the name rule. Angular's `required` validator does not replace the existing whitespace check.

### Add lead field

Preserve these behaviors:

- The label generates the key until the person edits the key.
- Clearing a manually edited key enables generation from the label again.
- Keys follow `FIELD_KEY_PATTERN`, `FIELD_KEY_MAX_LENGTH`, and the taken-key rule.
- Label and option limits stay unchanged.
- Options are required only for a select field.
- A successful request resets values and interaction state.
- A `409` response marks the key as taken.
- Other API failures remain form-level alerts.
- The `added` output emits the field returned by the API.

Use Signal Forms schema rules for label, key, and option validation. Keep `keyFromLabel()`, `parseOptions()`, and `optionsProblem()` as the domain functions. Do not replace them with a package.

Use `validate` for the whitespace-only label rule, the taken-key rule, and the conditional options rule. Read `takenKeys()` inside the key validator so a changed input triggers validation again. Read the selected type inside the options validator so non-select fields remain valid without options.

Return a field-specific submission error for a `409` response:

```ts
return [
  {
    fieldTree: submittedForm.key,
    kind: 'taken',
    message: 'Another field already uses this key.',
  },
];
```

Use `form().reset(EMPTY)` after a successful request. This must clear touched and dirty state as well as values.

Replace `valueChanges` subscriptions with signal-based synchronization. Keep an explicit `keyEdited` state so editing and clearing the key retain their current meaning. Test both paths.

### Signal Forms acceptance criteria

- No `FormBuilder`, `ReactiveFormsModule`, `[formGroup]`, or `formControlName` remains in the three migrated forms.
- No local `submitting` signal remains in those forms.
- Submit attempts reveal validation errors.
- Double submission sends one request.
- Existing error text, navigation, emitted values, and request bodies do not change.
- `LeadDetail` still uses its current `FormRecord` implementation.

## Replace timer-based test settling

### Scope

Remove the custom `settle()` helper based on `setTimeout(0)` from:

- `src/app/core/api/interceptors.spec.ts`
- `src/app/core/auth/auth.spec.ts`
- `src/app/modules/auth/login/login.spec.ts`
- `src/app/modules/auth/sign-up/sign-up.spec.ts`
- `src/app/modules/leads/lead-detail/lead-detail.spec.ts`
- `src/app/modules/leads/lead-list/lead-list.spec.ts`
- `src/app/modules/settings/add-lead-field/add-lead-field.spec.ts`
- `src/app/modules/settings/lead-field-list/lead-field-list.spec.ts`

Do not add another sleep helper with a different name.

### Pick the wait that owns the asynchronous work

Use `fixture.whenStable()` after the final HTTP response when the assertion depends on rendered component state.

```ts
request.flush(response);
await fixture.whenStable();
```

Use `vi.waitFor()` when one completed request schedules another request and the test needs to obtain that next request.

```ts
first.flush(response);
const second = await vi.waitFor(() => http.expectOne(SECOND_URL));
```

For a service method that returns a promise, keep and await that promise.

```ts
const result = auth.signIn(email, password);

http.expectOne(SIGN_IN_URL).flush(signInResponse);
const session = await vi.waitFor(() => http.expectOne(GET_SESSION_URL));
session.flush(sessionResponse);

await result;
```

For an interceptor observable, convert it to a promise with `firstValueFrom()` or assert through its subscription callback. Flush the request, then await the owned promise. Do not wait for an unrelated timer.

Use `fakeAsync()` and `flushMicrotasks()` only when the test must control microtask execution. Do not mix `fakeAsync()` with `async` or `await` in the same test.

Reference: [ComponentFixture.whenStable](https://angular.dev/api/core/testing/ComponentFixture#whenStable)

### Test settling acceptance criteria

- No test defines or calls the custom `settle()` helper.
- No `setTimeout(0)` remains as a synchronization mechanism.
- Each test waits for the promise, request, fixture, or microtask it caused.
- Tests still prove sequential status saving and overlapping value and status saves.
- Tests fail by timeout or a missing request when the expected asynchronous action never occurs. They must not pass after a blind sleep.

## Use one HTTP URL validator

### Scope

Update:

- `src/app/modules/leads/leads.types.ts`
- `src/app/modules/leads/leads.types.spec.ts`
- `src/app/modules/leads/lead-detail/lead-values-form.ts`
- `src/app/modules/leads/lead-detail/lead-values-form.spec.ts`

Keep `isHttpUrl()` as the shared predicate. Widen its input to `unknown` so form validation can use it directly.

### Implementation

Replace the prefix regular expression with the platform URL parser:

```ts
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const { protocol } = new URL(value.trim());
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
```

Remove the private `httpUrl` parsing implementation from `lead-values-form.ts`. Its Angular validator should call `isHttpUrl()` and keep blank values valid. Required-field validation owns blank-value errors.

Do not rely on `URL.canParse()` alone because it accepts protocols other than HTTP and HTTPS.

Add coverage for:

- Valid HTTP and HTTPS URLs.
- `https://` with no host.
- Invalid URL syntax.
- `javascript:` and `ftp:` URLs.
- Leading and trailing whitespace.
- Non-string values.
- Blank optional values in the form validator.

### URL acceptance criteria

- Rendering and form validation use the same predicate.
- Malformed URLs never render as links.
- Only HTTP and HTTPS protocols render as links.
- Existing valid source links still render and open as before.

Reference: [URL constructor](https://developer.mozilla.org/en-US/docs/Web/API/URL/URL)

## Remove redundant change detection metadata

### Scope

Update:

- `src/app/shared/ui/checkbox/src/lib/hlm-checkbox.ts`
- `src/app/shared/ui/native-select/src/lib/hlm-native-select.ts`
- `src/app/shared/ui/spinner/src/lib/hlm-spinner.ts`

Angular 22 uses OnPush by default. The repository rules prohibit explicit `changeDetection` metadata.

In each file:

1. Remove `ChangeDetectionStrategy` from the `@angular/core` import.
2. Remove `changeDetection: ChangeDetectionStrategy.OnPush` from the component metadata.
3. Leave all providers, host directives, inputs, outputs, classes, and templates unchanged.

Do not regenerate these components. The checkbox and native select contain local behavior that must remain.

### Metadata cleanup acceptance criteria

- No `ChangeDetectionStrategy` or `changeDetection` reference remains under `src/app/`.
- Checkbox form integration still works.
- Native select form integration and inner ARIA attributes still work.
- Spinner labels and rendering stay unchanged.

## Final verification

Run the focused specs while changing each area. Then run:

```bash
pnpm verify
```

Before finishing, search for these removed patterns:

```text
const settle
setTimeout(resolve, 0)
ChangeDetectionStrategy
changeDetection:
```

The final diff must contain no new dependency, compatibility alias, deprecated path, or disabled assertion.
