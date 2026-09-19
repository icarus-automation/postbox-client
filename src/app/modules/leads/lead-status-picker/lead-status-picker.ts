import { Component, computed, input, output } from '@angular/core';
import { HlmSelectImports } from '@ui/select';
import { leadStatusLabel } from '../leads.types';

let nextId = 0;

/**
 * Sets the stage a lead is at, from the status field's options. It is a labelled field in
 * the record's rail, a label over its control like every other value, and not a row of
 * tabs: the inbox moves between many leads, this changes this one. Archiving is not one of
 * the stages: it is the lead's own flag, and the lead page owns that action. The picker
 * reports the pick. Saving belongs to the page.
 */
@Component({
  selector: 'app-lead-status-picker',
  imports: [HlmSelectImports],
  host: { class: 'grid gap-1.5' },
  templateUrl: './lead-status-picker.html',
})
export class LeadStatusPicker {
  readonly status = input.required<string>();
  /** The status field's options, in the order the API lists them. */
  readonly options = input.required<readonly string[]>();
  /** The status field's label. */
  readonly label = input('Status');
  readonly statusChange = output<string>();

  protected readonly triggerId = `lead-status-${nextId++}`;

  protected readonly stages = computed(() =>
    this.options().map((value) => ({ value, label: leadStatusLabel(value) })),
  );

  /**
   * What the closed control reads. The list is portaled, so the trigger has no item to take
   * a name from and would print the stored value instead.
   */
  protected readonly statusLabel = leadStatusLabel;

  protected pick(value: unknown): void {
    if (typeof value === 'string' && this.options().includes(value) && value !== this.status()) {
      this.statusChange.emit(value);
    }
  }
}
