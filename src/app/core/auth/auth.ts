import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import type { SessionResponse } from './auth.types';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/auth`;

  private readonly _session = signal<SessionResponse | null>(null);

  /** True once we have actually asked the API, so guards stop re-asking. */
  private resolved = false;

  /** The in-flight read, shared so parallel guard runs make one request. */
  private inFlight: Promise<SessionResponse | null> | null = null;

  readonly session = this._session.asReadonly();
  readonly user = computed(() => this._session()?.user ?? null);
  readonly isSignedIn = computed(() => this._session() !== null);

  /**
   * Reads the session cookie once per app load. Guards await this before they
   * decide, so a hard refresh on a deep link resolves instead of bouncing to login.
   * A read that fails counts as signed out but is not cached, so the next
   * navigation tries again.
   */
  async restore(): Promise<SessionResponse | null> {
    if (this.resolved) {
      return this._session();
    }

    this.inFlight ??= this.read()
      .catch(() => null)
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  async signIn(email: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.base}/sign-in/email`, { email, password }));
    // Sign-in answers with the user but not the active organization, so read the
    // canonical session back before anything routes on it.
    await this.read();
  }

  /**
   * Creates the account and signs it in. The API provisions the new organization
   * after the account row commits, so read the session back rather than trusting the
   * sign-up response to carry it.
   */
  async signUp(name: string, email: string, password: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.base}/sign-up/email`, { name, email, password }));
    await this.read();
  }

  async signOut(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.base}/sign-out`, {}));
    } finally {
      this._session.set(null);
      this.resolved = true;
    }
  }

  /**
   * Drops the cached session without calling the API. Used when the API rejects a
   * request the cookie was supposed to cover, so the next guard sends us to login.
   */
  forget(): void {
    this._session.set(null);
    this.resolved = true;
  }

  private async read(): Promise<SessionResponse | null> {
    const session = await firstValueFrom(
      this.http.get<SessionResponse | null>(`${this.base}/get-session`),
    );

    this._session.set(session);
    this.resolved = true;
    return session;
  }
}
