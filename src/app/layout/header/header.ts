import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogOut, lucideSettings } from '@ng-icons/lucide';
import { Auth } from '@core/auth/auth';
import { HlmButton } from '@ui/button';
import { HlmDialogImports } from '@ui/dialog';

@Component({
  selector: 'app-header',
  imports: [RouterLink, NgIcon, HlmButton, HlmDialogImports],
  providers: [provideIcons({ lucideLogOut, lucideSettings })],
  templateUrl: './header.html',
  host: { class: 'sticky top-0 z-20' },
})
export class Header {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly signingOut = signal(false);

  /** Runs once the dialog in the header has the person's answer, never straight off a click. */
  protected async signOut(): Promise<void> {
    if (this.signingOut()) {
      return;
    }

    this.signingOut.set(true);

    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/login');
    } finally {
      this.signingOut.set(false);
    }
  }
}
