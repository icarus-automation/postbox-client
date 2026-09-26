import { Injectable } from '@angular/core';
import { createAuthClient } from 'better-auth/client';
import { environment } from '@env/environment';

// A base URL that already contains /api/v1 is returned unchanged, and basePath is then ignored.
const client = createAuthClient({
  baseURL: new URL(environment.apiBaseUrl).origin,
  basePath: '/api/v1/auth',
  fetchOptions: { credentials: 'include' },
});

@Injectable({ providedIn: 'root' })
export class GoogleSignIn {
  async continueWithGoogle(): Promise<void> {
    const result = await client.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/`,
      errorCallbackURL: `${window.location.origin}/login`,
    });

    if (result.error) {
      throw new Error(result.error.message || 'Could not continue with Google.');
    }
  }
}
