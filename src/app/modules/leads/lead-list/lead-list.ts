import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideColumns3 } from '@ng-icons/lucide';
import { apiErrorMessage } from '@core/api/api-error';
import { LeadFields } from '@core/lead-fields/lead-fields';
import type { LeadFieldType } from '@core/lead-fields/lead-fields.types';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmButton } from '@ui/button';
import { HlmCheckbox } from '@ui/checkbox';
import { HlmLabel } from '@ui/label';
import { HlmPopoverImports } from '@ui/popover';
import { HlmSkeleton } from '@ui/skeleton';
import { HlmTableImports } from '@ui/table';
import { LeadFieldValue } from '../lead-field-value/lead-field-value';
import { STATUS_KEY, defaultColumnKeys, leadStatusLabel, leadTitle, titleField } from '../leads.types';
import { LeadColumns } from '../services/lead-columns';
import { Leads, type LeadQuery } from '../services/leads';

/**
 * Classes per field type for what sits inside a cell, so long text wraps and numbers line
 * up. They go on the content, not the cell: helm rewrites its own host's class list and
 * can drop classes a binding added.
 */
const CONTENT_CLASSES: Record<LeadFieldType, string> = {
  text: 'block min-w-32 max-w-60 whitespace-normal',
  long_text: 'block min-w-64 max-w-80 whitespace-normal',
  number: 'block text-end tabular-nums',
  select: 'block',
  url: 'block',
  date: 'block text-muted-foreground',
  datetime: 'block text-muted-foreground',
};

@Component({
  selector: 'app-lead-list',
  imports: [
    RouterLink,
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmButton,
    HlmCheckbox,
    HlmLabel,
    HlmPopoverImports,
    HlmSkeleton,
    HlmTableImports,
    LeadFieldValue,
  ],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideColumns3 })],
  templateUrl: './lead-list.html',
  host: { class: 'page-wide' },
})
export class LeadList {
  /** Query params, bound by `withComponentInputBinding()`. All arrive as strings. */
  readonly page = input<string | undefined>(undefined);
  readonly status = input<string | undefined>(undefined);
  readonly archived = input<string | undefined>(undefined);

  private readonly leadColumns = inject(LeadColumns);

  protected readonly fields = inject(LeadFields).all();

  // `value()` throws while a resource is in an error state, and the page header reads
  // these before the error branch renders, so go through `hasValue()`.
  private readonly definitions = computed(() => {
    const fields = this.fields;
    return fields.hasValue() ? fields.value() : [];
  });

  /** The field a row is named after, which is also the column that links into the lead. */
  private readonly nameField = computed(() => titleField(this.definitions()));

  /**
   * The columns on screen, in position order: the fields the person picked, or the short
   * ones the table opens with. The name column stays whatever they pick, because it
   * carries the link into the lead.
   */
  protected readonly columns = computed(() => {
    const fields = this.definitions();
    const name = this.nameField();
    const shown = this.leadColumns.keys() ?? defaultColumnKeys(fields);

    return fields
      .filter((field) => field === name || shown.includes(field.key))
      .map((field) => ({
        field,
        isTitle: field === name,
        contentClass: CONTENT_CLASSES[field.type] ?? 'block',
      }));
  });

  /** One checkbox per field the table can drop, so the name column is not among them. */
  protected readonly columnOptions = computed(() => {
    const name = this.nameField();
    const shown = new Set(this.columns().map((column) => column.field.key));

    return this.definitions()
      .filter((field) => field !== name)
      .map((field) => ({ field, inputId: `lead-column-${field.key}`, shown: shown.has(field.key) }));
  });

  /** True once someone has picked, which is the only time there is a default to go back to. */
  protected readonly columnsPicked = computed(() => this.leadColumns.keys() !== null);

  protected readonly statusField = computed(
    () => this.definitions().find((field) => field.key === STATUS_KEY) ?? null,
  );

  protected readonly currentPage = computed(() => {
    const parsed = Number(this.page());
    return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
  });

