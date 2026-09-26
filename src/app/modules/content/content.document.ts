import {
  SLUG_PATTERN,
  type Block,
  type CreateContentBody,
  type EditorEntry,
  type EntryKind,
  type SaveContentBody,
} from './content.types';

/** A web address from a title: lowercase, hyphenated, letters and digits only. */
export function slugFromTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function isSlug(value: string): boolean {
  return value.length <= 200 && SLUG_PATTERN.test(value);
}

/**
 * The create body. It has no `blocks` property: the server fills the article or
 * landing-page template when that field is omitted.
 */
export function starterBody(kind: EntryKind, title: string): CreateContentBody {
  const trimmed = title.trim();
  return { kind, title: trimmed, slug: slugFromTitle(trimmed) };
}

/** Why a title cannot start a page, or null when `starterBody` is safe to send. */
export function starterProblem(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) {
    return 'Add a title.';
  }
  if (trimmed.length > 200) {
    return 'Use a shorter title.';
  }
  if (!isSlug(slugFromTitle(trimmed))) {
    return 'Use a title with letters or numbers so the page has an address.';
  }
  return null;
}

export function saveBody(entry: EditorEntry): SaveContentBody {
  return {
    title: entry.title.trim(),
    slug: entry.slug.trim(),
    excerpt: entry.excerpt.trim(),
    metaTitle: entry.metaTitle.trim(),
    metaDescription: entry.metaDescription.trim(),
    ogImageId: entry.ogImage?.id ?? null,
    coverImageId: entry.coverImage?.id ?? null,
    blocks: entry.blocks.map(normalizeBlock),
  };
}

/** Why this draft cannot be saved, in words a marketer can act on. */
export function draftProblem(body: SaveContentBody): string | null {
  if (body.title.length < 1 || body.title.length > 200) {
    return 'Add a title.';
  }
  if (!isSlug(body.slug)) {
    return 'The link can use letters, numbers, and hyphens.';
  }
  if (body.excerpt.length > 500) {
    return 'Use a shorter summary.';
  }
  if (body.metaTitle.length > 200) {
    return 'Use a shorter search title.';
  }
  if (body.metaDescription.length > 500) {
    return 'Use a shorter search description.';
  }
  if (body.blocks.length > 100) {
    return 'This page can have at most 100 sections.';
  }
  if (body.blocks.some((block) => block.kind === 'heading' && block.text.trim().length < 1)) {
    return 'Add the heading text, or remove the empty heading.';
  }
  if (body.blocks.some((block) => block.kind === 'heading' && block.text.trim().length > 200)) {
    return 'Use a shorter heading.';
  }
  return null;
}

function normalizeBlock(block: Block): Block {
  if (block.kind === 'heading') {
    return { ...block, text: block.text.trim() };
  }
  if (block.kind === 'media_text') {
    const heading = block.heading?.trim() ?? '';
    return { ...block, heading: heading.length > 0 ? heading : null };
  }
  return block;
}
