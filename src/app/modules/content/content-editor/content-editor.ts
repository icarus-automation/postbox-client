import { DatePipe, NgComponentOutlet } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideEye } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { apiErrorMessage, isNotFound } from '@core/api/api-error';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '@ui/alert';
import { HlmBadge } from '@ui/badge';
import { HlmButton } from '@ui/button';
import { HlmDialogImports } from '@ui/dialog';
import { HlmFieldImports } from '@ui/field';
import { HlmInput } from '@ui/input';
import { HlmSkeleton } from '@ui/skeleton';
import { HlmSpinner } from '@ui/spinner';
import { HlmTextarea } from '@ui/textarea';
import { BLOCK_EDITORS, BLOCK_MENU } from '../blocks/block-editors';
import { ImageSlot } from '../blocks/image-slot';
import { draftProblem, saveBody } from '../content.document';
import { kindLabel, statusLabel, type BlockKind, type MediaRef } from '../content.types';
import { Content } from '../services/content';
import { DocumentDraft } from './document-draft';

@Component({
  selector: 'app-content-editor',
  imports: [
    DatePipe,
    NgComponentOutlet,
    RouterLink,
    NgIcon,
    HlmAlert,
    HlmAlertDescription,
    HlmAlertTitle,
    HlmBadge,
    HlmButton,
    HlmDialogImports,
    HlmFieldImports,
    HlmInput,
    HlmSkeleton,
    HlmSpinner,
    HlmTextarea,
    ImageSlot,
  ],
  providers: [
    DocumentDraft,
    provideIcons({ lucideArrowLeft, lucideEye }),
  ],
  templateUrl: './content-editor.html',
  host: { class: 'page-standard' },
})
export class ContentEditor {
  /** The `:id` route param, bound by `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  private readonly content = inject(Content);
  protected readonly draft = inject(DocumentDraft);

  protected readonly editors = BLOCK_EDITORS;
  protected readonly blockMenu = BLOCK_MENU;
  protected readonly kindLabel = kindLabel;
  protected readonly statusLabel = statusLabel;

  protected readonly entry = this.content.byId(this.id);
  protected readonly previewing = signal(false);
  protected readonly saving = signal(false);
  protected readonly publishing = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly notFound = computed(() => isNotFound(this.entry.error()));

  protected readonly errorMessage = computed(() => {
    const error = this.entry.error();
    return error && !isNotFound(error) ? apiErrorMessage(error, 'Could not load this page.') : null;
  });

  protected readonly isLoading = computed(() => this.entry.isLoading() && !this.draft.entry());

  private readonly loaded = computed(() => (this.entry.hasValue() ? this.entry.value() : null));

  protected readonly doc = this.draft.entry;

  protected readonly canvas = computed(() => {
    const preview = this.previewing();
    return this.draft.blocks().map((block, index, all) => ({
      id: block.id,
      kind: block.kind,
      label: BLOCK_EDITORS[block.kind].label,
      first: index === 0,
      last: index === all.length - 1,
      inputs: { blockId: block.id, preview },
    }));
  });

  constructor() {
    effect(() => {
      const entry = this.loaded();
      if (entry) {
        this.draft.load(entry);
      }
    });
  }

  protected titleInput(event: Event): void {
    this.draft.setTitle((event.target as HTMLInputElement).value);
  }

  protected slugInput(event: Event): void {
    this.draft.setSlug((event.target as HTMLInputElement).value);
  }

  protected excerptInput(event: Event): void {
    this.draft.setExcerpt((event.target as HTMLTextAreaElement).value);
  }

  protected metaTitleInput(event: Event): void {
    this.draft.setMetaTitle((event.target as HTMLInputElement).value);
  }

  protected metaDescriptionInput(event: Event): void {
    this.draft.setMetaDescription((event.target as HTMLTextAreaElement).value);
  }

  protected setCover(media: MediaRef | null): void {
    this.draft.setCoverImage(media);
  }

  protected setSocial(media: MediaRef | null): void {
    this.draft.setOgImage(media);
  }

  protected add(kind: BlockKind): void {
    if (this.draft.blocks().length >= 100) {
      this.saveError.set('This page can have at most 100 sections.');
      return;
    }
    this.saveError.set(null);
    this.draft.add(kind);
  }

  protected move(id: string, direction: -1 | 1): void {
    this.draft.move(id, direction);
  }

  protected remove(id: string): void {
    this.draft.remove(id);
  }

  protected togglePreview(): void {
    this.previewing.update((value) => !value);
  }

  protected async save(): Promise<void> {
    const saved = await this.persist();
    if (saved) {
      toast.success('Saved');
    }
  }

  protected async publish(): Promise<void> {
    if (this.publishing()) {
      return;
    }
    // Publish sends the saved page, so write first or the live page would miss this writing.
    const saved = await this.persist();
    if (!saved) {
      return;
    }
    this.publishing.set(true);
    try {
      const entry = await this.content.publish(saved.id);
      this.draft.replace(entry);
      toast.success('Published');
    } catch (error) {
      this.saveError.set(apiErrorMessage(error, 'Could not publish. Try again.'));
    } finally {
      this.publishing.set(false);
    }
  }

  protected async unpublish(): Promise<void> {
    if (this.publishing()) {
      return;
    }
    const saved = await this.persist();
    if (!saved) {
      return;
    }
    this.publishing.set(true);
    try {
      const entry = await this.content.unpublish(saved.id);
      this.draft.replace(entry);
      toast.success('Unpublished');
    } catch (error) {
      this.saveError.set(apiErrorMessage(error, 'Could not unpublish. Try again.'));
    } finally {
      this.publishing.set(false);
    }
  }

  protected reload(): void {
    this.entry.reload();
  }

  private async persist() {
    const entry = this.draft.entry();
    if (!entry || this.saving()) {
      return null;
    }
    const body = saveBody(entry);
    const problem = draftProblem(body);
    if (problem) {
      this.saveError.set(problem);
      return null;
    }
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const saved = await this.content.save(entry.id, body);
      this.draft.replace(saved);
      return saved;
    } catch (error) {
      this.saveError.set(apiErrorMessage(error, 'Could not save. Try again.'));
      return null;
    } finally {
      this.saving.set(false);
    }
  }
}
