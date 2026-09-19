import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject, type Signal } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import type { Lead, LeadPage, LeadValue } from '../leads.types';

/** Rows per page. The API caps `limit` at 50. */
export const LEADS_PAGE_SIZE = 20;

export interface LeadQuery {
  page: number;
  /** One of the status field's options, or null for every lead in the list. */
  status: string | null;
  /** Which list to read: the inbox, or the archive. Never both. */
  archived: boolean;
}

@Injectable({ providedIn: 'root' })
export class Leads {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/leads`;

  /**
   * A page of leads that refetches whenever `query` changes, and waits while it is
   * undefined. Call from a component field so the resource picks up that component's
   * injector and lifetime.
   */
  page(query: Signal<LeadQuery | undefined>) {
    return httpResource<LeadPage>(() => {
      const current = query();
      if (!current) {
        return undefined;
      }

      const { page, status, archived } = current;

      return {
        url: this.base,
        params: {
          page,
          limit: LEADS_PAGE_SIZE,
          archived,
          ...(status ? { status } : {}),
        },
      };
    });
  }

  /** One lead, refetching whenever the route id changes. */
  byId(id: Signal<string>) {
    return httpResource<Lead>(() => `${this.base}/${encodeURIComponent(id())}`);
  }

  /** Moves a lead to another status and resolves with the lead as the API saved it. */
  setStatus(id: string, status: string): Promise<Lead> {
    return firstValueFrom(
      this.http.patch<Lead>(`${this.base}/${encodeURIComponent(id)}/status`, { status }),
    );
  }

  /**
   * Takes a lead out of the inbox, or puts it back. It never touches the status, so a
   * restored lead comes back at the stage it left on.
   */
  setArchived(id: string, isArchived: boolean): Promise<Lead> {
    return firstValueFrom(
      this.http.patch<Lead>(`${this.base}/${encodeURIComponent(id)}/archive`, { isArchived }),
    );
  }

  /**
   * Changes the given values and leaves the rest alone. `null` clears one. Send only the
   * keys that changed, because the API refuses a retired select option even when the lead
   * already holds it.
   */
  updateValues(id: string, values: Record<string, LeadValue>): Promise<Lead> {
    return firstValueFrom(
      this.http.patch<Lead>(`${this.base}/${encodeURIComponent(id)}`, { values }),
    );
  }
}
