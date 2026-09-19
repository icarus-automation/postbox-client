import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ALL_FIELDS } from '@core/lead-fields/lead-fields.testing';
import type { LeadField } from '@core/lead-fields/lead-fields.types';
import type { LeadValue } from '../leads.types';
import { LeadFieldValue } from './lead-field-value';

const field = (key: string): LeadField => ALL_FIELDS.find((each) => each.key === key)!;

describe('LeadFieldValue', () => {
  let fixture: ComponentFixture<LeadFieldValue>;
  let el: HTMLElement;

  async function render(key: string, value: LeadValue, layout: 'cell' | 'detail' = 'detail'): Promise<string> {
    fixture.componentRef.setInput('field', field(key));
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('layout', layout);
    fixture.componentRef.setInput('leadName', 'Dana Reyes');
    await fixture.whenStable();
    return el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LeadFieldValue] }).compileComponents();

    fixture = TestBed.createComponent(LeadFieldValue);
    el = fixture.nativeElement as HTMLElement;
  });

  it('says a value is not set on the lead page and stays blank in a table', async () => {
    expect(await render('dealSize', null)).toBe('Not set');
    expect(await render('dealSize', null, 'cell')).toBe('');
  });

  it('groups the digits of a number', async () => {
    expect(await render('dealSize', 1200)).toBe('1,200');
  });

  it('shows a select value as stored', async () => {
    expect(await render('product', 'POS')).toBe('POS');
  });

  it('keeps showing a retired select option, marked as retired', async () => {
    expect(await render('tier', 'Gold')).toBe('Gold (retired)');
    expect(await render('tier', 'Silver')).toBe('Silver');
  });

  it('shows the status as its badge', async () => {
    expect(await render('status', 'contacted')).toBe('Contacted');
    expect(el.querySelector('[data-slot="badge"]')?.getAttribute('data-variant')).toBe('warning');
  });

  it('reads a date as the calendar day it names', async () => {
    expect(await render('followUp', '2026-10-01')).toBe('Oct 1, 2026');
  });

  it('shows a timestamp briefly in a table and in full on the lead page', async () => {
    expect(await render('receivedAt', '2026-09-13T16:40:41.682Z', 'cell')).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{2}:\d{2}$/);
    expect(await render('receivedAt', '2026-09-13T16:40:41.682Z')).toMatch(
      /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2}$/,
    );
  });

  it('shows a value it cannot read as a date as plain text instead of failing', async () => {
    expect(await render('followUp', 'soon')).toBe('soon');
  });

  it('clamps long text in a table and keeps its line breaks on the lead page', async () => {
    await render('signal', 'Line one\nline two', 'cell');
    expect(el.querySelector('p')?.className).toContain('line-clamp-2');

    await render('signal', 'Line one\nline two');
    expect(el.querySelector('p')?.className).toContain('whitespace-pre-line');
  });

  it('names a link in a table row after the site it opens, and says whose it is', async () => {
    await render('source', 'https://www.example.com/post', 'cell');

    const link = el.querySelector<HTMLAnchorElement>('a')!;
    expect(link.getAttribute('href')).toBe('https://www.example.com/post');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'example.com Source for Dana Reyes (opens in a new tab)',
    );
  });

  it('spells the link out on the lead page', async () => {
    await render('source', 'https://example.com/post');

    const link = el.querySelector<HTMLAnchorElement>('a')!;
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.textContent).toContain('https://example.com/post');
  });

  it('never turns a value that is not an http link into one', async () => {
    expect(await render('source', 'javascript:alert(1)')).toBe('javascript:alert(1)');
    expect(el.querySelector('a')).toBeNull();
  });
});
