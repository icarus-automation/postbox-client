import type { LeadField, LeadFieldType } from '@core/lead-fields/lead-fields.types';

/** A stored value. `number` fields hold numbers, every other type a string, and unset fields null. */
export type LeadValue = string | number | null;

/**
 * One lead: an id, a value per field key, whether it is archived, and timestamps. Which
 * keys exist, and what they mean, comes from the field definitions, never from this type.
 */
export interface Lead {
  id: string;
  /** Every current field key in position order, with null where the lead has no value. */
  values: Record<string, LeadValue>;
  /**
   * Out of the inbox. It sits beside `values`, not inside them, because archiving is not a
   * stage: an archived lead keeps the status it reached and comes back at it.
   */
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  lastPage: number;
}

export interface LeadPage {
  data: Lead[];
  meta: PageMeta;
}

/**
 * The read-only system select that only `PATCH /leads/:id/status` changes, and the one
 * the inbox filters on. Field keys never change, so this is safe to name.
 */
export const STATUS_KEY = 'status';

/** Sentence case label for a status value, for screens and screen readers alike. */
export function leadStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * The field that names a lead: the first text field in position order. The system
 * `candidate` field is text and cannot be deleted, so there is always one.
 */
export function titleField(fields: readonly LeadField[]): LeadField | null {
  return fields.find((field) => field.type === 'text') ?? null;
}

/** What to call a lead on screen. */
export function leadTitle(lead: Lead, fields: readonly LeadField[]): string {
  const field = titleField(fields);
  const value = field ? lead.values[field.key] : null;
  return typeof value === 'string' && value.trim() !== '' ? value : 'Untitled lead';
}

/**
 * The types that read well in a table cell. Long text and links need room, so the inbox
 * leaves them to the lead page until someone asks for the column.
 */
const SHORT_TYPES: readonly LeadFieldType[] = ['text', 'select', 'number', 'date', 'datetime'];

export function isShortField(field: LeadField): boolean {
  return SHORT_TYPES.includes(field.type);
}

/** How many columns the inbox opens with, so the default set never scrolls sideways. */
export const DEFAULT_COLUMN_LIMIT = 5;

/**
 * The columns a person sees before they pick their own: the short fields in position
 * order, up to the limit. The name column is always one of them, so every row can link to
 * its lead even when the limit is used up before the first text field.
 */
export function defaultColumnKeys(fields: readonly LeadField[]): string[] {
  const title = titleField(fields);
  const columns = fields.filter(isShortField).slice(0, DEFAULT_COLUMN_LIMIT);

  if (title && !columns.includes(title)) {
    columns.unshift(title);
  }

  return columns.map((field) => field.key);
}

/**
 * A select value the field no longer offers. Removing an option archives it: leads that
 * hold it keep it, and new writes refuse it.
 */
export function isRetiredOption(field: LeadField, value: LeadValue): value is string {
  return field.type === 'select' && typeof value === 'string' && !field.options.includes(value);
}

/**
 * True for a value that is safe to put in an href. The platform parser decides, because a
 * prefix check calls `https://` a link and misses nothing else that is wrong with it.
 */
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const { protocol } = new URL(value.trim());
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * The site a link points at, so a control can say where it goes instead of reading "Open".
 * Falls back to the value itself, which only happens on something `isHttpUrl` refused.
 */
export function linkHost(value: string): string {
  try {
    return new URL(value.trim()).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}
