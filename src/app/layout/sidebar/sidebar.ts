import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCode, lucideInbox, lucideNewspaper, lucideSettings } from '@ng-icons/lucide';
import { Auth } from '@core/auth/auth';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NgIcon],
  providers: [provideIcons({ lucideCode, lucideInbox, lucideNewspaper, lucideSettings })],
  templateUrl: './sidebar.html',
  // On the host so the element itself is the flex child that fills the column.
  // Hidden on phones. There the header has the brand link and a Settings link instead.
  host: { class: 'hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar md:block' },
})
export class Sidebar {
  /** The Developers page shows the integration key, so only owners and admins get the link. */
  protected readonly canSeeDevelopers = inject(Auth).isEditor;
}
