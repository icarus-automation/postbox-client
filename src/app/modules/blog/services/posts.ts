import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject, type Signal } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import type { EditorPost, PostPage, PostQuery, SavePostBody } from '../blog.types';

/** Rows per page. The API caps `limit` at 50. */
export const POST_PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class Posts {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/blog/posts`;

  /**
   * A page of posts that refetches whenever `query` changes. Call from a component field so
   * the resource picks up that component's injector and lifetime.
   */
  page(query: Signal<PostQuery>) {
    return httpResource<PostPage>(() => {
      const current = query();
      return {
        url: this.base,
        params: {
          page: current.page,
          limit: POST_PAGE_SIZE,
          ...(current.status ? { status: current.status } : {}),
          ...(current.category ? { category: current.category } : {}),
          ...(current.tag ? { tag: current.tag } : {}),
          ...(current.search ? { search: current.search } : {}),
        },
      };
    });
  }

  /** One post, refetching whenever the id changes. An empty id reads nothing. */
  byId(id: Signal<string>) {
    return httpResource<EditorPost>(() => {
      const current = id();
      if (!current) {
        return undefined;
      }
      return `${this.base}/${encodeURIComponent(current)}`;
    });
  }

  /** Saves a new draft. The API makes the slug unique, so it may come back numbered. */
  create(body: SavePostBody): Promise<EditorPost> {
    return firstValueFrom(this.http.post<EditorPost>(this.base, body));
  }

  save(id: string, body: SavePostBody): Promise<EditorPost> {
    return firstValueFrom(this.http.put<EditorPost>(`${this.base}/${encodeURIComponent(id)}`, body));
  }

  publish(id: string): Promise<EditorPost> {
    return firstValueFrom(
      this.http.post<EditorPost>(`${this.base}/${encodeURIComponent(id)}/publish`, {}),
    );
  }

  unpublish(id: string): Promise<EditorPost> {
    return firstValueFrom(
      this.http.post<EditorPost>(`${this.base}/${encodeURIComponent(id)}/unpublish`, {}),
    );
  }
}
