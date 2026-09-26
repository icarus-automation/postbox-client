import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImagePlus } from '@ng-icons/lucide';
import { apiErrorMessage } from '@core/api/api-error';
import { HlmAlert, HlmAlertDescription } from '@ui/alert';
import { HlmButton } from '@ui/button';
import { HlmInput } from '@ui/input';
import { HlmLabel } from '@ui/label';
import { HlmSpinner } from '@ui/spinner';
import {
  MAX_IMAGE_BYTES,
  isImageContentType,
  type MediaRef,
} from '../content.types';
import { Media } from '../services/media';

let nextId = 0;

@Component({
  selector: 'app-image-slot',
  imports: [NgIcon, HlmAlert, HlmAlertDescription, HlmButton, HlmInput, HlmLabel, HlmSpinner],
  providers: [provideIcons({ lucideImagePlus })],
  templateUrl: './image-slot.html',
  host: { class: 'grid gap-2' },
})
export class ImageSlot {
  readonly media = input<MediaRef | null>(null);
  readonly mediaChange = output<MediaRef | null>();

  private readonly uploads = inject(Media);
  private readonly fieldId = `image-alt-${nextId++}`;

  protected readonly altId = this.fieldId;
  protected readonly fileId = `${this.fieldId}-file`;
  protected readonly alt = linkedSignal(() => this.media()?.alt ?? '');
  protected readonly uploading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected altInput(event: Event): void {
    this.alt.set((event.target as HTMLInputElement).value);
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploading()) {
      return;
    }

    const alt = this.alt().trim();
    if (!alt) {
      this.error.set('Describe the image before uploading it.');
      return;
    }
    if (!isImageContentType(file.type)) {
      this.error.set('Use a JPEG, PNG, WebP, or GIF.');
      return;
    }
    if (file.size < 1 || file.size > MAX_IMAGE_BYTES) {
      this.error.set('Use an image under 5 MB.');
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    try {
      const media = await this.uploads.upload(file, alt, file.type);
      this.mediaChange.emit(media);
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse
          ? apiErrorMessage(error, 'Could not save the image.')
          : 'Could not upload the image. Try again.',
      );
    } finally {
      this.uploading.set(false);
    }
  }

  protected remove(): void {
    this.error.set(null);
    this.mediaChange.emit(null);
  }
}
