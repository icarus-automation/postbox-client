import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_FIELDS } from '@core/lead-fields/lead-fields.testing';
import type { LeadField } from '@core/lead-fields/lead-fields.types';
import { environment } from '@env/environment';
import { AddLeadField } from './add-lead-field';

const FIELDS_URL = `${environment.apiBaseUrl}/leads/fields`;

describe('AddLeadField', () => {
  let fixture: ComponentFixture<AddLeadField>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let added: LeadField[];

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim();
  const input = (id: string) => el.querySelector<HTMLInputElement>(`#${id}`)!;

  /** The message a field is showing, or null while its error is hidden. */
  function fieldError(id: string): string | null {
    const node = el.querySelector(`#${id}`);
    return !node || node.hasAttribute('hidden') ? null : text(node)!;
  }

  async function type(id: string, value: string): Promise<void> {
    const target = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
    target.value = value;
    target.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  /** Opens the type list, which is portaled into an overlay rather than into the form. */
  async function openTypes(): Promise<HTMLElement[]> {
    el.querySelector<HTMLButtonElement>('#lead-field-type')!.click();
    await fixture.whenStable();

    return [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
  }

  /** Picks a type by the name on screen. Picking one closes the list. */
  async function choose(label: string): Promise<void> {
    (await openTypes()).find((item) => text(item) === label)!.click();
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddLeadField],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AddLeadField);
    fixture.componentRef.setInput('takenKeys', ['candidate', 'product', 'status']);
    added = [];
    fixture.componentInstance.added.subscribe((field) => added.push(field));
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  it('labels every control it shows', () => {
    for (const [id, name] of [
      ['lead-field-label', 'Label'],
      ['lead-field-key', 'Key'],
      ['lead-field-type', 'Type'],
      ['lead-field-required', 'Required on new leads'],
    ]) {
      expect(text(el.querySelector(`label[for="${id}"]`))).toBe(name);
      expect(el.querySelector(`#${id}`)).toBeTruthy();
    }
  });

  it('offers every type a custom field can have', async () => {
    expect((await openTypes()).map((option) => text(option))).toEqual([
      'Text',
      'Long text',
      'Number',
      'Select',
      'URL',
      'Date',
    ]);
  });

  it('fills the key from the label until the person types their own', async () => {
    await type('lead-field-label', 'Deal size');
    expect(input('lead-field-key').value).toBe('dealSize');

    await type('lead-field-key', 'amount');
    await type('lead-field-label', 'Deal value');
    expect(input('lead-field-key').value).toBe('amount');
  });

  it('follows the label again once the key is cleared', async () => {
    await type('lead-field-label', 'Deal size');
    await type('lead-field-key', 'amount');

    await type('lead-field-key', '');
    expect(input('lead-field-key').value).toBe('dealSize');

    await type('lead-field-label', 'Deal value');
    expect(input('lead-field-key').value).toBe('dealValue');
  });

  it('adds a field with the label, key, type and required flag', async () => {
    await type('lead-field-label', 'Deal size');
    await choose('Number');
    el.querySelector<HTMLButtonElement>('#lead-field-required')!.click();
    await submit();

    const request = http.expectOne(FIELDS_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ key: 'dealSize', label: 'Deal size', type: 'number', isRequired: true });

    request.flush({ ...CUSTOM_FIELDS[0], isRequired: true });

    await vi.waitFor(() => {
      expect(added.map((field) => field.key)).toEqual(['dealSize']);
    });
    expect(input('lead-field-label').value).toBe('');
    expect(input('lead-field-key').value).toBe('');
  });

  it('keeps the key in an Advanced section that is always there to read', () => {
    const advanced = el.querySelector('section[aria-labelledby="add-lead-field-advanced"]')!;

    expect(text(el.querySelector('#add-lead-field-advanced'))).toBe('Advanced');
    expect(advanced.contains(input('lead-field-key'))).toBe(true);
    expect(el.querySelector('details')).toBeNull();
  });

  it('asks to be dismissed rather than closing itself', () => {
    let dismissed = 0;
    fixture.componentInstance.dismissed.subscribe(() => (dismissed += 1));

    [...el.querySelectorAll<HTMLButtonElement>('button')].find((each) => text(each) === 'Cancel')!.click();

    expect(dismissed).toBe(1);
  });

  it('sends one request when the form is submitted twice', async () => {
    await type('lead-field-label', 'Deal size');
    await submit();
    await submit();

    expect(http.match(FIELDS_URL).length).toBe(1);
  });

  it('asks for options on a select field and sends them one per line', async () => {
    expect(el.querySelector('#lead-field-options')).toBeNull();

    await type('lead-field-label', 'Tier');
    await choose('Select');
    expect(text(el.querySelector('label[for="lead-field-options"]'))).toBe('Options');

    await submit();
    http.expectNone(FIELDS_URL);
    expect(fieldError('lead-field-options-error')).toBe('Add at least one option.');

    await type('lead-field-options', 'Gold\nSilver\n\nBronze');
    await submit();

    const request = http.expectOne(FIELDS_URL);
    expect(request.request.body).toEqual({
      key: 'tier',
      label: 'Tier',
      type: 'select',
      isRequired: false,
      options: ['Gold', 'Silver', 'Bronze'],
    });
    request.flush(CUSTOM_FIELDS[1]);
    await fixture.whenStable();
  });

  it('holds back a key the organization already uses', async () => {
    await type('lead-field-label', 'Product');
    await submit();

    http.expectNone(FIELDS_URL);
    expect(fieldError('lead-field-key-error')).toBe('Another field already uses this key.');
    expect(input('lead-field-key').getAttribute('aria-describedby')).toBe(
      'lead-field-key-help lead-field-key-error',
    );
  });

  it('explains the key rules when a key breaks them', async () => {
    await type('lead-field-label', 'Deal size');
    await type('lead-field-key', 'Deal-size');
    await submit();

    http.expectNone(FIELDS_URL);
    expect(fieldError('lead-field-key-error')).toBe(
      'Start with a lowercase letter, then use only letters and digits.',
    );
  });

  it('says a label is too long rather than cutting it', async () => {
    // No native cap, so a pasted label arrives whole and the person is told why it is refused.
    expect(input('lead-field-label').hasAttribute('maxlength')).toBe(false);

    await type('lead-field-label', 'x'.repeat(81));
    await submit();

    http.expectNone(FIELDS_URL);
    expect(fieldError('lead-field-label-error')).toBe('Use 80 characters or fewer.');
  });

  it('asks for a label before anything is sent', async () => {
    await submit();

    http.expectNone(FIELDS_URL);
    expect(fieldError('lead-field-label-error')).toBe('Enter a label.');
    expect(fieldError('lead-field-key-error')).toBe('Enter a key.');
  });

  it('marks the key taken when the API says another field got there first', async () => {
    await type('lead-field-label', 'Tier');
    await submit();

    http.expectOne(FIELDS_URL).flush(
      { statusCode: 409, message: 'Lead field tier already exists' },
      { status: 409, statusText: 'Conflict' },
    );

    await vi.waitFor(() => {
      expect(fieldError('lead-field-key-error')).toBe('Another field already uses this key.');
    });
    expect(added).toEqual([]);
  });

  it('clears the taken mark as soon as the key changes', async () => {
    await type('lead-field-label', 'Tier');
    await submit();

    http.expectOne(FIELDS_URL).flush(
      { statusCode: 409, message: 'Lead field tier already exists' },
      { status: 409, statusText: 'Conflict' },
    );
    await vi.waitFor(() => {
      expect(fieldError('lead-field-key-error')).toBe('Another field already uses this key.');
    });

    await type('lead-field-key', 'tierTwo');
    expect(fieldError('lead-field-key-error')).toBeNull();
  });

  it('shows any other refusal from the API', async () => {
    await type('lead-field-label', 'Tier');
    await submit();

    http.expectOne(FIELDS_URL).flush(
      { statusCode: 403, message: 'Forbidden resource' },
      { status: 403, statusText: 'Forbidden' },
    );

    const alert = await vi.waitFor(() => {
      const node = el.querySelector('[role="alert"]:not([hidden])')!;
      expect(text(node)).toContain('Forbidden resource');
      return node;
    });
    expect(text(alert)).toContain('Field not added');
  });
});
