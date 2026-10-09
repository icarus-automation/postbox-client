import { Injectable } from '@angular/core';
import { createAuthClient } from 'better-auth/client';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class GoogleSignIn {
  // Made with the service rather than on import, because the client keeps the `fetch` it
  // finds when it is created. A base URL that already contains /api/v1 is returned
  // unchanged, and basePath is then ignored.
  private readonly client = createAuthClient({
    baseURL: new URL(environment.apiBaseUrl).origin,
    basePath: '/api/v1/auth',
    fetchOptions: { credentials: 'include' },
  });

  async continueWithGoogle(): Promise<void> {
    // Absolute URLs on this origin, so Google sends people back to the client, not the API.
    const result = await this.client.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/`,
      errorCallbackURL: `${window.location.origin}/login`,
    });

    if (result.error) {
      throw new Error(result.error.message || 'Could not continue with Google.');
    }
  }
}
