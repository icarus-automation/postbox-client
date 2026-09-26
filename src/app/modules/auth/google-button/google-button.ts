import { Component, inject, signal } from '@angular/core';
import { shownError } from '@core/api/api-error';
import { GoogleSignIn } from '@core/auth/google-sign-in';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmButton } from '@ui/button';

@Component({
  selector: 'app-google-button',
  imports: [HlmAlert, HlmAlertDescription, HlmAlertTitle, HlmButton],
  template: `
    @if (error(); as message) {
      <div hlmAlert variant="destructive" class="mb-4">
        <p hlmAlertTitle>Google sign-in failed</p>
        <p hlmAlertDescription>{{ message }}</p>
      </div>
    }

    <button hlmBtn variant="outline" type="button" class="w-full" (click)="start()">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" class="size-4" aria-hidden="true">
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l6.3 5.3C37.4 38.3 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"
        />
      </svg>
      Continue with Google
    </button>
  `,
})
export class GoogleButton {
  private readonly google = inject(GoogleSignIn);
  protected readonly error = signal<string | null>(null);

  protected async start(): Promise<void> {
    this.error.set(null);
    try {
      await this.google.continueWithGoogle();
    } catch (error) {
      this.error.set(shownError(error, 'Could not continue with Google.'));
    }
  }
}
