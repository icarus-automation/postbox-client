import { Injectable, computed, signal } from '@angular/core';
import { blankBlock } from '../blocks/blank-block';
import type { Block, BlockKind, EditorEntry, MediaRef } from '../content.types';

/**
 * The page being written. The first response fills it. A later refetch of the same id
 * must not replace what the person is in the middle of writing.
 */
@Injectable()
export class DocumentDraft {
  private readonly current = signal<EditorEntry | null>(null);
  private loadedId: string | null = null;

  readonly entry = this.current.asReadonly();
  readonly blocks = computed(() => this.entry()?.blocks ?? []);

  load(entry: EditorEntry): void {
    if (this.loadedId === entry.id) {
      return;
    }
    this.replace(entry);
  }

  replace(entry: EditorEntry): void {
    this.loadedId = entry.id;
    this.current.set(structuredClone(entry));
  }

  block(id: string): Block | null {
    return this.current()?.blocks.find((block) => block.id === id) ?? null;
  }

  setTitle(title: string): void {
    this.patch({ title });
  }

  setSlug(slug: string): void {
    this.patch({ slug });
  }

  setExcerpt(excerpt: string): void {
    this.patch({ excerpt });
  }

  setMetaTitle(metaTitle: string): void {
    this.patch({ metaTitle });
  }

  setMetaDescription(metaDescription: string): void {
    this.patch({ metaDescription });
  }

  setCoverImage(coverImage: MediaRef | null): void {
    this.patch({ coverImage });
  }

  setOgImage(ogImage: MediaRef | null): void {
    this.patch({ ogImage });
  }

  updateBlock(next: Block): void {
    this.current.update((entry) => {
      if (!entry) {
        return entry;
      }
      return {
        ...entry,
        blocks: entry.blocks.map((block) => (block.id === next.id ? next : block)),
      };
    });
  }

  add(kind: BlockKind): void {
    this.current.update((entry) => {
      if (!entry) {
        return entry;
      }
      return { ...entry, blocks: [...entry.blocks, blankBlock(kind)] };
    });
  }

  remove(id: string): void {
    this.current.update((entry) => {
      if (!entry) {
        return entry;
      }
      return { ...entry, blocks: entry.blocks.filter((block) => block.id !== id) };
    });
  }

  move(id: string, direction: -1 | 1): void {
    this.current.update((entry) => {
      if (!entry) {
        return entry;
      }
      const index = entry.blocks.findIndex((block) => block.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= entry.blocks.length) {
        return entry;
      }
      const blocks = entry.blocks.slice();
      const [item] = blocks.splice(index, 1);
      blocks.splice(target, 0, item);
      return { ...entry, blocks };
    });
  }

  private patch(fields: Partial<EditorEntry>): void {
    this.current.update((entry) => (entry ? { ...entry, ...fields } : entry));
  }
}
