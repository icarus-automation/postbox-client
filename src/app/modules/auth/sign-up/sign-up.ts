import { Component, computed, inject, signal } from '@angular/core';
import {
  FormField,
  FormRoot,
  email,
  form,
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

/** Better Auth's default minimum. The API rejects anything shorter. */
export const PASSWORD_MIN_LENGTH = 8;

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
      required(path.name);
      // The API names the new organization after this, so whitespace alone will not do.
      validate(path.name, ({ value }) => (value().trim() === '' ? requiredError() : undefined));

      required(path.email);
      email(path.email);

      required(path.password);
      minLength(path.password, PASSWORD_MIN_LENGTH);
    },
    { submission: { action: () => this.signUp() } },
  );

  /** The rule steps aside once the error below says the same thing in red. */
  protected readonly showPasswordRule = computed(() => {
    const password = this.form.password();
    return !password.touched() || !password.invalid();
  });

  private async signUp(): Promise<void> {
    this.error.set(null);

    const details = this.details();

    try {
      await this.auth.signUp(details.name.trim(), details.email, details.password);
    } catch (error) {
      this.error.set(apiErrorMessage(error, 'Could not create your account. Try again.'));
      return;
    }

    // The account exists and is signed in by now, so a failure here is the next screen
    // failing to load. It must not read as a refused sign-up.
    try {
      await this.router.navigateByUrl('/leads');
    } catch (error) {
      console.error('Signed up, but navigation failed', error);
      this.error.set('Your account is ready, but the next page did not load. Reload and try again.');
    }
  }
}