  /**
   * The status filter. A value the status field does not offer is treated as no filter.
   * Undefined while a filter in the URL waits for the definitions to say which exist.
   */
  protected readonly currentStatus = computed<string | null | undefined>(() => {
    const value = this.status();
    if (!value) {
      return null;
    }

    if (!this.fields.hasValue()) {
      return undefined;
    }

    return this.statusField()?.options.includes(value) ? value : null;
  });

  /**
   * Which list is on screen. The archive is a list of its own and never mixes into the
   * inbox, so anything but the word the API takes reads as the inbox.
   */
  protected readonly currentArchived = computed(() => this.archived() === 'true');

  private readonly query = computed<LeadQuery | undefined>(() => {
    const status = this.currentStatus();
    return status === undefined
      ? undefined
      : { page: this.currentPage(), status, archived: this.currentArchived() };
  });

  protected readonly leads = inject(Leads).page(this.query);

  protected readonly rows = computed(() => {
    const leads = this.leads;
    if (!leads.hasValue()) {
      return [];
    }

    const fields = this.definitions();

    return leads.value().data.map((lead) => ({
      id: lead.id,
      title: leadTitle(lead, fields),
      cells: this.columns().map((column) => ({ ...column, value: lead.values[column.field.key] ?? null })),
    }));
  });

  protected readonly meta = computed(() => {
    const leads = this.leads;
    return leads.hasValue() ? leads.value().meta : null;
  });

  protected readonly isLoading = computed(() => this.fields.isLoading() || this.leads.isLoading());

  protected readonly errorMessage = computed(() => {
    const error = this.fields.error() ?? this.leads.error();
    return error ? apiErrorMessage(error, 'Could not load leads.') : null;
  });

  /** The stage tabs, which all read the inbox. Picking one drops `archived` from the URL. */
  protected readonly filters = computed(() => {
    const inbox = !this.currentArchived();
    const active = this.currentStatus() ?? null;

    return [
      { label: 'All', value: null as string | null },
      ...(this.statusField()?.options ?? []).map((status) => ({
        label: leadStatusLabel(status),
        value: status as string | null,
      })),
    ].map((filter) => ({
      ...filter,
      queryParams: { status: filter.value, archived: null, page: null },
      active: inbox && filter.value === active,
    }));
  });

  /** The archive, which is another list rather than another stage, so it carries no status. */
  protected readonly archiveFilter = computed(() => ({
    queryParams: { status: null, archived: 'true', page: null },
    active: this.currentArchived(),
  }));

  protected readonly filterLabel = computed(
    () => `Filter leads by ${(this.statusField()?.label ?? 'status').toLowerCase()}`,
  );

  protected readonly statusLabel = leadStatusLabel;

  /** How many leads this list holds, or null until the first page lands. */
  protected readonly count = computed<number | null>(() => this.meta()?.total ?? null);

  /** The 1-based slice on screen. Only worth saying once the list runs past one page. */
  protected readonly range = computed(() => {
    const meta = this.meta();
    if (!meta || meta.lastPage <= 1) {
      return null;
    }

    const first = (meta.page - 1) * meta.limit + 1;
    return { first, last: Math.min(first + meta.limit - 1, meta.total), total: meta.total };
  });

  protected readonly skeletonRows = Array.from({ length: 6 }, (_, index) => index);

  /** Adds or drops one column. The name column is not in the pick, so it never lands here. */
  protected showColumn(key: string, show: boolean): void {
    const name = this.nameField();
    const kept = this.columns()
      .map((column) => column.field.key)
      .filter((shown) => shown !== name?.key && shown !== key);

    this.leadColumns.pick(show ? [...kept, key] : kept);
  }

  protected resetColumns(): void {
    this.leadColumns.reset();
  }

  protected reload(): void {
    if (this.fields.error()) {
      this.fields.reload();
    }

    if (this.leads.error()) {
      this.leads.reload();
    }
  }
}
