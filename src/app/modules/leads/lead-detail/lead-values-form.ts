import { type AbstractControl, type ValidationErrors, type ValidatorFn, Validators } from '@angular/forms';
import type { LeadField, LeadFieldType } from '@core/lead-fields/lead-fields.types';
import { isHttpUrl, type LeadValue } from '../leads.types';

/** The longest value the API takes per type. */
const MAX_LENGTH: Partial<Record<LeadFieldType, number>> = {
  text: 500,
  long_text: 5000,
  url: 2048,
};

/**
 * What a control starts with. Number inputs take a number or null. Everything else takes
 * a string, and an empty one stands for no value, so a select can show "Not set".
 */
export function controlValue(field: LeadField, value: LeadValue): LeadValue {
  if (field.type === 'number') {
    return typeof value === 'number' ? value : null;
  }

  return value === null ? '' : String(value);
}

/** What a control holds, in the shape the API stores: blank text and bad numbers become null. */
export function storedValue(field: LeadField, raw: unknown): LeadValue {
  if (field.type === 'number') {
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  }

  return typeof raw === 'string' && raw.trim() !== '' ? raw : null;
}

/**
 * The checks the API runs on a change, so most mistakes show before a save. Clearing a
 * required value is an error. Leaving one empty is not when the lead never had it, because
 * leads filed before the field became required may lack it.
 */
export function valueValidators(field: LeadField, current: LeadValue): ValidatorFn[] {
  const validators: ValidatorFn[] = [];

  if (field.isRequired && current !== null) {
    validators.push((control) =>
      storedValue(field, control.value) === null ? { required: true } : null,
    );
  }

  const max = MAX_LENGTH[field.type];
  if (max !== undefined) {
    validators.push(Validators.maxLength(max));
  }

  if (field.type === 'url') {
    validators.push(httpUrl);
  }

  return validators;
}

/** The same test the list and detail use to decide whether a value may become a link. */
function httpUrl(control: AbstractControl): ValidationErrors | null {
  const value: unknown = control.value;

  // A value nobody filled in is not a bad link. Required-field validation owns empty.
  if (value === null || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }

  return isHttpUrl(value) ? null : { url: true };
}

/** One line on what is wrong with a value, or null when nothing is. */
export function valueErrorMessage(field: LeadField, errors: ValidationErrors | null): string | null {
  if (!errors) {
    return null;
  }

  if (errors['required']) {
    return `${field.label} is required.`;
  }

  if (errors['url']) {
    return 'Enter a link that starts with http:// or https://.';
  }

  const maxLength = errors['maxlength'] as { requiredLength: number } | undefined;
  if (maxLength) {
    return `Use ${maxLength.requiredLength} characters or fewer.`;
  }

  return `Check the ${field.label} value.`;
}

/** The values that differ from what the lead held when editing started, ready to send. */
export function changedValues(
  fields: readonly LeadField[],
  raw: Record<string, unknown>,
  before: Record<string, LeadValue>,
): Record<string, LeadValue> {
  const changes: Record<string, LeadValue> = {};

  for (const field of fields) {
    if (!(field.key in raw)) {
      continue;
    }

    const next = storedValue(field, raw[field.key]);
    if (next !== (before[field.key] ?? null)) {
      changes[field.key] = next;
    }
  }

  return changes;
}

/** API validation lines name keys, as in `values.dealSize must be a number`. Show labels instead. */
export function withFieldLabels(message: string, fields: readonly LeadField[]): string {
  return fields.reduce(
    (text, field) => text.replaceAll(`values.${field.key} `, `${field.label} `),
    message,
  );
}
