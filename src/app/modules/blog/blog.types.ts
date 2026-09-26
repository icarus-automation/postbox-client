import type { TermRef } from '@core/blog-terms/blog-terms.types';

export type PostStatus = 'draft' | 'published';
export type ImageSide = 'image_left' | 'image_right';
export type HeadingLevel = 1 | 2 | 3;
export type ImageContentType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
export type BlockKind = 'rich_text' | 'image' | 'media_text' | 'heading' | 'divider';

export const IMAGE_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const satisfies readonly ImageContentType[];

/** The API rejects anything larger. */
export const MAX_IMAGE_BYTES = 5_000_000;

/** The route id of a post that is not saved yet. */
export const NEW_POST_ID = 'new';

export interface ProseDoc {
  type: 'doc';
  content: unknown[];
}

export const EMPTY_DOC: ProseDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

export interface MediaRef {
  id: string;
  url: string;
  alt: string;
  contentType: ImageContentType;
}

export type ImageSlot = { media: null } | { media: MediaRef };

export type Block =
  | { id: string; kind: 'rich_text'; doc: ProseDoc; html: string }
  | { id: string; kind: 'image'; image: ImageSlot }
  | {
      id: string;
      kind: 'media_text';
      side: ImageSide;
      image: ImageSlot;
      heading: string | null;
      doc: ProseDoc;
      html: string;
    }
  | { id: string; kind: 'heading'; level: HeadingLevel; text: string }
  | { id: string; kind: 'divider' };

export interface EditorPost {
  id: string;
  title: string;
  slug: string;
  /** False while the slug is made from the title. A draft's slug follows its title until then. */
  hasCustomSlug: boolean;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: MediaRef | null;
  coverImage: MediaRef | null;
  category: TermRef | null;
  tags: TermRef[];
  status: PostStatus;
  publishedAt: string | null;
  blocks: Block[];
  updatedAt: string;
}

/** A row of the post list. The body stays on the server. */
export interface PostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: TermRef | null;
  tags: TermRef[];
  status: PostStatus;
  publishedAt: string | null;
  updatedAt: string;
}

export interface PostPage {
  data: PostSummary[];
  meta: { total: number; page: number; limit: number; lastPage: number };
}

/**
 * What the editor writes, for a new post and a saved one alike. Status is changed by publish
 * and unpublish, never here.
 */
export interface SavePostBody {
  title: string;
  /** A slug the person typed, or null to keep the one made from the title. */
  slug: string | null;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  ogImageId: string | null;
  coverImageId: string | null;
  categoryId: string | null;
  tagIds: string[];
  blocks: Block[];
}

export interface PostQuery {
  page: number;
  status: PostStatus | null;
  /** A category slug. */
  category: string | null;
  /** A tag slug. */
  tag: string | null;
  /** Part of a title. */
  search: string | null;
}

export interface MediaUploadTicket {
  uploadUrl: string;
  storageKey: string;
  headers: Record<string, string>;
}

export function statusLabel(status: PostStatus): string {
  return status === 'draft' ? 'Draft' : 'Published';
}

export function isImageContentType(value: string): value is ImageContentType {
  return (IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}
