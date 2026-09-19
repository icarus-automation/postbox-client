import { ALL_FIELDS, CUSTOM_FIELDS, SYSTEM_FIELDS } from '@core/lead-fields/lead-fields.testing';
import type { LeadField } from '@core/lead-fields/lead-fields.types';
import { LEAD, leadWith } from './leads.testing';
import {
  DEFAULT_COLUMN_LIMIT,
  defaultColumnKeys,
  isHttpUrl,
  isRetiredOption,
  leadStatusLabel,
  leadTitle,
  linkHost,
  titleField,
} from './leads.types';

const field = (key: string): LeadField => ALL_FIELDS.find((each) => each.key === key)!;

describe('lead helpers', () => {
  it('names a lead after the first text field in position order', () => {
    expect(titleField(ALL_FIELDS)?.key).toBe('candidate');
    expect(leadTitle(LEAD, ALL_FIELDS)).toBe('Dana Reyes');
  });

  it('follows the definitions when a text field moves ahead of the candidate', () => {
    const nickname: LeadField = { ...CUSTOM_FIELDS[0], key: 'nickname', label: 'Nickname', type: 'text' };
    const fields = [nickname, ...SYSTEM_FIELDS];

    expect(leadTitle(leadWith({ nickname: 'Dee' }), fields)).toBe('Dee');
  });

  it('calls a lead with no name something a person can still click', () => {
    expect(leadTitle(leadWith({ candidate: null }), ALL_FIELDS)).toBe('Untitled lead');
    expect(leadTitle(LEAD, [])).toBe('Untitled lead');
  });

  it('spots a select value the field no longer offers', () => {
    expect(isRetiredOption(field('tier'), 'Gold')).toBe(true);
    expect(isRetiredOption(field('tier'), 'Silver')).toBe(false);
    expect(isRetiredOption(field('tier'), null)).toBe(false);
    expect(isRetiredOption(field('candidate'), 'Gold')).toBe(false);
  });

  it('only treats http and https values as links', () => {
    expect(isHttpUrl('https://example.com/post')).toBe(true);
    expect(isHttpUrl('http://example.com')).toBe(true);
    expect(isHttpUrl('  https://example.com/post  ')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('ftp://example.com/file')).toBe(false);
    expect(isHttpUrl(42)).toBe(false);
    expect(isHttpUrl(null)).toBe(false);
  });

  it('refuses anything the URL parser cannot read', () => {
    expect(isHttpUrl('https://')).toBe(false);
    expect(isHttpUrl('not a link')).toBe(false);
    expect(isHttpUrl('example.com')).toBe(false);
    expect(isHttpUrl('')).toBe(false);
  });

  it('opens the table on the short fields and leaves long text and links off it', () => {
    expect(defaultColumnKeys(SYSTEM_FIELDS)).toEqual(['candidate', 'product', 'status', 'receivedAt']);
    expect(defaultColumnKeys(ALL_FIELDS)).toEqual([
      'candidate',
      'product',
      'status',
      'receivedAt',
      'dealSize',
    ]);
    expect(defaultColumnKeys(ALL_FIELDS).length).toBe(DEFAULT_COLUMN_LIMIT);
    expect(defaultColumnKeys([])).toEqual([]);
  });

  it('keeps the name column even when the limit is used up before it', () => {
    const numbers: LeadField[] = Array.from({ length: DEFAULT_COLUMN_LIMIT }, (_, index) => ({
      ...CUSTOM_FIELDS[0],
      id: `number-${index}`,
      key: `number${index}`,
      type: 'number',
      position: index,
    }));

    expect(defaultColumnKeys([...numbers, field('candidate')])).toContain('candidate');
  });

  it('names a link after the site it opens', () => {
    expect(linkHost('https://www.facebook.com/groups/indiefounders/posts/1')).toBe('facebook.com');
    expect(linkHost('  https://example.com  ')).toBe('example.com');
    expect(linkHost('not a link')).toBe('not a link');
  });

  it('labels a status in sentence case', () => {
    expect(['new', 'contacted', 'qualified'].map(leadStatusLabel)).toEqual([
      'New',
      'Contacted',
      'Qualified',
    ]);
  });
});
