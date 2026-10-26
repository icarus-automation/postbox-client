import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideCode,
  lucideFolder,
  lucideKey,
  lucideKeyRound,
  lucideTableProperties,
  lucideTags,
} from '@ng-icons/lucide';
import { Auth } from '@core/auth/auth';
import { HlmBadge } from '@ui/badge';

/** One screen you can open from Settings, or one that is still to come. */
interface SettingsEntry {
  title: string;
  description: string;
  icon: string;
  /** Absent while the screen does not exist yet, which is what `soon` marks. */
  route?: string;
  soon?: boolean;
  /** A short warning that sits beside the title, such as "Server-only". */
  caution?: string;
}

interface SettingsSection {
  heading: string;
  headingId: string;
  /** Owners and admins only. The screens in it are theirs to use, so members do not see it. */
  editorsOnly?: boolean;
  entries: SettingsEntry[];
}

const SECTIONS: SettingsSection[] = [
  {
    heading: 'General',
    headingId: 'settings-general',
    entries: [
      {
        title: 'Organization',
        description: 'Your organization name, website, and logo.',
        icon: 'lucideBuilding2',
        route: '/settings/organization',
      },
    ],
  },
  {
    heading: 'Website',
    headingId: 'settings-website',
    editorsOnly: true,
    entries: [
      {
        title: 'Integration key',
        description: 'The key your website uses to read posts and send leads. Copy it or rotate it.',
        icon: 'lucideKeyRound',
        route: '/settings/integration-key',
      },
      {
        title: 'Developers',
        description: 'A prompt for an AI agent and a short reference for connecting your site.',
        icon: 'lucideCode',
        route: '/developers',
      },
    ],
  },
  {
    heading: 'Blog',
    headingId: 'settings-blog',
    entries: [
      {
        title: 'Categories',
        description: 'Topics that group your posts. Each post has one at most.',
        icon: 'lucideFolder',
        route: '/settings/categories',
      },
      {
        title: 'Tags',
        description: 'Keywords that label your posts. A post can have many.',
        icon: 'lucideTags',
        route: '/settings/tags',
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
  {
    heading: 'Advanced',
    headingId: 'settings-advanced',
    editorsOnly: true,
    entries: [
      {
        title: 'Admin API keys',
        description: 'Keys for agents, scripts and servers that file drafts and read leads.',
        icon: 'lucideKey',
        route: '/settings/api-keys',
        caution: 'Server-only',
      },
    ],
  },
];

/**
 * The way into everything under Settings, grouped the way the product is: what the
 * organization is, how its website connects, how its blog is sorted, what a lead holds, then
 * the keys meant for servers. A screen that does not exist yet still gets a card, marked
 * Soon, so the shape of the product is on screen rather than only in a plan.
 */
@Component({
  selector: 'app-settings-home',
  imports: [RouterLink, NgIcon, HlmBadge],
  providers: [
    provideIcons({
      lucideBuilding2,
      lucideCode,
      lucideFolder,
      lucideKey,
      lucideKeyRound,
      lucideTableProperties,
      lucideTags,
    }),
  ],
  templateUrl: './settings-home.html',
  host: { class: 'page-wide' },
})
export class SettingsHome {
  private readonly isEditor = inject(Auth).isEditor;

  protected readonly sections = computed(() =>
    SECTIONS.filter((section) => this.isEditor() || !section.editorsOnly),
  );
}
