export type EntryKind = 'post' | 'page';
export type ContentStatus = 'draft' | 'published';
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

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ProseDoc = { type: 'doc'; content: unknown[] };

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

export interface EditorEntry {
  id: string;
  kind: EntryKind;
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: MediaRef | null;
  coverImage: MediaRef | null;
  status: ContentStatus;
  publishedAt: string | null;
  blocks: Block[];
  updatedAt: string;
}

export interface ContentSummary {
  id: string;
  kind: EntryKind;
  title: string;
  slug: string;
  status: ContentStatus;
  updatedAt: string;
}

export interface ContentPage {
  data: ContentSummary[];
  meta: { total: number; page: number; limit: number; lastPage: number };
}

/** What the editor writes. Status is changed by publish and unpublish, never here. */
export interface SaveContentBody {
  title: string;
  slug: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  ogImageId: string | null;
  coverImageId: string | null;
  blocks: Block[];
}

/** A new page. Blocks are left off so the server fills the starter template. */
export interface CreateContentBody {
  kind: EntryKind;
  title: string;
  slug: string;
}

export interface ContentQuery {
  page: number;
  kind: EntryKind | null;
  status: ContentStatus | null;
}

export interface MediaUploadTicket {
  uploadUrl: string;
  storageKey: string;
  headers: Record<string, string>;
}

export function kindLabel(kind: EntryKind): string {
  return kind === 'post' ? 'Article' : 'Landing page';
}

export function statusLabel(status: ContentStatus): string {
  return status === 'draft' ? 'Draft' : 'Published';
}

export function isImageContentType(value: string): value is ImageContentType {
  return (IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}
