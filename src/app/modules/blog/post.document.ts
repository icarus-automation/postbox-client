import { HttpErrorResponse } from '@angular/common/http';
import { SLUG_MAX_LENGTH, SLUG_PATTERN, slugProblem, slugify } from '@core/blog-terms/slug';
import { blankBlock } from './blocks/blank-block';
import { NEW_POST_ID, type Block, type EditorPost, type SavePostBody } from './blog.types';

/** What the API calls a post whose title has no letter or digit to make a slug from. */
const FALLBACK_SLUG = 'post';

/** The slug the API makes from a title. */
export function slugFromTitle(title: string): string {
  return slugify(title) || FALLBACK_SLUG;
}

/**
 * The slug a draft shows while it follows its title. The API numbers a slug that another
 * post already has, as in spring-openings-2, so a saved slug that is the title's slug with a
 * number on the end is still the one the title makes.
 */
export function followingSlug(title: string, savedSlug: string): string {
  const base = slugFromTitle(title);
  return savedSlug === base || new RegExp(`^${base}-\\d+$`).test(savedSlug) ? savedSlug : base;
}

/** A post nobody has saved yet. It starts with a place to write, and follows its title. */
export function blankPost(): EditorPost {
  return {
    id: NEW_POST_ID,
    title: '',
    slug: '',
    hasCustomSlug: false,
    excerpt: '',
    metaTitle: '',
    metaDescription: '',
    ogImage: null,
    coverImage: null,
    category: null,
    tags: [],
    status: 'draft',
    publishedAt: null,
    blocks: [blankBlock('rich_text')],
    updatedAt: '',
  };
}

export function isSlug(value: string): boolean {
  return value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value);
}

export function saveBody(post: EditorPost): SavePostBody {
  return {
    title: post.title.trim(),
    slug: post.hasCustomSlug ? slugify(post.slug) : null,
    excerpt: post.excerpt.trim(),
    metaTitle: post.metaTitle.trim(),
    metaDescription: post.metaDescription.trim(),
    ogImageId: post.ogImage?.id ?? null,
    coverImageId: post.coverImage?.id ?? null,
    categoryId: post.category?.id ?? null,
    tagIds: post.tags.map((tag) => tag.id),
    blocks: post.blocks.map(normalizeBlock),
  };
}

/** Why this post cannot be saved, in words a marketer can act on. */
export function draftProblem(body: SavePostBody): string | null {
  if (body.title.length < 1) {
    return 'Add a title.';
  }
  if (body.title.length > 200) {
    return 'Use a shorter title.';
  }
  if (body.slug !== null && !isSlug(body.slug)) {
    return 'Give the link at least one letter or number.';
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
    return 'A post can have at most 100 sections.';
  }
  if (body.blocks.some((block) => block.kind === 'heading' && block.text.trim().length < 1)) {
    return 'Add the heading text, or remove the empty heading.';
  }
  if (body.blocks.some((block) => block.kind === 'heading' && block.text.trim().length > 200)) {
    return 'Use a shorter heading.';
  }
  for (const block of body.blocks) {
    if (block.kind !== 'heading') {
      continue;
    }
    const problem = slugProblem(block.anchor ?? '');
    if (problem) {
      return problem;
    }
  }
  return null;
}

/**
 * Anchor refusals from a failed save, keyed by heading id. A line names a block by index,
 * or, with no index, the only heading. Any other line is ignored.
 */
export function headingAnchorRefusals(error: unknown, blocks: readonly Block[]): ReadonlyMap<string, string> {
  const refusals = new Map<string, string>();
  if (!(error instanceof HttpErrorResponse)) {
    return refusals;
  }
  const headings = blocks.filter((block) => block.kind === 'heading');
  for (const line of messageLines(error)) {
    const index = anchorIndex(line);
    if (index !== null) {
      const block = blocks[index];
      if (block?.kind === 'heading') {
        addRefusal(refusals, block.id, line);
      }
      continue;
    }
    if (/\banchor\b/.test(line) && headings.length === 1) {
      addRefusal(refusals, headings[0].id, line);
    }
  }
  return refusals;
}

function normalizeBlock(block: Block): Block {
  if (block.kind === 'heading') {
    const text = block.text.trim();
    const anchor = block.anchor?.trim() ?? '';
    const next = { id: block.id, kind: block.kind, level: block.level, text };
    return anchor.length > 0 ? { ...next, anchor } : next;
  }
  if (block.kind === 'media_text') {
    const heading = block.heading?.trim() ?? '';
    return { ...block, heading: heading.length > 0 ? heading : null };
  }
  return block;
}

/** `blocks.0.anchor` or `blocks[0].anchor`. Null when the line names no index. */
function anchorIndex(line: string): number | null {
  const match = /blocks\.(\d+)\.anchor\b|blocks\[(\d+)\]\.anchor\b/.exec(line);
  if (!match) {
    return null;
  }
  return Number(match[1] ?? match[2]);
}

function messageLines(error: HttpErrorResponse): string[] {
  const body = error.error as { message?: unknown } | null;
  const message = body?.message;
  if (typeof message === 'string' && message.length > 0) {
    return [message];
  }
  if (Array.isArray(message)) {
    return message.filter((line): line is string => typeof line === 'string' && line.length > 0);
  }
  return [];
}

function addRefusal(refusals: Map<string, string>, id: string, line: string): void {
  const prior = refusals.get(id);
  refusals.set(id, prior ? `${prior}. ${line}` : line);
}
