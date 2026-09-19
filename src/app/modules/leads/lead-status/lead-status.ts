import { Component, computed, input } from '@angular/core';
import { HlmBadge, type BadgeVariants } from '@ui/badge';
import { leadStatusLabel } from '../leads.types';

/** Tones for the stages the API ships. Any other value gets a plain outline. */
const TONES = new Map<string, BadgeVariants['variant']>([
  ['new', 'secondary'],
  ['contacted', 'warning'],
  ['qualified', 'success'],
]);

@Component({
  selector: 'app-lead-status',
  imports: [HlmBadge],
  template: `<span hlmBadge [variant]="tone()">{{ label() }}</span>`,
})
export class LeadStatusBadge {
  readonly status = input.required<string>();

  protected readonly tone = computed(() => TONES.get(this.status()) ?? 'outline');
  protected readonly label = computed(() => leadStatusLabel(this.status()));
}
