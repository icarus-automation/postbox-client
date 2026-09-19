import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBuilding2, lucideTableProperties } from '@ng-icons/lucide';
import { HlmBadge } from '@ui/badge';

/** One screen you can open from Settings, or one that is still to come. */
interface SettingsEntry {
  title: string;
  description: string;
  icon: string;
  /** Absent while the screen does not exist yet, which is what `soon` marks. */
  route?: string;
  soon?: boolean;
}

interface SettingsSection {
  heading: string;
  headingId: string;
  entries: SettingsEntry[];
}

/**
 * The way into everything under Settings, grouped the way the product is: what the
 * organization is, then what a lead holds. A screen that does not exist yet still gets a
 * card, marked Soon, so the shape of the product is on screen rather than only in a plan.
 */
@Component({
  selector: 'app-settings-home',
  imports: [RouterLink, NgIcon, HlmBadge],
  providers: [provideIcons({ lucideBuilding2, lucideTableProperties })],
  templateUrl: './settings-home.html',
  host: { class: 'page-wide' },
})
export class SettingsHome {
  protected readonly sections: SettingsSection[] = [
    {
      heading: 'General',
      headingId: 'settings-general',
      entries: [
        {
          title: 'Organization',
          description: 'Your organization name, and who belongs to it.',
          icon: 'lucideBuilding2',
          soon: true,
        },
      ],
    },
    {
      heading: 'Leads',
      headingId: 'settings-leads',
      entries: [
        {
          title: 'Lead fields',
          description: 'What a lead holds, and the order it reads in.',
          icon: 'lucideTableProperties',
          route: '/settings/lead-fields',
        },
      ],
    },
  ];
}
