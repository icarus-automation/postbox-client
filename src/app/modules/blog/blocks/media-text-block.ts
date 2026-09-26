import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { HlmButton } from '@ui/button';
import { HlmInput } from '@ui/input';
import { HlmLabel } from '@ui/label';
import type { ImageSide, MediaRef, ProseDoc } from '../blog.types';
import { PostDraft } from '../post-editor/post-draft';
import { ImageSlot } from './image-slot';
import { ProseEditor } from './prose-editor';

@Component({
  selector: 'app-media-text-block',
  imports: [NgTemplateOutlet, HlmButton, HlmInput, HlmLabel, ImageSlot, ProseEditor],
  templateUrl: './media-text-block.html',
  host: { class: 'grid gap-3' },
})
export class MediaTextBlock {
  readonly blockId = input.required<string>();
  readonly preview = input(false);

  private readonly draft = inject(PostDraft);

  protected readonly block = computed(() => {
    const block = this.draft.block(this.blockId());
    return block?.kind === 'media_text' ? block : null;
  });

  protected setSide(side: ImageSide): void {
    const block = this.block();
    if (!block || block.side === side) {
      return;
    }
    this.draft.updateBlock({ ...block, side });
  }

  protected setMedia(media: MediaRef | null): void {
    const block = this.block();
    if (!block) {
      return;
    }
    this.draft.updateBlock({ ...block, image: { media } });
  }

  protected setHeading(event: Event): void {
    const block = this.block();
    if (!block) {
      return;
    }
    const text = (event.target as HTMLInputElement).value;
    this.draft.updateBlock({ ...block, heading: text.length > 0 ? text : null });
  }

  protected onDoc(change: { doc: ProseDoc; html: string }): void {
    const block = this.block();
    if (!block) {
      return;
    }
    this.draft.updateBlock({ ...block, doc: change.doc, html: change.html });
  }
}
