import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideImage } from '@ng-icons/lucide';
import { shownError } from '@core/api/api-error';
import { Auth } from '@core/auth/auth';
import { editorRole } from '@core/auth/auth.types';
import { WorkspaceApi } from '@core/auth/workspace-api';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmButton } from '@ui/button';
import { HlmField, HlmFieldLabel } from '@ui/field';
import { HlmInput } from '@ui/input';
import { SetPasswordForm } from './set-password-form';

const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_LOGO_BYTES = 5_000_000;

@Component({
  selector: 'app-organization-settings',
  imports: [
    RouterLink,
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmButton,
    HlmField,
    HlmFieldLabel,
    HlmInput,
    SetPasswordForm,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucideImage })],
  templateUrl: './organization-settings.html',
  host: { class: 'page-wide' },
})
export class OrganizationSettings {
  private readonly auth = inject(Auth);
  private readonly workspace = inject(WorkspaceApi);

  protected readonly admission = this.auth.admission;
  protected readonly name = signal('');
  protected readonly website = signal('');
  protected readonly logoFile = signal<File | null>(null);
  protected readonly clearLogo = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly editorRole = editorRole;

  constructor() {
    const admission = this.auth.admission();
    if (admission.phase === 'admitted') {
      this.name.set(admission.workspace.name);
      this.website.set(admission.workspace.website ?? '');
    }
  }

  protected onFile(file: File | null): void {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type) || file.size < 1 || file.size > MAX_LOGO_BYTES) {
      this.error.set('Use a PNG, JPG, WebP, or GIF up to 5MB.');
      return;
    }
    this.error.set(null);
    this.logoFile.set(file);
    this.clearLogo.set(false);
  }

  protected removeLogo(): void {
    this.logoFile.set(null);
    this.clearLogo.set(true);
  }

  protected async save(): Promise<void> {
    const admission = this.admission();
    if (admission.phase !== 'admitted' || !editorRole(admission.workspace.role) || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const file = this.logoFile();
    try {
      await this.workspace.save({
        name: this.name().trim(),
        website: this.website(),
        logo: file
          ? { kind: 'file', file }
          : this.clearLogo()
            ? { kind: 'clear' }
            : { kind: 'unchanged' },
      });
      this.logoFile.set(null);
      this.clearLogo.set(false);
    } catch (error) {
      this.error.set(shownError(error, 'Could not save the workspace.'));
    } finally {
      this.saving.set(false);
    }
  }
}
