import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import type { Admission } from './auth.types';

const SIGNED_OUT: Admission = { phase: 'signed-out' };

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/auth`;

  private readonly _admission = signal<Admission>(SIGNED_OUT);

  /** True once we have actually asked the API, so guards stop re-asking. */
  private resolved = false;

  /** The in-flight read, shared so parallel guard runs make one request. */
  private inFlight: Promise<Admission> | null = null;

  readonly admission = this._admission.asReadonly();
  readonly user = computed(() => {
    const admission = this._admission();
    return admission.phase === 'signed-out' ? null : admission.user;
  });
  readonly workspace = computed(() => {
    const admission = this._admission();
    return admission.phase === 'admitted' ? admission.workspace : null;
  });
  readonly isSignedIn = computed(() => this._admission().phase !== 'signed-out');

  /**
   * Reads admission once per app load. Guards await this before they decide,
   * so a hard refresh on a deep link resolves instead of bouncing to login.
   * A read that fails counts as signed out but is not cached, so the next
   * navigation tries again.
   */
  async restore(): Promise<Admission> {
    if (this.resolved) return this._admission();

    this.inFlight ??= this.read()
      .catch(() => SIGNED_OUT)
      .finally(() => {
        this.inFlight = null;
      });

    return this.inFlight;
  }

  async signIn(email: string, password: string): Promise<Admission> {
    await firstValueFrom(this.http.post(`${this.base}/sign-in/email`, { email, password }));
    return this.read();
  }

  async signOut(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.base}/sign-out`, {}));
    } finally {
      this._admission.set(SIGNED_OUT);
      this.resolved = true;
    }
  }

  async setPassword(newPassword: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/account/password`, { newPassword }),
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        await this.read().catch(() => undefined);
      }
      throw error;
    }

    await this.read();
  }

  /**
   * Drops the cached admission without calling the API. Used when the API rejects a
   * request the cookie was supposed to cover, so the next guard sends us to login.
   */
  forget(): void {
    this._admission.set(SIGNED_OUT);
    this.resolved = true;
  }

  /** Reads admission again after a write that changes the phase or the workspace. */
  refresh(): Promise<Admission> {
    return this.read();
  }

  private async read(): Promise<Admission> {
    const admission = await firstValueFrom(
      this.http.get<Admission>(`${environment.apiBaseUrl}/workspaces/admission`),
    );

    this._admission.set(admission);
    this.resolved = true;
    return admission;
  }
}
