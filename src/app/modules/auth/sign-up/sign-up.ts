import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  FormField,
  FormRoot,
  type TreeValidationResult,
  email,
  form,
  maxLengthError,
  minLength,
  required,
  requiredError,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '@core/api/api-error';
import { Auth } from '@core/auth/auth';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmButton } from '@ui/button';
import { HlmField, HlmFieldDescription, HlmFieldError, HlmFieldLabel } from '@ui/field';
import { HlmInput } from '@ui/input';
import { HlmSpinner } from '@ui/spinner';
import { AuthShell } from '../auth-shell/auth-shell';
import { GoogleButton } from '../google-button/google-button';

/** Better Auth's default limits. The API refuses a password outside them. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const EMAIL_TAKEN = 'This email already has an account. Sign in instead.';
const EMAIL_INVALID = 'Enter a valid email address.';
const PASSWORD_TOO_SHORT = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
const PASSWORD_TOO_LONG = `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`;

@Component({
  selector: 'app-sign-up',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmButton,
    HlmField,
    HlmFieldDescription,
    HlmFieldError,
    HlmFieldLabel,
    HlmInput,
    HlmSpinner,
    AuthShell,
    GoogleButton,
  ],
  templateUrl: './sign-up.html',
})
export class SignUp {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;

  protected readonly error = signal<string | null>(null);

  private readonly details = signal({ name: '', email: '', password: '' });

  /**
   * Submitting runs through the form: it marks every field touched, refuses a second
   * submit while one is in flight, and only calls the action once the form is valid.
   */
  protected readonly form = form(
    this.details,
    (path) => {
      required(path.name, { message: 'Enter your name.' });
      validate(path.name, ({ value }) =>
        value().trim() === '' ? requiredError({ message: 'Enter your name.' }) : undefined,
      );

      required(path.email, { message: 'Enter your email.' });
      email(path.email, { message: EMAIL_INVALID });

      required(path.password, { message: PASSWORD_TOO_SHORT });
      minLength(path.password, PASSWORD_MIN_LENGTH, { message: PASSWORD_TOO_SHORT });
      // Checked rather than capped with `maxLength`, because the native attribute it sets
      // would cut a pasted password without saying so.
      validate(path.password, ({ value }) =>
        value().length > PASSWORD_MAX_LENGTH
          ? maxLengthError(PASSWORD_MAX_LENGTH, { message: PASSWORD_TOO_LONG })
          : undefined,
      );
    },
    { submission: { action: () => this.signUp() } },
  );

  /** The rule steps aside once the error below says the same thing in red. */
  protected readonly showPasswordRule = computed(() => {
    const password = this.form.password();
    return !password.touched() || !password.invalid();
  });

  private async signUp(): Promise<TreeValidationResult> {
    this.error.set(null);

    const details = this.details();

    try {
      await this.auth.signUp(details.name.trim(), details.email, details.password);
    } catch (error) {
      const refusal = fieldRefusal(error);
      if (refusal) {
        return [{ fieldTree: this.form[refusal.field], kind: refusal.kind, message: refusal.message }];
      }

      this.error.set(apiErrorMessage(error, 'Could not create your account. Try again.'));
      return undefined;
    }

    // A new account has no organization, so it goes to onboarding. The account exists
    // and is signed in by now, so a failure here is the next screen failing to load. It
    // must not read as a refused sign-up.
    try {
      await this.router.navigateByUrl('/create-organization');
    } catch (error) {
      console.error('Signed up, but navigation failed', error);
      this.error.set('Your account is ready, but the next page did not load. Reload and try again.');
    }
    return undefined;
  }
}

/**
 * Better Auth's sign-up refusals that belong to one field. Its own wording ("User already
 * exists. Use another email.", "Password too short") does not say what to do next.
 */
function fieldRefusal(
  error: unknown,
): { field: 'email' | 'password'; kind: string; message: string } | null {
  if (!(error instanceof HttpErrorResponse)) return null;

  const body = error.error as { code?: unknown; message?: unknown } | null;
  switch (body?.code) {
    case 'USER_ALREADY_EXISTS':
    case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
      return { field: 'email', kind: 'taken', message: EMAIL_TAKEN };
    case 'INVALID_EMAIL':
      return { field: 'email', kind: 'email', message: EMAIL_INVALID };
    case 'PASSWORD_TOO_SHORT':
      return { field: 'password', kind: 'tooShort', message: PASSWORD_TOO_SHORT };
    case 'PASSWORD_TOO_LONG':
      return { field: 'password', kind: 'tooLong', message: PASSWORD_TOO_LONG };
    case 'VALIDATION_ERROR':
      // The API's email check is stricter than the browser's, so an address such as
      // name@localhost passes here and fails there as `[body.email] ...`.
      return typeof body.message === 'string' && body.message.includes('[body.email]')
        ? { field: 'email', kind: 'email', message: EMAIL_INVALID }
        : null;
    default:
      return null;
  }
}
