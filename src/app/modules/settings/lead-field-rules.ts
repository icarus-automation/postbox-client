import type { LeadFieldType } from '@core/lead-fields/lead-fields.types';

/** How each field type reads on screen. */
export const FIELD_TYPE_LABELS: Record<LeadFieldType, string> = {
  text: 'Text',
  long_text: 'Long text',
  number: 'Number',
  select: 'Select',
  url: 'URL',
  date: 'Date',
  datetime: 'Date and time',
};

/** A lowercase letter first, then letters and digits. The API refuses anything else. */
export const FIELD_KEY_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
export const FIELD_KEY_MAX_LENGTH = 40;
export const FIELD_LABEL_MAX_LENGTH = 80;
export const SELECT_OPTIONS_MAX = 100;
export const SELECT_OPTION_MAX_LENGTH = 80;

/**
 * A camelCase key built from a label, so "Deal size" becomes `dealSize`. Accents drop to
 * their base letter, anything else that is not a letter or digit splits words, and a key
 * never starts with a digit.
 */
export function keyFromLabel(label: string): string {
  const words = label
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word !== '');

  const key = words
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join('')
    .replace(/^[^a-z]+/, '');

  return key.slice(0, FIELD_KEY_MAX_LENGTH);
}

/** One option per line. Blank lines and the space around each option do not count. */
export function parseOptions(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** What is wrong with a select field's options, in words, or null when nothing is. */
export function optionsProblem(options: readonly string[]): string | null {
  if (options.length === 0) {
    return 'Add at least one option.';
  }

  if (options.length > SELECT_OPTIONS_MAX) {
    return `Use ${SELECT_OPTIONS_MAX} options or fewer.`;
  }

  if (options.some((option) => option.length > SELECT_OPTION_MAX_LENGTH)) {
    return `Keep each option to ${SELECT_OPTION_MAX_LENGTH} characters or fewer.`;
  }

  const repeated = options.find((option, index) => options.indexOf(option) !== index);
  if (repeated !== undefined) {
    return `"${repeated}" is listed more than once.`;
  }

  return null;
}
