import { SLUG_MAX_LENGTH, SLUG_PATTERN, slugify } from '@core/blog-terms/slug';
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
