import type { Term } from './blog-terms.types';

/** The list with `term` in it once, in name order, the way the API sorts it. */
export function withTerm(list: readonly Term[], term: Term): Term[] {
  return [...list.filter((item) => item.id !== term.id), term].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
