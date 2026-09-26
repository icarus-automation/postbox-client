import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucidePlus, lucideSearch } from '@ng-icons/lucide';
import { apiErrorMessage } from '@core/api/api-error';
import { BlogTerms } from '@core/blog-terms/blog-terms';
import type { Term } from '@core/blog-terms/blog-terms.types';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmBadge } from '@ui/badge';
import { HlmButton } from '@ui/button';
import { HlmInput } from '@ui/input';
import { HlmSelectImports } from '@ui/select';
import { HlmSkeleton } from '@ui/skeleton';
import { HlmTableImports } from '@ui/table';
import { NEW_POST_ID, statusLabel, type PostQuery, type PostStatus } from '../blog.types';
import { isSlug } from '../post.document';
import { Posts } from '../services/posts';

/** Tags beyond this many show as a count, so every row stays one line of chips. */
const SHOWN_TAGS = 3;

/** A select value that means no filter. */
const ANY = '';

/**
 * Every post, newest change first. Status tabs, a category, a tag and a title search narrow
 * it, and all of them live in the query string so a filtered list can be linked to.
 */
@Component({
  selector: 'app-post-list',
  imports: [
    DatePipe,
    RouterLink,
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmBadge,
    HlmButton,
    HlmInput,
    HlmSelectImports,
    HlmSkeleton,
    HlmTableImports,
  ],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucidePlus, lucideSearch })],
  templateUrl: './post-list.html',
  host: { class: 'page-wide' },
})
export class PostList {
  /** Query params, bound by `withComponentInputBinding()`. All arrive as strings. */
  readonly page = input<string | undefined>(undefined);
  readonly status = input<string | undefined>(undefined);
  readonly category = input<string | undefined>(undefined);
  readonly tag = input<string | undefined>(undefined);
  readonly search = input<string | undefined>(undefined);

  private readonly posts = inject(Posts);
  private readonly terms = inject(BlogTerms);
  private readonly router = inject(Router);

  protected readonly newPostId = NEW_POST_ID;
  protected readonly any = ANY;
  protected readonly statusLabel = statusLabel;
  protected readonly categories = this.terms.all(() => 'category');
  protected readonly tagList = this.terms.all(() => 'tag');

  protected readonly currentPage = computed(() => {
    const parsed = Number(this.page());
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
  });

  protected readonly currentStatus = computed<PostStatus | null>(() => {
    const value = this.status();
    return value === 'draft' || value === 'published' ? value : null;
  });

  protected readonly currentCategory = computed(() => slugParam(this.category()));
  protected readonly currentTag = computed(() => slugParam(this.tag()));
  protected readonly currentSearch = computed(() => this.search()?.trim().slice(0, 200) || null);

  /** What the search box holds, until the person submits it. */
  protected readonly searchText = linkedSignal(() => this.currentSearch() ?? '');

  private readonly query = computed<PostQuery>(() => ({
    page: this.currentPage(),
    status: this.currentStatus(),
    category: this.currentCategory(),
    tag: this.currentTag(),
    search: this.currentSearch(),
  }));

  protected readonly entries = this.posts.page(this.query);

  protected readonly rows = computed(() => {
    if (!this.entries.hasValue()) {
      return [];
    }
    return this.entries.value().data.map((post) => ({
      ...post,
      shownTags: post.tags.slice(0, SHOWN_TAGS),
      moreTags: Math.max(post.tags.length - SHOWN_TAGS, 0),
    }));
  });

  protected readonly meta = computed(() => (this.entries.hasValue() ? this.entries.value().meta : null));

  protected readonly isLoading = computed(() => this.entries.isLoading());

  protected readonly errorMessage = computed(() => {
    const error = this.entries.error();
    return error ? apiErrorMessage(error, 'Could not load posts.') : null;
  });

  protected readonly statusFilters = computed(() => {
    const active = this.currentStatus();
    return (
      [
        { label: 'All posts', value: null },
        { label: 'Drafts', value: 'draft' },
        { label: 'Published', value: 'published' },
      ] as const
    ).map((filter) => ({
      ...filter,
      queryParams: { status: filter.value, page: null },
      active: filter.value === active,
    }));
  });

  protected readonly categoryOptions = computed(() => termsOf(this.categories));
  protected readonly tagOptions = computed(() => termsOf(this.tagList));

  protected readonly categoryName = (slug: string): string =>
    slug === ANY ? 'All categories' : nameOf(this.categoryOptions(), slug);

  protected readonly tagName = (slug: string): string =>
    slug === ANY ? 'All tags' : nameOf(this.tagOptions(), slug);

  protected readonly filtered = computed(
    () =>
      !!(this.currentStatus() || this.currentCategory() || this.currentTag() || this.currentSearch()),
  );

  protected readonly count = computed<number | null>(() => this.meta()?.total ?? null);

  protected readonly range = computed(() => {
    const meta = this.meta();
    if (!meta || meta.lastPage <= 1) {
      return null;
    }
    const first = (meta.page - 1) * meta.limit + 1;
    return { first, last: Math.min(first + meta.limit - 1, meta.total), total: meta.total };
  });

  protected readonly skeletonRows = Array.from({ length: 6 }, (_, index) => index);

  protected filterBy(param: 'category' | 'tag', value: string | null | undefined): void {
    void this.router.navigate([], {
      queryParams: { [param]: value || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected searchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  protected applySearch(event: Event): void {
    event.preventDefault();
    void this.router.navigate([], {
      queryParams: { search: this.searchText().trim() || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected reload(): void {
    this.entries.reload();
  }
}

/** A slug from the query string, or null for anything else someone typed there. */
function slugParam(value: string | undefined): string | null {
  return value && isSlug(value) ? value : null;
}

function termsOf(resource: { hasValue(): boolean; value(): Term[] | undefined }): Term[] {
  return resource.hasValue() ? (resource.value() ?? []) : [];
}

/** A slug nobody has, such as one from an old link, reads as itself. */
function nameOf(terms: readonly Term[], slug: string): string {
  return terms.find((term) => term.slug === slug)?.name ?? slug;
}
