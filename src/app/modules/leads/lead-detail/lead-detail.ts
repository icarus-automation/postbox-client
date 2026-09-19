import { DatePipe } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArchive,
  lucideArchiveRestore,
  lucideArrowLeft,
  lucideExternalLink,
  lucidePencil,
} from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { apiErrorMessage, isNotFound } from '@core/api/api-error';
import { LeadFields } from '@core/lead-fields/lead-fields';
import type { LeadField } from '@core/lead-fields/lead-fields.types';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmButton } from '@ui/button';
import { HlmCardImports } from '@ui/card';
import { HlmDialogImports } from '@ui/dialog';
import { HlmField, HlmFieldDescription, HlmFieldError, HlmFieldLabel } from '@ui/field';
import { HlmInput } from '@ui/input';
import { HlmSelectImports } from '@ui/select';
import { HlmSkeleton } from '@ui/skeleton';
import { HlmSpinner } from '@ui/spinner';
import { HlmTextarea } from '@ui/textarea';
import { LeadFieldValue } from '../lead-field-value/lead-field-value';
import { LeadStatusBadge } from '../lead-status/lead-status';
import { LeadStatusPicker } from '../lead-status-picker/lead-status-picker';
import {
  STATUS_KEY,
  isHttpUrl,
  isRetiredOption,
  leadTitle,
  linkHost,
  titleField,
  type Lead,
  type LeadValue,
} from '../leads.types';
import { Leads } from '../services/leads';
import {
  changedValues,
  controlValue,
  valueErrorMessage,
  valueValidators,
  withFieldLabels,
} from './lead-values-form';

/**
 * A long text value shorter than this is a word or two, not a passage. It reads as a row in
 * Details rather than as a card of its own, so nothing tiny gets a heading to itself.
 */
const NARRATIVE_MIN_LENGTH = 24;

function isNarrative(text: string): boolean {
  return text.trim().length >= NARRATIVE_MIN_LENGTH || text.includes('\n');
}

type ValuesForm = FormRecord<FormControl<LeadValue>>;

interface EditRow {
  field: LeadField;
  inputId: string;
  errorId: string;
  noteId: string;
  /** The retired select option the lead holds, if any. */
  retired: string | null;
  /** Whether the value may go back to empty. */
  clearable: boolean;
  /**
   * What a select's closed control reads. Only set where the lead holds a retired option,
   * so the control says it is retired without anyone opening the list.
   */
  optionLabel?: (value: LeadValue) => string;
}

/** The later of two ISO timestamps, so responses landing out of order never step back. */
function later(a: string, b: string): string {
  return Date.parse(b) > Date.parse(a) ? b : a;
}

/** `current` with the status and timestamp from `saved`, and every other value left alone. */
function withStatusFrom(current: Lead, saved: Lead): Lead {
  return {
    ...current,
    values: { ...current.values, [STATUS_KEY]: saved.values[STATUS_KEY] ?? null },
    updatedAt: later(current.updatedAt, saved.updatedAt),
  };
}

/** `saved`, but with the status `current` shows. A status save still in flight settles that value. */
function withValuesFrom(current: Lead, saved: Lead): Lead {
  return {
    ...saved,
    values: { ...saved.values, [STATUS_KEY]: current.values[STATUS_KEY] ?? saved.values[STATUS_KEY] ?? null },
    // An archive save in flight owns this, the same way it owns the status.
    isArchived: current.isArchived,
    updatedAt: later(current.updatedAt, saved.updatedAt),
  };
}

/** `current` with the archive flag from `saved`, and every value left where it is. */
function withArchiveFrom(current: Lead, saved: Lead): Lead {
  return {
    ...current,
    isArchived: saved.isArchived,
    updatedAt: later(current.updatedAt, saved.updatedAt),
  };
}

@Component({
  selector: 'app-lead-detail',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmButton,
    HlmCardImports,
    HlmDialogImports,
    HlmField,
    HlmFieldDescription,
    HlmFieldError,
    HlmFieldLabel,
    HlmInput,
    HlmSelectImports,
    HlmSkeleton,
    HlmSpinner,
    HlmTextarea,
    LeadFieldValue,
    LeadStatusBadge,
    LeadStatusPicker,
  ],
  providers: [
    provideIcons({
      lucideArchive,
      lucideArchiveRestore,
      lucideArrowLeft,
      lucideExternalLink,
      lucidePencil,
    }),
  ],
  templateUrl: './lead-detail.html',
  host: { class: 'page-standard' },
})
export class LeadDetail {
  /** The `:id` route param, bound by `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  private readonly leads = inject(Leads);
  private readonly injector = inject(Injector);

  protected readonly fields = inject(LeadFields).all();
  protected readonly lead = this.leads.byId(this.id);

  /** A lead the active organization cannot see reads the same as one that never existed. */
  protected readonly notFound = computed(() => isNotFound(this.lead.error()));

  protected readonly errorMessage = computed(() => {
    const error = this.lead.error() ?? this.fields.error();
    return error && !isNotFound(error) ? apiErrorMessage(error, 'Could not load this lead.') : null;
  });

