import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImage } from '@ng-icons/lucide';
import { shownError } from '@core/api/api-error';
import { Auth } from '@core/auth/auth';
import { claimableSlug } from '@core/auth/claimable-slug';
import { WorkspaceApi, type SlugPreview } from '@core/auth/workspace-api';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmButton } from '@ui/button';
import { HlmField, HlmFieldError, HlmFieldLabel } from '@ui/field';
import { HlmInput } from '@ui/input';
import { HlmSpinner } from '@ui/spinner';

const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_LOGO_BYTES = 5_000_000;

@Component({
  selector: 'app-create-organization',
  imports: [
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmButton,
    HlmField,
    HlmFieldError,
    HlmFieldLabel,
    HlmInput,
    HlmSpinner,
  ],
  providers: [provideIcons({ lucideImage })],
  templateUrl: './create-organization.html',
})
export class CreateOrganization {
  private readonly auth = inject(Auth);
  private readonly workspace = inject(WorkspaceApi);
  private readonly router = inject(Router);

  protected readonly admission = this.auth.admission;
  protected readonly name = signal('');
  protected readonly slug = signal('');
  protected readonly website = signal('');
  protected readonly logo = signal<File | null>(null);
  protected readonly logoName = signal<string | null>(null);
  protected readonly preview = signal<SlugPreview | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  private slugEdited = false;
  private previewToken = 0;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;

  protected onName(value: string): void {
    this.name.set(value);
    if (!this.slugEdited) {
      this.slug.set(claimableSlug(value));
      this.queuePreview();
    }
  }

  protected onSlug(value: string): void {
    this.slugEdited = true;
    this.slug.set(value.trim().toLowerCase());
    this.queuePreview();
  }

  protected onWebsite(value: string): void {
    this.website.set(value);
  }

  protected onFile(file: File | null): void {
    if (!file) {
      this.logo.set(null);
      this.logoName.set(null);
      return;
    }
    if (!LOGO_TYPES.includes(file.type) || file.size < 1 || file.size > MAX_LOGO_BYTES) {
      this.error.set('Use a PNG, JPG, WebP, or GIF up to 5MB.');
      return;
    }
    this.error.set(null);
    this.logo.set(file);
    this.logoName.set(file.name);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.onFile(event.dataTransfer?.files.item(0) ?? null);
  }

  protected canCreate(): boolean {
    const preview = this.preview();
    return (
      this.name().trim().length > 0 &&
      preview?.outcome === 'available' &&
      preview.slug === this.slug() &&
      !this.submitting()
    );
  }

  protected async create(): Promise<void> {
    if (!this.canCreate() || this.submitting()) return;
    this.submitting.set(true);
    this.error.set(null);

    try {
      await this.workspace.found({
        name: this.name().trim(),
        slug: this.slug(),
        website: this.website(),
        logo: this.logo(),
      });
      await this.router.navigateByUrl('/leads');
    } catch (error) {
      this.error.set(shownError(error, 'Could not create the workspace.'));
      this.submitting.set(false);
    }
  }

  protected async useAnotherAccount(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }

  private queuePreview(): void {
    if (this.previewTimer) clearTimeout(this.previewTimer);
    const slug = this.slug();
    if (!slug) {
      this.preview.set({ outcome: 'invalid' });
      return;
    }
    this.previewTimer = setTimeout(() => void this.loadPreview(slug), 200);
  }

  private async loadPreview(slug: string): Promise<void> {
    const token = ++this.previewToken;
    try {
      const preview = await this.workspace.previewSlug(slug);
      if (token === this.previewToken) this.preview.set(preview);
    } catch {
      if (token === this.previewToken) this.preview.set(null);
    }
  }
}
