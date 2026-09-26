import { Injectable, computed, signal } from '@angular/core';
import type { TermRef } from '@core/blog-terms/blog-terms.types';
import { slugify } from '@core/blog-terms/slug';
import { blankBlock } from '../blocks/blank-block';
import {
  NEW_POST_ID,
  type Block,
  type BlockKind,
  type EditorPost,
  type MediaRef,
  type SavePostBody,
} from '../blog.types';
import { blankPost, followingSlug, saveBody } from '../post.document';

/**
 * The post being written. The first response fills it, and a later refetch of the same id
 * must not replace what the person is in the middle of writing. It also remembers the post
 * as the API last saved it, which is how it knows what changed.
 */
@Injectable()
export class PostDraft {
  private readonly current = signal<EditorPost | null>(null);
  private readonly saved = signal<EditorPost | null>(null);
  private loadedId: string | null = null;

  readonly post = this.current.asReadonly();
  readonly blocks = computed(() => this.post()?.blocks ?? []);

  /** The slug the API holds. On a published post, it is the address people have. */
  readonly savedSlug = computed(() => this.saved()?.slug ?? '');

  /** Something on screen differs from what the API last saved. */
  readonly dirty = computed(() => {
    const post = this.current();
    const saved = this.saved();
    return !!post && !!saved && JSON.stringify(saveBody(post)) !== JSON.stringify(saveBody(saved));
  });

  /** A published post whose link is about to change, which breaks the old address. */
  readonly movesPublishedLink = computed(() => {
    const post = this.current();
    return (
      post?.status === 'published' && post.hasCustomSlug && slugify(post.slug) !== this.savedSlug()
    );
  });

  /** Starts a post that is not saved yet, unless that is the one already here. */
  start(): void {
    if (this.loadedId === NEW_POST_ID) {
      return;
    }
    this.replace(blankPost());
  }

  load(post: EditorPost): void {
    if (this.loadedId === post.id) {
      return;
    }
    this.replace(post);
  }

  replace(post: EditorPost): void {
    this.loadedId = post.id;
    this.current.set(structuredClone(post));
    this.saved.set(structuredClone(post));
  }

  /**
   * Takes the post the API saved. Anything typed while the request was out stays on screen,
   * and only what the API decides, such as the id and the status, is taken from the answer.
   */
  settle(sent: SavePostBody, saved: EditorPost): void {
    const post = this.current();
    if (!post || JSON.stringify(saveBody(post)) === JSON.stringify(sent)) {
      this.replace(saved);
      return;
    }
    this.loadedId = saved.id;
    this.saved.set(structuredClone(saved));
    this.current.set({
      ...post,
      id: saved.id,
      status: saved.status,
      publishedAt: saved.publishedAt,
      updatedAt: saved.updatedAt,
    });
  }

  /** A publish or an unpublish. It changes the status and nothing the person is writing. */
  settleStatus(saved: EditorPost): void {
    this.saved.set(structuredClone(saved));
    this.current.update((post) =>
      post
        ? { ...post, status: saved.status, publishedAt: saved.publishedAt, updatedAt: saved.updatedAt }
        : post,
    );
  }

  block(id: string): Block | null {
    return this.current()?.blocks.find((block) => block.id === id) ?? null;
  }

  /** A draft whose slug nobody set follows its title. A published post keeps its link. */
  setTitle(title: string): void {
    this.current.update((post) => {
      if (!post) {
        return post;
      }
      const follows = !post.hasCustomSlug && post.status === 'draft';
      return { ...post, title, slug: follows ? this.titleSlug({ ...post, title }) : post.slug };
    });
  }

  /** What the person typed in the link box. Clearing it hands the link back to the title. */
  setSlug(typed: string): void {
    this.current.update((post) => {
      if (!post) {
        return post;
      }
      if (typed.trim() === '') {
        return { ...post, hasCustomSlug: false, slug: this.titleSlug(post) };
      }
      return { ...post, hasCustomSlug: true, slug: typed };
    });
  }

  /** Turns what the person typed into the slug the API will keep, once they leave the box. */
  tidySlug(): void {
    this.current.update((post) => {
      if (!post?.hasCustomSlug) {
        return post;
      }
      const slug = slugify(post.slug);
      return slug ? { ...post, slug } : { ...post, hasCustomSlug: false, slug: this.titleSlug(post) };
    });
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

  setCategory(category: TermRef | null): void {
    this.patch({ category });
  }

  setTags(tags: TermRef[]): void {
    this.patch({ tags });
  }

  updateBlock(next: Block): void {
    this.current.update((post) => {
      if (!post) {
        return post;
      }
      return {
        ...post,
        blocks: post.blocks.map((block) => (block.id === next.id ? next : block)),
      };
    });
  }

  add(kind: BlockKind): void {
    this.current.update((post) => {
      if (!post) {
        return post;
      }
      return { ...post, blocks: [...post.blocks, blankBlock(kind)] };
    });
  }

  remove(id: string): void {
    this.current.update((post) => {
      if (!post) {
        return post;
      }
      return { ...post, blocks: post.blocks.filter((block) => block.id !== id) };
    });
  }

  move(id: string, direction: -1 | 1): void {
    this.current.update((post) => {
      if (!post) {
        return post;
      }
      const index = post.blocks.findIndex((block) => block.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= post.blocks.length) {
        return post;
      }
      const blocks = post.blocks.slice();
      const [item] = blocks.splice(index, 1);
      blocks.splice(target, 0, item);
      return { ...post, blocks };
    });
  }

  /** The link a post shows when nobody set one. */
  private titleSlug(post: EditorPost): string {
    if (post.status !== 'draft') {
      return this.savedSlug();
    }
    return post.title.trim() ? followingSlug(post.title, this.savedSlug()) : '';
  }

  private patch(fields: Partial<EditorPost>): void {
    this.current.update((post) => (post ? { ...post, ...fields } : post));
  }
}
