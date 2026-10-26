import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideRefreshCw } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { apiErrorMessage, isNotFound } from '@core/api/api-error';
import { IntegrationKey } from '@core/integration-key/integration-key';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmButton } from '@ui/button';
import { CopyButton } from '@ui/copy-button';
import { HlmDialog, HlmDialogImports } from '@ui/dialog';
import { HlmSkeleton } from '@ui/skeleton';
import { HlmSpinner } from '@ui/spinner';

/**
 * Copy the organization's integration key, or replace it. The key is safe in website code, so
 * this screen shows it in full. Rotating cuts the old key off at once, which is why it asks
 * first. Owners and admins only.
 */
@Component({
  selector: 'app-integration-key-settings',
  imports: [
    RouterLink,
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmButton,
    HlmDialogImports,
    HlmSkeleton,
    HlmSpinner,
    CopyButton,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideRefreshCw })],
  templateUrl: './integration-key-settings.html',
  host: { class: 'page-standard' },
})
export class IntegrationKeySettings {
  private readonly integrationKey = inject(IntegrationKey);
  private readonly rotateDialog = viewChild.required<HlmDialog>('rotateDialog');

  protected readonly key = this.integrationKey.current();
  protected readonly rotating = signal(false);
  protected readonly rotateError = signal<string | null>(null);

  protected readonly errorMessage = computed(() => {
    const error = this.key.error();
    return error ? apiErrorMessage(error, 'Could not load the integration key.') : null;
  });

  /** An organization with no key yet. Rotating makes one, so the screen offers that. */
  protected readonly missing = computed(() => isNotFound(this.key.error()));

  protected startRotate(): void {
    this.rotateError.set(null);
    this.rotateDialog().open();
  }

  protected async confirmRotate(): Promise<void> {
    if (this.rotating()) {
      return;
    }
    this.rotating.set(true);
    this.rotateError.set(null);
    try {
      this.key.set(await this.integrationKey.rotate());
      this.rotateDialog().close();
      toast.success('Integration key rotated');
    } catch (error) {
      this.rotateError.set(apiErrorMessage(error, 'Could not rotate the key. Try again.'));
    } finally {
      this.rotating.set(false);
    }
  }
}
