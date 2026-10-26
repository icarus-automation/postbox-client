import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import type { ApiKeySummary, CreatedApiKey } from '../api-keys/api-keys.types';

/**
 * The organization's admin API keys: the server-only keys agents and scripts use to file
 * drafts and read leads. A website uses the integration key instead.
 */
@Injectable({ providedIn: 'root' })
export class ApiKeys {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api-keys`;

  /** Newest first. Call from a component field, so each screen reads a fresh list. */
  all() {
    return httpResource<ApiKeySummary[]>(() => this.url);
  }

  /** Resolves with the raw key, which the API will not show again. */
  create(name: string): Promise<CreatedApiKey> {
    return firstValueFrom(this.http.post<CreatedApiKey>(this.url, { name }));
  }

  /** Disables the key. It stays in the list as revoked. */
  revoke(id: string): Promise<ApiKeySummary> {
    return firstValueFrom(this.http.delete<ApiKeySummary>(`${this.url}/${encodeURIComponent(id)}`));
  }
}
