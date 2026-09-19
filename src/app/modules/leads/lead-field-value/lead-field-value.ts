import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideExternalLink } from '@ng-icons/lucide';
import type { LeadField } from '@core/lead-fields/lead-fields.types';
import { LeadStatusBadge } from '../lead-status/lead-status';
import { STATUS_KEY, isHttpUrl, isRetiredOption, linkHost, type LeadValue } from '../leads.types';

/**
 * Formats one lead value for its field type. `cell` is the dense form for a table row.
 * `detail` is the full form for the lead page.
 */
@Component({
  selector: 'app-lead-field-value',
  imports: [DatePipe, DecimalPipe, NgIcon, LeadStatusBadge],
  providers: [provideIcons({ lucideExternalLink })],
  templateUrl: './lead-field-value.html',
})
export class LeadFieldValue {
  readonly field = input.required<LeadField>();
  readonly value = input.required<LeadValue>();
  readonly layout = input<'cell' | 'detail'>('detail');
  /** What the lead is called, so a link out of a table row can say whose it is. */
  readonly leadName = input('');

  protected readonly isEmpty = computed(() => {
    const value = this.value();
    return value === null || value === '';
  });

  protected readonly isStatus = computed(() => this.field().key === STATUS_KEY);
  protected readonly retired = computed(() => isRetiredOption(this.field(), this.value()));
  protected readonly href = computed(() => {
    const value = this.value();
    return this.field().type === 'url' && isHttpUrl(value) ? value : null;
  });

  /** A cell has no room for the whole link, so it shows the site the link goes to. */
  protected readonly linkSite = computed(() => {
    const href = this.href();
    return href === null ? '' : linkHost(href);
  });

  /** `number` fields hold numbers. Any other value in one shows as plain text. */
  protected readonly number = computed(() => {
    const value = this.value();
    return typeof value === 'number' ? value : null;
  });

  protected readonly text = computed(() => {
    const value = this.value();
    return typeof value === 'string' ? value : null;
  });

  /**
   * Only a string the browser can parse reaches the date pipe, which throws on anything
   * else. A stray number would otherwise read as an epoch.
   */
  protected readonly dateText = computed(() => {
    const text = this.text();
    return text !== null && !Number.isNaN(Date.parse(text)) ? text : null;
  });
}
