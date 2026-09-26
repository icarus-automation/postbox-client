import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import type { Term, TermKind } from './blog-terms.types';

const PATHS: Record<TermKind, string> = { category: 'categories', tag: 'tags' };

/**
 * The organization's categories and tags. The post editor picks from them and adds to them,
 * and Settings renames and deletes them. Two features use this service, so it is in core.
 */
@Injectable({ providedIn: 'root' })
export class BlogTerms {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/blog`;

  /**
   * Every category or every tag, by name, with its post count. Call from a component field,
   * so each screen reads a fresh list.
   */
  all(kind: () => TermKind) {
    return httpResource<Term[]>(() => this.url(kind()));
  }

  /** Adds one. A name that is already there, in any case, comes back as the one it names. */
  create(kind: TermKind, name: string): Promise<Term> {
    return firstValueFrom(this.http.post<Term>(this.url(kind), { name }));
  }

  /** The slug is made from the new name. */
  rename(kind: TermKind, id: string, name: string): Promise<Term> {
    return firstValueFrom(
      this.http.patch<Term>(`${this.url(kind)}/${encodeURIComponent(id)}`, { name }),
    );
  }

  /** Posts that used it stay, without it. */
  delete(kind: TermKind, id: string): Promise<Term> {
    return firstValueFrom(this.http.delete<Term>(`${this.url(kind)}/${encodeURIComponent(id)}`));
  }

  private url(kind: TermKind): string {
    return `${this.base}/${PATHS[kind]}`;
  }
}
