import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideFileText, lucidePanelTop } from '@ng-icons/lucide';
import { apiErrorMessage } from '@core/api/api-error';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmBadge } from '@ui/badge';
import { HlmButton } from '@ui/button';
import { HlmDialogImports } from '@ui/dialog';
import { HlmFieldImports } from '@ui/field';
import { HlmInput } from '@ui/input';
import { HlmSkeleton } from '@ui/skeleton';
import { HlmSpinner } from '@ui/spinner';
import { HlmTableImports } from '@ui/table';
import { starterBody, starterProblem } from '../content.document';
import { kindLabel, statusLabel, type ContentQuery, type EntryKind } from '../content.types';
import { Content } from '../services/content';

@Component({
  selector: 'app-content-list',
  imports: [
    DatePipe,
    RouterLink,
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmBadge,
    HlmButton,
    HlmDialogImports,
    HlmFieldImports,
    HlmInput,
    HlmSkeleton,
    HlmSpinner,
    HlmTableImports,
  ],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideFileText, lucidePanelTop })],
  templateUrl: './content-list.html',
  host: { class: 'page-wide' },
})
export class ContentList {
  /** Query params, bound by `withComponentInputBinding()`. All arrive as strings. */
  readonly page = input<string | undefined>(undefined);
  readonly kind = input<string | undefined>(undefined);
  readonly status = input<string | undefined>(undefined);

  private readonly content = inject(Content);
  private readonly router = inject(Router);

  protected readonly kindLabel = kindLabel;
  protected readonly statusLabel = statusLabel;
  protected readonly starterTitle = signal('');
  protected readonly starterKind = signal<EntryKind>('post');
  protected readonly starterError = signal<string | null>(null);
  protected readonly creating = signal(false);

  protected readonly currentPage = computed(() => {
    const parsed = Number(this.page());
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
  });

  protected readonly currentKind = computed<EntryKind | null>(() => {
    const value = this.kind();
    return value === 'post' || value === 'page' ? value : null;
  });

  protected readonly currentStatus = computed(() => {
    const value = this.status();
    return value === 'draft' || value === 'published' ? value : null;
  });

  private readonly query = computed<ContentQuery>(() => ({
    page: this.currentPage(),
    kind: this.currentKind(),
    status: this.currentStatus(),
  }));

  protected readonly entries = this.content.page(this.query);

  protected readonly rows = computed(() => (this.entries.hasValue() ? this.entries.value().data : []));

  protected readonly meta = computed(() => (this.entries.hasValue() ? this.entries.value().meta : null));

  protected readonly isLoading = computed(() => this.entries.isLoading());

  protected readonly errorMessage = computed(() => {
    const error = this.entries.error();
    return error ? apiErrorMessage(error, 'Could not load content.') : null;
  });

  protected readonly kindFilters = computed(() => {
    const active = this.currentKind();
    return (
      [
        { label: 'All', value: null },
        { label: 'Articles', value: 'post' },
        { label: 'Landing pages', value: 'page' },
      ] as const
    ).map((filter) => ({
      ...filter,
      queryParams: { kind: filter.value, page: null },
      active: filter.value === active,
    }));
  });

  protected readonly statusFilters = computed(() => {
    const active = this.currentStatus();
    return (
      [
        { label: 'All', value: null },
        { label: 'Drafts', value: 'draft' },
        { label: 'Published', value: 'published' },
      ] as const
    ).map((filter) => ({
      ...filter,
      queryParams: { status: filter.value, page: null },
      active: filter.value === active,
    }));
  });

  protected readonly count = computed<number | null>(() => this.meta()?.total ?? null);

  protected readonly range = computed(() => {
    const meta = this.meta();
    if (!meta || meta.lastPage <= 1) {
      return null;
    }
    const first = (meta.page - 1) * meta.limit + 1;
    return { first, last: Math.min(first + meta.limit - 1, meta.total), total: meta.total };
  });

  protected readonly emptyTitle = computed(() => {
    const kind = this.currentKind();
    const status = this.currentStatus();
    if (kind === 'post' && status === 'draft') return 'No article drafts';
    if (kind === 'post' && status === 'published') return 'No published articles';
    if (kind === 'page' && status === 'draft') return 'No landing page drafts';
    if (kind === 'page' && status === 'published') return 'No published landing pages';
    if (kind === 'post') return 'No articles';
    if (kind === 'page') return 'No landing pages';
    if (status === 'draft') return 'No drafts';
    if (status === 'published') return 'Nothing published yet';
    return 'No pages yet';
  });

  protected readonly emptyBody = computed(() => {
    if (this.currentKind() || this.currentStatus()) {
      return 'Try another filter, or start something new.';
    }
    return 'Start an article or a landing page.';
  });

  protected readonly skeletonRows = Array.from({ length: 6 }, (_, index) => index);

  protected readonly starterSlug = computed(() => {
    const title = this.starterTitle().trim();
    return title ? starterBody(this.starterKind(), title).slug : '';
  });

  protected begin(kind: EntryKind, dialog: { open: () => void }): void {
    this.starterKind.set(kind);
    this.starterTitle.set('');
    this.starterError.set(null);
    dialog.open();
  }

  protected titleInput(event: Event): void {
    this.starterTitle.set((event.target as HTMLInputElement).value);
  }

  protected async create(event: Event, dialog: { close: () => void }): Promise<void> {
    event.preventDefault();
    if (this.creating()) {
      return;
    }
    const problem = starterProblem(this.starterTitle());
    if (problem) {
      this.starterError.set(problem);
      return;
    }
    const body = starterBody(this.starterKind(), this.starterTitle());
    this.creating.set(true);
    this.starterError.set(null);
    try {
      const created = await this.content.create(body);
      dialog.close();
      await this.router.navigate(['/content', created.id]);
    } catch (error) {
      this.starterError.set(apiErrorMessage(error, 'Could not create this page. Try again.'));
    } finally {
      this.creating.set(false);
    }
  }

  protected reload(): void {
    this.entries.reload();
  }
}
