import type { Term } from './blog-terms.types';

/** Spec data only. Categories as the API lists them, by name. */
export const CATEGORIES: Term[] = [
  { id: '01a1b2c3-0000-7000-8000-000000000001', name: 'Events', slug: 'events', postCount: 0 },
  { id: '01a1b2c3-0000-7000-8000-000000000002', name: 'News', slug: 'news', postCount: 3 },
];

/** Spec data only. Tags as the API lists them, by name. */
export const TAGS: Term[] = [
  { id: '01a1b2c3-0000-7000-8000-000000000011', name: 'Hiring', slug: 'hiring', postCount: 2 },
  { id: '01a1b2c3-0000-7000-8000-000000000012', name: 'Launch', slug: 'launch', postCount: 1 },
];
