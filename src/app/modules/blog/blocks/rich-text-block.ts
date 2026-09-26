import { Component, computed, inject, input } from '@angular/core';
import type { ProseDoc } from '../blog.types';
import { PostDraft } from '../post-editor/post-draft';
import { ProseEditor } from './prose-editor';

@Component({
  selector: 'app-rich-text-block',
  imports: [ProseEditor],
  templateUrl: './rich-text-block.html',
})
export class RichTextBlock {
  readonly blockId = input.required<string>();
  readonly preview = input(false);

  private readonly draft = inject(PostDraft);

  protected readonly block = computed(() => {
    const block = this.draft.block(this.blockId());
    return block?.kind === 'rich_text' ? block : null;
  });

  protected onDoc(change: { doc: ProseDoc; html: string }): void {
    const block = this.block();
    if (!block) {
      return;
    }
    this.draft.updateBlock({ ...block, doc: change.doc, html: change.html });
  }
}
