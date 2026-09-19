import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import type { LeadField, NewLeadField } from './lead-fields.types';

/**
 * The field definitions behind every lead. The leads screens build their columns from them
 * and the settings screen adds to them. Two features use this service, so it is in core.
 */
@Injectable({ providedIn: 'root' })
export class LeadFields {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/leads/fields`;

  /**
   * Every field in position order. Call from a component field, so each screen reads fresh
   * definitions and a later sign in to another organization never sees these.
   */
  all() {
    return httpResource<LeadField[]>(() => this.url);
  }

  /** Adds a custom field after the last one and resolves with the field as the API saved it. */
  create(field: NewLeadField): Promise<LeadField> {
    return firstValueFrom(this.http.post<LeadField>(this.url, field));
  }
}
