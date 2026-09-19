import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucidePlus } from '@ng-icons/lucide';
import { apiErrorMessage } from '@core/api/api-error';
import { LeadFields } from '@core/lead-fields/lead-fields';
import type { LeadField } from '@core/lead-fields/lead-fields.types';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmBadge } from '@ui/badge';
import { HlmButton } from '@ui/button';
import { HlmDialogImports } from '@ui/dialog';
import { HlmSkeleton } from '@ui/skeleton';
import { HlmTableImports } from '@ui/table';
import { AddLeadField } from '../add-lead-field/add-lead-field';
import { FIELD_TYPE_LABELS } from '../lead-field-rules';

/** The organization's lead fields, built-in ones first, with a dialog to add a custom one. */
@Component({
  selector: 'app-lead-field-list',
  imports: [
    RouterLink,
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmBadge,
    HlmButton,
    HlmDialogImports,
    HlmSkeleton,
    HlmTableImports,
    AddLeadField,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucidePlus })],
  templateUrl: './lead-field-list.html',
  host: { class: 'page-standard' },
})
export class LeadFieldList {
  protected readonly fields = inject(LeadFields).all();

  /** What just happened, for anyone who cannot see the new row land in the table. */
  protected readonly announcement = signal('');

  // `value()` throws while the resource is in an error state, so go through `hasValue()`.
  protected readonly rows = computed(() => {
    const fields = this.fields;
    if (!fields.hasValue()) {
      return [];
    }

    // The type reads as its name alone. What a select offers belongs with the field
    // itself, not in a cell that would make one row twice the height of the next.
    return fields.value().map((field) => ({
      field,
      type: FIELD_TYPE_LABELS[field.type] ?? field.type,
      // A field the API fills in is never something a lead has to arrive with, so the
      // column says nothing about it and the field carries a badge instead.
      requirement: field.isReadOnly ? null : field.isRequired ? 'Yes' : 'No',
    }));
  });

  protected readonly takenKeys = computed(() => this.rows().map((row) => row.field.key));

  /** Adding needs the keys already in use, which only a loaded list has. */
  protected readonly canAdd = computed(() => this.fields.hasValue());

  protected readonly errorMessage = computed(() => {
    const error = this.fields.error();
    return error ? apiErrorMessage(error, 'Could not load lead fields.') : null;
  });

  protected readonly skeletonRows = Array.from({ length: 8 }, (_, index) => index);

  /** Shows the new field at once, as the API saved it, rather than reading the list again. */
  protected add(field: LeadField): void {
    this.fields.update((fields) => [...(fields ?? []), field]);
    this.announcement.set(`Added ${field.label}.`);
  }

  protected reload(): void {
    this.announcement.set('');
    this.fields.reload();
  }
}
