import { FormControl } from '@angular/forms';
import { ALL_FIELDS } from '@core/lead-fields/lead-fields.testing';
import type { LeadField } from '@core/lead-fields/lead-fields.types';
import { LEAD } from '../leads.testing';
import type { LeadValue } from '../leads.types';
import {
  changedValues,
  controlValue,
  storedValue,
  valueErrorMessage,
  valueValidators,
  withFieldLabels,
} from './lead-values-form';

const field = (key: string): LeadField => ALL_FIELDS.find((each) => each.key === key)!;

function errorsFor(key: string, current: LeadValue, next: LeadValue) {
  const control = new FormControl<LeadValue>(next, { validators: valueValidators(field(key), current) });
  return control.errors;
}

describe('lead value form rules', () => {
  it('starts number controls on a number and every other control on a string', () => {
    expect(controlValue(field('dealSize'), 1200)).toBe(1200);
    expect(controlValue(field('dealSize'), null)).toBeNull();
    expect(controlValue(field('tier'), null)).toBe('');
    expect(controlValue(field('candidate'), 'Dana')).toBe('Dana');
  });

  it('stores blank text and a missing number as null', () => {
    expect(storedValue(field('candidate'), '   ')).toBeNull();
    expect(storedValue(field('candidate'), ' Dana ')).toBe(' Dana ');
    expect(storedValue(field('dealSize'), null)).toBeNull();
    expect(storedValue(field('dealSize'), Number.NaN)).toBeNull();
    expect(storedValue(field('dealSize'), 0)).toBe(0);
  });

  it('refuses to clear a required value but lets a never-filled one stay empty', () => {
    expect(errorsFor('candidate', 'Dana', '')).toEqual({ required: true });
    expect(errorsFor('candidate', null, '')).toBeNull();
    expect(errorsFor('tier', 'Gold', '')).toBeNull();
  });

  it('holds text to the lengths the API takes', () => {
    expect(errorsFor('candidate', 'Dana', 'x'.repeat(501))?.['maxlength']).toBeTruthy();
    expect(errorsFor('candidate', 'Dana', 'x'.repeat(500))).toBeNull();
    expect(errorsFor('signal', 'Hi', 'x'.repeat(5001))?.['maxlength']).toBeTruthy();
  });

  it('only takes http and https links', () => {
    expect(errorsFor('source', 'https://a.test', 'https://example.com/post')).toBeNull();
    expect(errorsFor('source', 'https://a.test', 'http://example.com')).toBeNull();
    expect(errorsFor('source', 'https://a.test', 'ftp://example.com')).toEqual({ url: true });
    expect(errorsFor('source', 'https://a.test', 'javascript:alert(1)')).toEqual({ url: true });
    expect(errorsFor('source', 'https://a.test', 'not a link')).toEqual({ url: true });
    expect(errorsFor('source', 'https://a.test', 'https://')).toEqual({ url: true });
  });

  it('leaves an optional link that was never filled in alone', () => {
    // `source` is required, so ask a field that is not: an empty box is not a bad link.
    expect(errorsFor('source', null, '')).toBeNull();
    expect(errorsFor('source', null, '   ')).toBeNull();
  });

  it('says what is wrong in words', () => {
    expect(valueErrorMessage(field('candidate'), { required: true })).toBe('Contact is required.');
    expect(valueErrorMessage(field('source'), { url: true })).toBe('Enter a link that starts with http:// or https://.');
    expect(valueErrorMessage(field('candidate'), { maxlength: { requiredLength: 500, actualLength: 501 } })).toBe(
      'Use 500 characters or fewer.',
    );
    expect(valueErrorMessage(field('candidate'), null)).toBeNull();
  });

  it('picks out only the values that changed', () => {
    const fields = ALL_FIELDS.filter((each) => !each.isReadOnly);
    const raw = {
      candidate: 'Dana Reyes',
      product: 'POS',
      tier: 'Gold',
      dealSize: 2500,
      followUp: '',
    };

    expect(changedValues(fields, raw, LEAD.values)).toEqual({ dealSize: 2500, followUp: null });
  });

  it('names fields by label in messages from the API', () => {
    expect(
      withFieldLabels('values.dealSize must be a number. values.tier must be one of: Silver, Bronze', ALL_FIELDS),
    ).toBe('Deal size must be a number. Tier must be one of: Silver, Bronze');
  });
});
