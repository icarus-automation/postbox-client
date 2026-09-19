import { Component, computed, inject, input, signal } from '@angular/core';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { apiErrorMessage } from '@core/api/api-error';
import { Auth } from '@core/auth/auth';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmButton } from '@ui/button';
import { HlmField, HlmFieldError, HlmFieldLabel } from '@ui/field';
import { HlmInput } from '@ui/input';
import { HlmSpinner } from '@ui/spinner';
import { AuthShell } from '../auth-shell/auth-shell';

@Component({
  selector: 'app-login',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmButton,
    HlmField,
    HlmFieldError,
    HlmFieldLabel,
    HlmInput,
    HlmSpinner,
    AuthShell,
  ],
  templateUrl: './login.html',
})
export class Login {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);

  /** Set by the auth guard when it turned someone away from a deep link. */
  readonly returnUrl = input<string | undefined>(undefined);

  protected readonly error = signal<string | null>(null);

  private readonly credentials = signal({ email: '', password: '' });

  /**
   * Submitting runs through the form: it marks every field touched, refuses a second
   * submit while one is in flight, and only calls the action once the form is valid.
   */
  protected readonly form = form(
    this.credentials,
    (path) => {
      required(path.email);
      email(path.email);
      required(path.password);
    },
    { submission: { action: () => this.signIn() } },
  );

  /**
   * Only ever follow one of our own paths. An absolute or protocol-relative URL
   * in the query string would otherwise make this an open redirect.
   */
  private readonly target = computed(() => {
    const url = this.returnUrl();
    return url?.startsWith('/') && !url.startsWith('//') ? url : '/leads';
  });

  private async signIn(): Promise<void> {
    this.error.set(null);

    const credentials = this.credentials();

    try {
      await this.auth.signIn(credentials.email, credentials.password);
    } catch (error) {
      this.error.set(apiErrorMessage(error, 'Could not sign in. Try again.'));
      return;
    }

    // The session is good at this point. A failure here is the app failing to load
    // the next screen (a stale tab after a redeploy, or the dev server going away),
    // so it must not read as bad credentials.
    try {
      await this.router.navigateByUrl(this.target());
    } catch (error) {
      console.error('Signed in, but navigation failed', error);
      this.error.set('You are signed in, but the next page did not load. Reload and try again.');
    }
  }
}
