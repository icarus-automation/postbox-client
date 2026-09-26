import { Component, computed, inject, input } from '@angular/core';
import type { MediaRef } from '../blog.types';
import { PostDraft } from '../post-editor/post-draft';
import { ImageSlot } from './image-slot';

@Component({
  selector: 'app-image-block',
  imports: [ImageSlot],
  templateUrl: './image-block.html',
})
export class ImageBlock {
  readonly blockId = input.required<string>();
  readonly preview = input(false);

  private readonly draft = inject(PostDraft);

  protected readonly block = computed(() => {
    const block = this.draft.block(this.blockId());
    return block?.kind === 'image' ? block : null;
  });

  protected setMedia(media: MediaRef | null): void {
    const block = this.block();
    if (!block) {
      return;
    }
    this.draft.updateBlock({ ...block, image: { media } });
  }
}
