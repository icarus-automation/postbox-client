import type { TermRef } from '@core/blog-terms/blog-terms.types';
import { slugify } from '@core/blog-terms/slug';

/** The API refuses longer names. */
const NAME_MAX_LENGTH = 80;

/**
 * The name the person typed, tidied, when it can be added: no category or tag has it yet, in
 * any case, and it has a letter or a number to make a slug from. Null otherwise.
 */
export function newTermName(search: string, terms: readonly TermRef[]): string | null {
  const name = search.trim().replace(/\s+/g, ' ');
  if (!name || name.length > NAME_MAX_LENGTH || !slugify(name)) {
    return null;
  }
  const lower = name.toLocaleLowerCase();
  return terms.some((term) => term.name.toLocaleLowerCase() === lower) ? null : name;
}

/** The option that adds a name. It has no id until the API saves it. */
export function newTerm(name: string): TermRef {
  return { id: '', name, slug: '' };
}

export function isNewTerm(term: TermRef): boolean {
  return term.id === '';
}

export function termRef(term: TermRef): TermRef {
  return { id: term.id, name: term.name, slug: term.slug };
}

export const termName = (term: TermRef): string => term.name;

/** Saved terms match by id. The option that adds a name only matches itself. */
export const sameTerm = (a: TermRef | null | undefined, b: TermRef | null | undefined): boolean =>
  a === b || (!!a && !!b && !isNewTerm(a) && a.id === b.id);
