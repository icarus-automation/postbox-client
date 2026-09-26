/** Lowercase letters and digits, joined by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_MAX_LENGTH = 200;

/**
 * The slug the API makes from a title or a name: accents fold to the base letter and
 * anything that is not a letter or a digit becomes a hyphen. Empty when the text has no
 * letter or digit a web address can carry.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/, '');
}