  protected readonly isLoading = computed(() => this.lead.isLoading() || this.fields.isLoading());

  /** `value()` throws in an error state, so the template reads these instead. */
  protected readonly value = computed(() => {
    const lead = this.lead;
    return lead.hasValue() ? lead.value() : null;
  });

  private readonly definitions = computed(() => {
    const fields = this.fields;
    return fields.hasValue() ? fields.value() : [];
  });

  protected readonly title = computed(() => {
    const lead = this.value();
    return lead ? leadTitle(lead, this.definitions()) : '';
  });

  protected readonly statusField = computed(
    () => this.definitions().find((field) => field.key === STATUS_KEY) ?? null,
  );

  protected readonly status = computed(() => {
    const status = this.value()?.values[STATUS_KEY];
    return typeof status === 'string' ? status : null;
  });

  /**
   * The first link out of the lead, next to the title so it is one click away. The button
   * is named after the field, which does not change under a person, and says which site it
   * opens for anyone who wants to know before they click.
   */
  protected readonly primaryLink = computed(() => {
    const lead = this.value();
    if (!lead) {
      return null;
    }

    for (const field of this.definitions()) {
      const value = lead.values[field.key];
      if (field.type === 'url' && isHttpUrl(value)) {
        return { label: `Open ${field.label.toLowerCase()}`, site: linkHost(value), href: value };
      }
    }

    return null;
  });

  /**
   * The passages worth reading, each under its own heading, in the order the fields are in.
   * Nothing empty and nothing one-line lands here.
   */
  protected readonly sections = computed(() => {
    const lead = this.value();
    if (!lead) {
      return [];
    }

    return this.definitions().flatMap((field) => {
      const text = lead.values[field.key];
      if (field.type !== 'long_text' || typeof text !== 'string' || !isNarrative(text)) {
        return [];
      }

      return [{ field, text, headingId: `lead-section-${field.key}` }];
    });
  });

  /**
   * Every value the sections and the header do not already show, and only the ones the lead
   * holds. An empty field is noise on a page someone is reading, so it waits in the edit
   * form, where filling it in is the point.
   */
  protected readonly details = computed(() => {
    const lead = this.value();
    if (!lead) {
      return [];
    }

    const title = titleField(this.definitions());

    return this.definitions().flatMap((field) => {
      if (field.key === STATUS_KEY || field === title) {
        return [];
      }

      const value = lead.values[field.key] ?? null;
      if (value === null || value === '') {
        return [];
      }

      // A passage has its own section. A line of long text belongs here with the rest.
      if (field.type === 'long_text' && typeof value === 'string' && isNarrative(value)) {
        return [];
      }

      return [{ field, value }];
    });
  });

  /** What is still blank, said once, rather than a row of "Not set" for each one. */
  protected readonly emptyNote = computed(() => {
    const lead = this.value();
    if (!lead) {
      return null;
    }

    const empty = this.editRows().filter(({ field }) => {
      const value = lead.values[field.key] ?? null;
      return value === null || value === '';
    }).length;

    if (empty === 0) {
      return null;
    }

    return `${empty} ${empty === 1 ? 'field is' : 'fields are'} empty.`;
  });

  private readonly savingStatus = signal(false);
  protected readonly saveError = signal<string | null>(null);

  /** The status picked last. Saves run one at a time and keep going until the API holds it. */
  private wanted: string | null = null;

  protected readonly archiving = signal(false);
  protected readonly archiveError = signal<string | null>(null);
  protected readonly archiveErrorTitle = signal('Could not archive');

  /** The lead being edited. Tied to an id, so moving to another lead drops the form. */
  private readonly editingId = signal<string | null>(null);
  protected readonly editing = computed(() => this.editingId() === this.id());
  protected readonly form = signal<ValuesForm | null>(null);
  protected readonly editSaving = signal(false);
  protected readonly editError = signal<string | null>(null);

  /** The values the form started from, to tell what changed. */
  private editBase: Record<string, LeadValue> = {};

  /** Only fields the API lets a person write. Status has its own picker. */
  protected readonly editRows = computed<EditRow[]>(() => {
    const lead = this.value();

    return this.definitions()
      .filter((field) => !field.isReadOnly)
      .map((field) => {
        const value = lead?.values[field.key] ?? null;
        const retired = isRetiredOption(field, value) ? value : null;

        return {
          field,
          inputId: `lead-value-${field.key}`,
          errorId: `lead-value-${field.key}-error`,
          noteId: `lead-value-${field.key}-note`,
          retired,
          // A required field that holds a value cannot be cleared.
          clearable: !(field.isRequired && value !== null),
          optionLabel: retired
            ? (current: LeadValue) =>
                current === retired ? `${retired} (retired)` : String(current ?? '')
            : undefined,
        };
      });
  });

  private readonly editButton = viewChild<ElementRef<HTMLButtonElement>>('editButton');
  private readonly editForm = viewChild<ElementRef<HTMLFormElement>>('editForm');

  protected reload(): void {
    if (this.lead.error()) {
      this.lead.reload();
    }

    if (this.fields.error()) {
      this.fields.reload();
    }
  }

