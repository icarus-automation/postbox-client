const SLUG_MAX_LENGTH = 40;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Same grammar as the server parse. The field shows this string, and the server stores it unchanged. */
export function claimableSlug(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');

  return SLUG_PATTERN.test(slug) ? slug : '';
}
