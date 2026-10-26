import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

export type IntegrationKeyView = { key: string };

/**
 * The organization's one integration key: what a website sends to read published posts and
 * submit leads. The Developers page shows it and Settings rotates it, so it is in core.
 */
@Injectable({ providedIn: 'root' })
export class IntegrationKey {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/integration-key`;

  /** Call from a component field, so each screen reads the key as it is now. */
  current() {
    return httpResource<IntegrationKeyView>(() => this.url);
  }

  /** The old key stops working on the API as soon as this resolves. */
  rotate(): Promise<IntegrationKeyView> {
    return firstValueFrom(this.http.post<IntegrationKeyView>(`${this.url}/rotate`, {}));
  }
}
