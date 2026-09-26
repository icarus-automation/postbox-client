import { Component, computed, inject, input } from '@angular/core';
import { HlmInput } from '@ui/input';
import { HlmLabel } from '@ui/label';
import { HlmSelectImports } from '@ui/select';
import { PostDraft } from '../post-editor/post-draft';

@Component({
  selector: 'app-heading-block',
  imports: [HlmInput, HlmLabel, HlmSelectImports],
  templateUrl: './heading-block.html',
  host: { class: 'grid gap-2' },
})
export class HeadingBlock {
  readonly blockId = input.required<string>();
  readonly preview = input(false);

  private readonly draft = inject(PostDraft);

  protected readonly block = computed(() => {
    const block = this.draft.block(this.blockId());
    return block?.kind === 'heading' ? block : null;
  });

  protected readonly levelName = (value: unknown): string => {
    if (value === 1) return 'Large';
    if (value === 2) return 'Medium';
    if (value === 3) return 'Small';
    return '';
  };

  protected setLevel(value: unknown): void {
    const block = this.block();
    if (!block || (value !== 1 && value !== 2 && value !== 3) || block.level === value) {
      return;
    }
    this.draft.updateBlock({ ...block, level: value });
  }

  protected setText(event: Event): void {
    const block = this.block();
    if (!block) {
      return;
    }
    this.draft.updateBlock({ ...block, text: (event.target as HTMLInputElement).value });
  }
}
