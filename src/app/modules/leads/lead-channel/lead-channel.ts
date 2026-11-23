import { Component, computed, input } from '@angular/core';
import { HlmBadge } from '@ui/badge';
import { leadChannelLabel, type LeadChannel } from '../leads.types';

/**
 * Where a lead came from, as a quiet outline so it never reads as a stage. "Now inbound" is
 * the loud one: an agent found this person and they have since sent the form.
 */
@Component({
  selector: 'app-lead-channel',
  imports: [HlmBadge],
  host: { class: 'flex flex-wrap items-center gap-1' },
  template: `
    <span hlmBadge variant="outline"><span class="sr-only">Channel: </span>{{ label() }}</span>
    @if (nowInbound()) {
      <span hlmBadge variant="default">Now inbound</span>
    }
  `,
})
export class LeadChannelBadge {
  readonly channel = input.required<LeadChannel>();
  readonly nowInbound = input(false);

  protected readonly label = computed(() => leadChannelLabel(this.channel()));
}