  /**
   * Shows the pick at once and saves it with no separate Save step. A pick made while a
   * save is in flight waits for that save, then goes out next, so the API always ends on
   * the last pick even when responses would otherwise race.
   */
  protected async changeStatus(status: string): Promise<void> {
    const lead = this.value();
    if (!lead) {
      return;
    }

    this.wanted = status;
    this.lead.set({ ...lead, values: { ...lead.values, [STATUS_KEY]: status } });
    this.saveError.set(null);

    if (this.savingStatus()) {
      return;
    }

    this.savingStatus.set(true);

    // Before this loop starts, the resource holds the status the API last confirmed.
    let saved = lead;

    try {
      while (this.wanted !== null && this.wanted !== saved.values[STATUS_KEY]) {
        saved = await this.leads.setStatus(saved.id, this.wanted);
      }
      toast.success('Status saved');
    } catch (error) {
      this.saveError.set(apiErrorMessage(error, 'Could not save status. Try again.'));
    } finally {
      this.wanted = null;
      this.savingStatus.set(false);

      // Settle on the status the API holds: the new one, or the last one it confirmed. Take
      // only the status, so values saved meanwhile stay. Skip it if the route moved on.
      const current = this.value();
      if (current && current.id === saved.id) {
        this.lead.set(withStatusFrom(current, saved));
      }
    }
  }

  /** Takes the lead out of the inbox. The dialog in the header asks before this runs. */
  protected archive(): Promise<void> {
    return this.setArchived(true);
  }

  /** Puts it back, at the stage it left on. Undoing a mistake asks nothing. */
  protected restore(): Promise<void> {
    return this.setArchived(false);
  }

  /**
   * Saves the archive flag on its own. Like a status save, it keeps only the part of the
   * answer it owns, so a value save landing around it is not undone.
   */
  private async setArchived(isArchived: boolean): Promise<void> {
    const lead = this.value();
    if (!lead || this.archiving()) {
      return;
    }

    this.archiving.set(true);
    this.archiveError.set(null);

    try {
      const saved = await this.leads.setArchived(lead.id, isArchived);
      const current = this.value();
      if (current && current.id === saved.id) {
        this.lead.set(withArchiveFrom(current, saved));
      }
    } catch (error) {
      const fallback = isArchived
        ? 'Could not archive this lead. Try again.'
        : 'Could not restore this lead. Try again.';
      this.archiveErrorTitle.set(isArchived ? 'Could not archive' : 'Could not restore');
      this.archiveError.set(apiErrorMessage(error, fallback));
    } finally {
      this.archiving.set(false);
    }
  }

  protected startEdit(): void {
    const lead = this.value();
    if (!lead) {
      return;
    }

    const controls: Record<string, FormControl<LeadValue>> = {};
    for (const { field } of this.editRows()) {
      const value = lead.values[field.key] ?? null;
      controls[field.key] = new FormControl<LeadValue>(controlValue(field, value), {
        validators: valueValidators(field, value),
      });
    }

    this.editBase = { ...lead.values };
    this.form.set(new FormRecord(controls));
    this.editError.set(null);
    this.editingId.set(lead.id);

    afterNextRender(() => this.focusFirst('input, textarea, select'), { injector: this.injector });
  }

  protected cancelEdit(): void {
    this.closeEdit();
  }

  /** Sends only the values that changed, then shows the lead the API returns. */
  protected async saveEdit(): Promise<void> {
    const form = this.form();
    const lead = this.value();
    if (!form || !lead || this.editSaving()) {
      return;
    }

    form.markAllAsTouched();
    if (form.invalid) {
      afterNextRender(() => this.focusFirst('[aria-invalid="true"]'), { injector: this.injector });
      return;
    }

    const fields = this.editRows().map((row) => row.field);
    const changes = changedValues(fields, form.getRawValue(), this.editBase);

    if (Object.keys(changes).length === 0) {
      this.closeEdit();
      toast('No changes');
      return;
    }

    this.editSaving.set(true);
    this.editError.set(null);

    try {
      const saved = await this.leads.updateValues(lead.id, changes);
      const current = this.value();
      if (current && current.id === saved.id) {
        this.lead.set(withValuesFrom(current, saved));
      }
      this.closeEdit();
      toast.success('Changes saved');
    } catch (error) {
      const message = apiErrorMessage(error, 'Could not save changes. Try again.');
      this.editError.set(withFieldLabels(message, this.definitions()));
    } finally {
      this.editSaving.set(false);
    }
  }

  /** What is wrong with a value. The field holds it back until the person has had a go. */
  protected fieldError(field: LeadField): string | null {
    const control = this.form()?.controls[field.key];
    return control ? valueErrorMessage(field, control.errors) : null;
  }

  private closeEdit(): void {
    this.editingId.set(null);
    this.form.set(null);

    // The form had focus and is gone now, so move focus to the Edit button.
    afterNextRender(() => this.editButton()?.nativeElement.focus(), { injector: this.injector });
  }

  private focusFirst(selector: string): void {
    this.editForm()?.nativeElement.querySelector<HTMLElement>(selector)?.focus();
  }
}
