/** A post has one category at most, and any number of tags. */
export type TermKind = 'category' | 'tag';

/** A category or a tag, as a post carries it. */
export interface TermRef {
  id: string;
  name: string;
  /** Made from the name. Unique per organization, and the site filters by it. */
  slug: string;
}

/** A category or a tag in the organization's list. */
export interface Term extends TermRef {
  /** Posts that use it, drafts included. */
  postCount: number;
}
