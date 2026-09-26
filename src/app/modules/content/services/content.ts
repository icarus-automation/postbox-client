import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject, type Signal } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import type {
  ContentPage,
  ContentQuery,
  CreateContentBody,
  EditorEntry,
  SaveContentBody,
} from '../content.types';

/** Rows per page. The API caps `limit` at 50. */
export const CONTENT_PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class Content {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/content`;

  /**
   * A page of content that refetches whenever `query` changes. Call from a component
   * field so the resource picks up that component's injector and lifetime.
   */
  page(query: Signal<ContentQuery>) {
    return httpResource<ContentPage>(() => {
      const current = query();
      return {
        url: this.base,
        params: {
          page: current.page,
          limit: CONTENT_PAGE_SIZE,
          ...(current.kind ? { kind: current.kind } : {}),
          ...(current.status ? { status: current.status } : {}),
        },
      };
    });
  }

  /** One entry, refetching whenever the route id changes. */
  byId(id: Signal<string>) {
    return httpResource<EditorEntry>(() => {
      const current = id();
      if (!current) {
        return undefined;
      }
      return `${this.base}/${encodeURIComponent(current)}`;
    });
  }

  create(body: CreateContentBody): Promise<EditorEntry> {
    return firstValueFrom(this.http.post<EditorEntry>(this.base, body));
  }

  save(id: string, body: SaveContentBody): Promise<EditorEntry> {
    return firstValueFrom(this.http.put<EditorEntry>(`${this.base}/${encodeURIComponent(id)}`, body));
  }

  publish(id: string): Promise<EditorEntry> {
    return firstValueFrom(
      this.http.post<EditorEntry>(`${this.base}/${encodeURIComponent(id)}/publish`, {}),
    );
  }

  unpublish(id: string): Promise<EditorEntry> {
    return firstValueFrom(
      this.http.post<EditorEntry>(`${this.base}/${encodeURIComponent(id)}/unpublish`, {}),
    );
  }
}
