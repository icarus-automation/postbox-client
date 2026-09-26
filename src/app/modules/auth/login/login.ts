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
import { GoogleButton } from '../google-button/google-button';

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
    GoogleButton,
  ],
  templateUrl: './login.html',
})
export class Login {
  protected readonly auth = inject(Auth);
  private readonly router = inject(Router);

  /** Set by the auth guard when it turned someone away from a deep link. */
  readonly returnUrl = input<string | undefined>(undefined);

  protected readonly error = signal<string | null>(null);

  /** Better Auth sends OAuth failures back as `?error=`. The code is never shown. */
  readonly oauthError = input<string | undefined>(undefined, { alias: 'error' });

  protected readonly notice = computed(
    () => this.error() ?? oauthSignInMessage(this.oauthError()),
  );

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

    const admission = this.auth.admission();
    const next = admission.phase === 'onboarding' ? '/create-organization' : this.target();

    // The session is good at this point. A failure here is the app failing to load
    // the next screen (a stale tab after a redeploy, or the dev server going away),
    // so it must not read as bad credentials.
    try {
      await this.router.navigateByUrl(next);
    } catch (error) {
      console.error('Signed in, but navigation failed', error);
      this.error.set('You are signed in, but the next page did not load. Reload and try again.');
    }
  }
}

function oauthSignInMessage(code: string | undefined): string | null {
  if (!code) return null;

  const messages: Record<string, string> = {
    access_denied: 'Google sign-in was cancelled.',
    unable_to_link_account: 'Google could not be linked to this account.',
    account_already_linked_to_different_user:
      'That Google account is already linked to a different user.',
    email_does_not_match: 'The Google email does not match this account.',
    email_not_found: 'Google did not return an email address.',
  };

  return messages[code] ?? 'Google sign-in did not finish.';
}
