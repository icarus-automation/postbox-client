import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CUSTOM_FIELDS, SYSTEM_FIELDS } from '@core/lead-fields/lead-fields.testing';
import { environment } from '@env/environment';
import { LeadFieldList } from './lead-field-list';

const FIELDS_URL = `${environment.apiBaseUrl}/leads/fields`;

describe('LeadFieldList', () => {
  let fixture: ComponentFixture<LeadFieldList>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim();
  const headers = () => [...el.querySelectorAll('thead th')].map((th) => text(th));
  const rows = () =>
    [...el.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('th, td')].map((cell) => text(cell)));

  /** The add form lives in an overlay, so it is never inside the page element. */
  const dialog = () => document.querySelector<HTMLElement>('[data-slot="dialog-content"]');

  function button(name: string): HTMLButtonElement {
    return [...el.querySelectorAll<HTMLButtonElement>('button')].find((each) => text(each) === name)!;
  }

  async function openAddField(): Promise<void> {
    button('Add field').click();
    await fixture.whenStable();
  }

  /** Names a field in the open dialog and submits it, letting the generated key settle first. */
  async function addField(label: string): Promise<void> {
    const input = dialog()!.querySelector<HTMLInputElement>('#lead-field-label')!;
    input.value = label;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    dialog()!.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeadFieldList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LeadFieldList);
    el = fixture.nativeElement as HTMLElement;
    TestBed.tick();
  });

  it('uses the standard page width', () => {
    expect(el.classList).toContain('page-standard');
  });

  it('lists every field with its type and whether a new lead has to carry it', async () => {
    http.expectOne(FIELDS_URL).flush(SYSTEM_FIELDS);
    await fixture.whenStable();

    expect(headers()).toEqual(['Field', 'Type', 'Required on new leads', 'Key']);
    expect(rows()).toEqual([
      ['Contact Built-in', 'Text', 'Yes', 'candidate'],
      ['Product Built-in', 'Select', 'Yes', 'product'],
      ['Source Built-in', 'URL', 'Yes', 'source'],
      ['What they said Built-in', 'Long text', 'Yes', 'signal'],
      ['Why this is a lead Built-in', 'Long text', 'Yes', 'whyLead'],
      ['Status Built-in Automatic', 'Select', 'Not applicable', 'status'],
      ['Received Built-in Automatic', 'Date and time', 'Not applicable', 'receivedAt'],
    ]);
  });

  it('leaves what a select offers out of the table, so every row is one height', async () => {
    http.expectOne(FIELDS_URL).flush(SYSTEM_FIELDS);
    await fixture.whenStable();

    const table = el.querySelector('table')!;
    expect(text(table)).not.toContain('POS');
    expect(text(table)).not.toContain('qualified');
  });

  it('marks only the fields that ship with the account as built-in', async () => {
    http.expectOne(FIELDS_URL).flush([...SYSTEM_FIELDS, ...CUSTOM_FIELDS]);
    await fixture.whenStable();

    expect(rows().slice(SYSTEM_FIELDS.length)).toEqual([
      ['Deal size', 'Number', 'No', 'dealSize'],
      ['Tier', 'Select', 'No', 'tier'],
      ['Follow up', 'Date', 'No', 'followUp'],
    ]);
  });

  it('shows every key in the table, with nothing to open first', async () => {
    http.expectOne(FIELDS_URL).flush(SYSTEM_FIELDS);
    await fixture.whenStable();

    expect(headers()).toContain('Key');
    expect(text(el.querySelector('table'))).toContain('candidate');
    expect(el.querySelector('details')).toBeNull();
  });

  it('adds a field from a dialog, then closes it and says what happened', async () => {
    http.expectOne(FIELDS_URL).flush(SYSTEM_FIELDS);
    await fixture.whenStable();

    expect(dialog()).toBeNull();

    await openAddField();
    expect(text(dialog())).toContain('Add field');

    // The dialog is named after the form's heading, so the form needs no dialog of its own.
    const container = document.querySelector('[role="dialog"]')!;
    expect(container.getAttribute('aria-labelledby')).toBe('add-lead-field-heading');
    expect(document.getElementById('add-lead-field-heading')?.textContent?.trim()).toBe('Add field');

    await addField('Deal size');
    http.expectOne({ url: FIELDS_URL, method: 'POST' }).flush({ ...CUSTOM_FIELDS[0], type: 'text' });

    await vi.waitFor(() => {
      expect(rows().at(-1)).toEqual(['Deal size', 'Text', 'No', 'dealSize']);
    });
    await vi.waitFor(() => expect(dialog()).toBeNull());
    expect(text(el.querySelector('p[role="status"]'))).toBe('Added Deal size.');
    http.verify();
  });

  it('passes the keys in use to the dialog, so a clash shows before a request', async () => {
    http.expectOne(FIELDS_URL).flush(SYSTEM_FIELDS);
    await fixture.whenStable();

    await openAddField();
    await addField('Product');

    http.expectNone({ url: FIELDS_URL, method: 'POST' });
    const keyError = dialog()!.querySelector('#lead-field-key-error')!;
    expect(keyError.hasAttribute('hidden')).toBe(false);
    expect(text(keyError)).toBe('Another field already uses this key.');
  });

  it('closes the dialog without adding anything when it is dismissed', async () => {
    http.expectOne(FIELDS_URL).flush(SYSTEM_FIELDS);
    await fixture.whenStable();

    await openAddField();
    [...dialog()!.querySelectorAll<HTMLButtonElement>('button')]
      .find((each) => text(each) === 'Cancel')!
      .click();

    await vi.waitFor(() => expect(dialog()).toBeNull());
    expect(rows().length).toBe(SYSTEM_FIELDS.length);
    expect(text(el.querySelector('p[role="status"]'))).toBe('');
    http.verify();
  });

  it('surfaces a failure with a way to try again, and nothing to add to', async () => {
    http.expectOne(FIELDS_URL).flush(
      { statusCode: 500, message: 'Database error' },
      { status: 500, statusText: 'Server Error' },
    );
    await fixture.whenStable();

    const alert = el.querySelector('[role="alert"]')!;
    expect(text(alert)).toContain('Could not load lead fields');
    expect(text(alert)).toContain('Database error');
    expect(button('Add field')).toBeUndefined();

    alert.querySelector('button')!.click();
    TestBed.tick();

    expect(http.expectOne(FIELDS_URL).request.method).toBe('GET');
  });
});
