import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { toastState } from '@spartan-ng/brain/sonner';
import { ALL_FIELDS } from '@core/lead-fields/lead-fields.testing';
import { environment } from '@env/environment';
import { LEAD, leadWith } from '../leads.testing';
import type { Lead } from '../leads.types';
import { LeadDetail } from './lead-detail';

const FIELDS_URL = `${environment.apiBaseUrl}/leads/fields`;
const LEAD_URL = `${environment.apiBaseUrl}/leads/${LEAD.id}`;
const STATUS_URL = `${LEAD_URL}/status`;

const SERVER_ERROR = { status: 500, statusText: 'Server Error' };

describe('LeadDetail', () => {
  let fixture: ComponentFixture<LeadDetail>;
  let http: HttpTestingController;
  let el: HTMLElement;

  function start(id = LEAD.id): void {
    fixture.componentRef.setInput('id', id);
    TestBed.tick();
  }

  async function respond(body: Lead | string = LEAD, opts?: { status: number; statusText: string }): Promise<void> {
    http.expectOne(FIELDS_URL).flush(ALL_FIELDS);
    http.expectOne(LEAD_URL).flush(body, opts);
    await fixture.whenStable();
  }

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim();

  /** The message a value is showing, or null while its error is hidden. */
  function fieldError(id: string): string | null {
    const node = el.querySelector(`#${id}`);
    return !node || node.hasAttribute('hidden') ? null : text(node)!;
  }

  function button(name: string): HTMLButtonElement {
    return [...el.querySelectorAll<HTMLButtonElement>('button')].find((each) => text(each) === name)!;
  }

  /** What the page asked the toaster to say. The toaster itself lives in the app shell. */
  const toasts = () => toastState.toasts().map((each) => each.title);

  /** The stage the header shows at a glance, beside the name. */
  const statusBadge = () => text(el.querySelector('app-lead-status'));

  /** The status control: the button its own label points at, so a missing `for` fails. */
  function statusControl(): HTMLButtonElement {
    const picker = el.querySelector('app-lead-status-picker')!;
    return el.querySelector<HTMLButtonElement>(`#${picker.querySelector('label')!.getAttribute('for')}`)!;
  }

  /** What the closed control reads, which is the stage the lead is at. */
  const currentStatus = () => text(statusControl());

  /** The stages on offer. They are portaled, so they are never inside the page element. */
  async function statusOptions(): Promise<(string | undefined)[]> {
    statusControl().click();
    await fixture.whenStable();

    return [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')].map((item) => text(item));
  }

  /** Opens the status control and picks a stage by the name on screen. */
  async function pickStatus(stage: string): Promise<void> {
    await statusOptions();
    [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')]
      .find((item) => text(item) === stage)!
      .click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeadDetail],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LeadDetail);
    el = fixture.nativeElement as HTMLElement;

    // The toaster is global, so a toast outlives the test that set it off.
    toastState.dismiss();
  });

  it('reads the lead named by the route and the field definitions', () => {
    start();

    expect(http.expectOne(LEAD_URL).request.method).toBe('GET');
    expect(http.expectOne(FIELDS_URL).request.method).toBe('GET');
  });

  it('names the lead after its first text field and shows every value under its label', async () => {
    start();
    await respond();

    expect(text(el.querySelector('h1'))).toBe('Dana Reyes');

    // The message to send leads, then the rest of the passages. Each is a labelled section
    // rather than a box, and nothing but the draft carries a panel around it.
    const sections = [...el.querySelectorAll('section h2')].map((heading) => text(heading));
    expect(sections).toEqual(['What they said', 'Why this is a lead']);
    expect(el.querySelector('[data-slot="card-title"]')).toBeNull();

    const terms = [...el.querySelectorAll('dt')].map((dt) => text(dt));
    expect(terms).toEqual(['Product', 'Source', 'Received', 'Deal size', 'Tier', 'Follow up']);

    const page = text(el)!;
    expect(page).toContain('POS');
    expect(page).toContain('1,200');
    expect(page).toContain('Oct 1, 2026');
    expect(page).toContain(LEAD.values['whyLead'] as string);
    expect(page).toContain(LEAD.id);
  });

  it('uses the standard page width', () => {
    expect(el.classList).toContain('page-standard');
  });

  it('shows when the lead arrived, and keeps the housekeeping in one quiet line', async () => {
    start();
    await respond();

    const received = [...el.querySelectorAll('dt')].find((dt) => text(dt) === 'Received')!;
    expect(text(received.nextElementSibling)).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2}$/);

    // Last updated and the id used to be a card of their own, competing with the record.
    const footer = [...el.querySelectorAll('p')].find((p) => text(p)?.startsWith('Updated '))!;
    expect(text(footer)).toMatch(/^Updated [A-Z][a-z]{2} \d{1,2}, \d{4}, \d{2}:\d{2}/);
    expect(text(footer)).toContain(LEAD.id);
  });

  it('keeps showing a retired select option the lead holds', async () => {
    start();
    await respond();

    const tier = [...el.querySelectorAll('dt')].find((dt) => text(dt) === 'Tier')!;
    expect(text(tier.nextElementSibling)).toBe('Gold (retired)');
  });

  it('opens the source off-site safely, from the header and the details', async () => {
    start();
    await respond();

    const links = [...el.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')];

    expect(links.length).toBe(2);
    // Named after the field, so renaming a site or a lead never changes what the button says.
    expect(text(links[0])).toBe('Open source (facebook.com, opens in a new tab)');
    for (const link of links) {
      expect(link.getAttribute('href')).toBe(LEAD.values['source']);
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('leaves everything empty off the page and counts it once instead', async () => {
    start();
    await respond(leadWith({ dealSize: null, followUp: null }));

    expect(text(el)).not.toContain('Not set');
    expect([...el.querySelectorAll('dt')].some((dt) => text(dt) === 'Deal size')).toBe(false);
    expect(text(el)).toContain('2 fields are empty.');
  });

  it('keeps a line of long text out of the sections and puts it with the details', async () => {
    start();
    await respond(leadWith({ whyLead: 'Ace' }));

    const sections = [...el.querySelectorAll('section h2')].map((heading) => text(heading));
    expect(sections).not.toContain('Why this is a lead');

    const why = [...el.querySelectorAll('dt')].find((dt) => text(dt) === 'Why this is a lead')!;
    expect(text(why.nextElementSibling)).toBe('Ace');
  });

  it('tells the passages apart by label and space, with no rule between them', async () => {
    start();
    await respond();

    const sections = [...el.querySelectorAll('section')];
    expect(sections.length).toBe(2);
    for (const section of sections) {
      expect(text(section.querySelector('h2.field-label'))).toBeTruthy();
      expect(section.className).not.toContain('border');
    }

    // The split the page keeps: one soft vertical rule between the record and the facts.
    expect(el.querySelector('aside')!.className).toContain('lg:border-s');
  });

  it('offers a way back to the inbox', () => {
    start();

    expect(el.querySelector('a')?.getAttribute('href')).toBe('/leads');
  });

  it('says a missing lead is missing rather than showing an error', async () => {
    start();
    await respond({ statusCode: 404, message: 'Lead not found' } as never, { status: 404, statusText: 'Not Found' });

    expect(el.textContent).toContain('Lead not found');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('surfaces any other failure with a way to try again', async () => {
    start();
    await respond('boom', SERVER_ERROR);

    const alert = el.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Could not load this lead');

    alert.querySelector('button')!.click();
    TestBed.tick();

    expect(http.expectOne(LEAD_URL).request.method).toBe('GET');
  });

  describe('status', () => {
    beforeEach(async () => {
      start();
      await respond();
    });

    afterEach(() => http.verify());

    it('shows the stage by the name and keeps the control with the record', async () => {
      const header = el.querySelector('header')!;

      expect(text(header.querySelector('h1'))).toBe('Dana Reyes');
      expect(statusBadge()).toBe('New');

      // The control is a labelled field in the rail, beside the values it sits with.
      expect(el.querySelector('aside app-lead-status-picker')).toBeTruthy();
      expect(header.querySelector('app-lead-status-picker')).toBeNull();
      expect(currentStatus()).toBe('New');

      // Stages only. Archiving is the lead's own flag and has its own control.
      expect(await statusOptions()).toEqual(['New', 'Contacted', 'Qualified']);

      // The inbox filters with tabs. Moving one lead must not borrow that chrome.
      expect(el.querySelector('[aria-pressed]')).toBeNull();
      expect(statusControl().getAttribute('role')).toBe('combobox');
    });

    it('saves a pick straight away and keeps what the API returns', async () => {
      await pickStatus('Contacted');

      const save = http.expectOne(STATUS_URL);
      expect(save.request.method).toBe('PATCH');
      expect(save.request.body).toEqual({ status: 'contacted' });
      expect(currentStatus()).toBe('Contacted');
      expect(statusBadge()).toBe('Contacted');
      expect(toasts()).toEqual([]);

      save.flush(leadWith({ status: 'contacted' }, { updatedAt: '2026-11-20T12:00:00.000Z' }));
      await vi.waitFor(() => expect(toasts()).toEqual(['Status saved']));

      expect(toastState.toasts()[0].type).toBe('success');
      expect(currentStatus()).toBe('Contacted');
      expect(el.textContent).toContain('Nov 20, 2026');
    });

    it('puts the saved status back and says why when a save fails', async () => {
      await pickStatus('Qualified');
      http.expectOne(STATUS_URL).flush({ statusCode: 500, message: 'Database error' } as never, SERVER_ERROR);

      const alert = await vi.waitFor(() => {
        const node = el.querySelector('[role="alert"]')!;
        expect(node.textContent).toContain('Database error');
        return node;
      });
      expect(alert.textContent).toContain('Status not saved');
      expect(currentStatus()).toBe('New');
      expect(statusBadge()).toBe('New');
      // A failure stays on the page, in an alert. Nothing says it went well.
      expect(toasts()).toEqual([]);
    });

    it('sends the last pick once the save in flight lands, so the API ends on it', async () => {
      await pickStatus('Contacted');
      await pickStatus('Qualified');

      const first = http.expectOne(STATUS_URL);
      expect(first.request.body).toEqual({ status: 'contacted' });
      expect(currentStatus()).toBe('Qualified');

      first.flush(leadWith({ status: 'contacted' }));

      const second = await vi.waitFor(() => http.expectOne(STATUS_URL));
      expect(second.request.body).toEqual({ status: 'qualified' });

      second.flush(leadWith({ status: 'qualified' }));
      await vi.waitFor(() => expect(toasts()).toEqual(['Status saved']));

      expect(currentStatus()).toBe('Qualified');
    });
  });

  describe('archive', () => {
    const ARCHIVE_URL = `${LEAD_URL}/archive`;

    /** The confirm sits in an overlay, so it is never inside the page element. */
    const dialog = () => document.querySelector<HTMLElement>('[data-slot="dialog-content"]');

    function dialogButton(name: string): HTMLButtonElement {
      return [...dialog()!.querySelectorAll<HTMLButtonElement>('button')].find((each) => text(each) === name)!;
    }

    async function openArchive(): Promise<void> {
      button('Archive').click();
      await fixture.whenStable();
    }

    afterEach(() => http.verify());

    it('asks before archiving, and sends nothing when the answer is no', async () => {
      start();
      await respond();
      await openArchive();

      expect(text(dialog())).toContain('Archive this lead?');
      expect(text(dialog())).toContain('restore it later');
      // Loud enough to read as a way out of the inbox rather than another tab.
      expect(dialogButton('Archive lead').className).toContain('bg-destructive');

      dialogButton('Cancel').click();
      await vi.waitFor(() => expect(dialog()).toBeNull());

      http.expectNone(ARCHIVE_URL);
      expect(text(el)).not.toContain('This lead is archived');
    });

    it('archives once the answer is yes, and leaves the stage where it was', async () => {
      start();
      await respond();
      await openArchive();

      dialogButton('Archive lead').click();
      await fixture.whenStable();

      const request = http.expectOne(ARCHIVE_URL);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ isArchived: true });

      request.flush(leadWith({}, { isArchived: true }));
      await vi.waitFor(() => expect(text(el)).toContain('This lead is archived'));

      // Nothing left to archive, and the stage the lead reached is untouched.
      expect(button('Archive')).toBeUndefined();
      expect(currentStatus()).toBe('New');
    });

    it('restores without asking, because putting a lead back undoes nothing', async () => {
      start();
      await respond(leadWith({}, { isArchived: true }));

      button('Restore').click();
      await fixture.whenStable();

      const request = http.expectOne(ARCHIVE_URL);
      expect(request.request.body).toEqual({ isArchived: false });

      request.flush(LEAD);
      await vi.waitFor(() => expect(text(el)).not.toContain('This lead is archived'));

      expect(button('Archive')).toBeTruthy();
    });

    it('says why an archive did not save and leaves the lead where it is', async () => {
      start();
      await respond();
      await openArchive();

      dialogButton('Archive lead').click();
      await fixture.whenStable();

      http.expectOne(ARCHIVE_URL).flush({ statusCode: 500, message: 'Database error' } as never, SERVER_ERROR);

      const alert = await vi.waitFor(() => {
        const node = [...el.querySelectorAll('[role="alert"]')].find((each) =>
          text(each)?.includes('Could not archive'),
        )!;
        expect(node).toBeTruthy();
        return node;
      });
      expect(text(alert)).toContain('Database error');
      expect(text(el)).not.toContain('This lead is archived');
    });
  });

  describe('editing values', () => {
    const form = () => el.querySelector('form');

    /** The control a label points at, so a missing `for` fails the test. */
    function control<T extends HTMLElement = HTMLInputElement>(label: string): T {
      const match = [...el.querySelectorAll('form label')].find((each) => text(each)?.startsWith(label))!;
      return el.querySelector<T>(`#${match.getAttribute('for')}`)!;
    }

    function type(target: HTMLInputElement | HTMLTextAreaElement, value: string): void {
      target.value = value;
      target.dispatchEvent(new Event('input'));
      target.dispatchEvent(new Event('blur'));
    }

    /** Opens a select and hands back its options, which are portaled out of the form. */
    async function options(label: string): Promise<HTMLElement[]> {
      control<HTMLButtonElement>(label).click();
      await fixture.whenStable();

      return [...document.querySelectorAll<HTMLElement>('[data-slot="select-item"]')];
    }

    /** Picks an option by the name on screen. Picking one closes the list. */
    async function choose(label: string, option: string): Promise<void> {
      (await options(label)).find((item) => text(item) === option)!.click();
      await fixture.whenStable();
    }

    async function edit(): Promise<void> {
      button('Edit').click();
      await fixture.whenStable();
    }

    async function save(): Promise<void> {
      form()!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    }

    beforeEach(async () => {
      start();
      await respond();
    });

    afterEach(() => http.verify());

    it('opens a control per writable field, typed by the field, and moves focus into it', async () => {
      await edit();

      expect(control('Contact').getAttribute('type')).toBe('text');
      // A select is the app's own control now, not the browser's grey list.
      expect(control('Product').getAttribute('data-slot')).toBe('select-trigger');
      expect(control('Source').getAttribute('type')).toBe('url');
      expect(control<HTMLTextAreaElement>('What they said').tagName).toBe('TEXTAREA');
      expect(control('Deal size').getAttribute('type')).toBe('number');
      expect(control('Follow up').getAttribute('type')).toBe('date');

      const labels = [...el.querySelectorAll('form label')].map((label) => text(label));
      expect(labels).toEqual([
        'Contact (required)',
        'Product (required)',
        'Source (required)',
        'What they said (required)',
        'Why this is a lead (required)',
        'Deal size',
        'Tier',
        'Follow up',
      ]);
      expect(document.activeElement).toBe(control('Contact'));
    });

    it('fills each control with the value the lead holds', async () => {
      await edit();

      expect(control('Contact').value).toBe('Dana Reyes');
      expect(text(control('Product'))).toBe('POS');
      expect(control('Deal size').value).toBe('1200');
      expect(control('Follow up').value).toBe('2026-10-01');
    });

    it('offers only current options, keeping a retired one selected but out of reach', async () => {
      await edit();

      const tier = control('Tier');
      const listed = (await options('Tier')).map((option) => ({
        label: text(option),
        disabled: option.getAttribute('aria-disabled') === 'true',
      }));

      expect(listed).toEqual([
        { label: 'Not set', disabled: false },
        { label: 'Gold (retired)', disabled: true },
        { label: 'Silver', disabled: false },
        { label: 'Bronze', disabled: false },
      ]);
      expect(text(tier)).toBe('Gold (retired)');
      expect(tier.getAttribute('aria-describedby')).toBe('lead-value-tier-note');
      expect(text(el.querySelector('#lead-value-tier-note'))).toContain('Gold is no longer an option');
    });

    it('does not offer to clear a required select', async () => {
      await edit();

      expect((await options('Product')).map((option) => text(option))).toEqual(['POS', 'PMS', 'Other']);
    });

    it('sends only the values that changed and shows the lead the API returns', async () => {
      await edit();

      type(control('Deal size'), '2500');
      await choose('Tier', 'Silver');
      type(control('Follow up'), '');
      await save();

      const request = http.expectOne(LEAD_URL);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ values: { dealSize: 2500, tier: 'Silver', followUp: null } });

      request.flush(leadWith({ dealSize: 2500, tier: 'Silver', followUp: null }));
      await vi.waitFor(() => expect(form()).toBeNull());

      expect(toasts()).toEqual(['Changes saved']);
      expect(text(el)).toContain('2,500');
      expect(text(el)).not.toContain('Gold');
      await vi.waitFor(() => expect(document.activeElement).toBe(button('Edit')));
    });

    it('refuses to clear a required value before asking the API', async () => {
      await edit();

      type(control('Contact'), '   ');
      await save();

      http.expectNone(LEAD_URL);
      expect(fieldError('lead-value-candidate-error')).toBe('Contact is required.');
      expect(control('Contact').getAttribute('aria-describedby')).toBe('lead-value-candidate-error');
    });

    it('checks a link before sending it', async () => {
      await edit();

      type(control('Source'), 'ftp://example.com/file');
      await save();

      http.expectNone(LEAD_URL);
      expect(fieldError('lead-value-source-error')).toBe(
        'Enter a link that starts with http:// or https://.',
      );
    });

    it('shows what the API refused in terms of labels, and keeps the form open', async () => {
      await edit();

      type(control('Deal size'), '3');
      await save();

      http.expectOne(LEAD_URL).flush(
        { statusCode: 400, message: ['values.dealSize must be a number'] },
        { status: 400, statusText: 'Bad Request' },
      );

      const alert = await vi.waitFor(() => {
        const node = form()!.querySelector('[role="alert"]')!;
        expect(text(node)).toContain('Deal size must be a number');
        return node;
      });
      expect(text(alert)).toContain('Changes not saved');
      expect(form()).toBeTruthy();
    });

    it('closes without a request when nothing changed', async () => {
      await edit();
      await save();

      http.expectNone(LEAD_URL);
      expect(form()).toBeNull();
      expect(toasts()).toEqual(['No changes']);
    });

    it('drops unsaved changes on cancel', async () => {
      await edit();

      type(control('Deal size'), '9999');
      button('Cancel').click();
      await fixture.whenStable();

      expect(form()).toBeNull();
      expect(text(el)).toContain('1,200');
      expect(text(el)).not.toContain('9,999');
    });

    it('keeps a status picked while values save, whichever answer lands last', async () => {
      // The control is in the rail, so the stage moves before the form opens over it.
      await pickStatus('Contacted');
      const status = http.expectOne(STATUS_URL);

      await edit();
      type(control('Deal size'), '2500');
      await save();
      const values = http.expectOne(LEAD_URL);

      // The status save answers first, carrying the old values. The values save lands after,
      // carrying the old status. Each keeps only what it owns.
      status.flush(leadWith({ status: 'contacted' }));
      await vi.waitFor(() => expect(toasts()).toContain('Status saved'));

      values.flush(leadWith({ dealSize: 2500 }));
      await vi.waitFor(() => expect(text(el)).toContain('2,500'));

      expect(statusBadge()).toBe('Contacted');
      expect(currentStatus()).toBe('Contacted');
    });
  });
});

describe('LeadDetail inside the router', () => {
  it('goes back to the tab and page the lead was opened from', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'leads/:id', component: LeadDetail }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/leads/${LEAD.id}?status=new&page=2`, LeadDetail);

    const http = TestBed.inject(HttpTestingController);
    http.expectOne(FIELDS_URL).flush(ALL_FIELDS);
    http.expectOne(LEAD_URL).flush(LEAD);
    await harness.fixture.whenStable();

    const back = (harness.routeNativeElement as HTMLElement).querySelector('a')!;
    expect(back.textContent?.trim()).toBe('Back to leads');
    expect(back.getAttribute('href')).toBe('/leads?status=new&page=2');
  });

  it('drops an open form when the route moves to another lead', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'leads/:id', component: LeadDetail }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    const harness = await RouterTestingHarness.create();
    const http = TestBed.inject(HttpTestingController);
    await harness.navigateByUrl(`/leads/${LEAD.id}`, LeadDetail);
    http.expectOne(FIELDS_URL).flush(ALL_FIELDS);
    http.expectOne(LEAD_URL).flush(LEAD);
    await harness.fixture.whenStable();

    const page = harness.routeNativeElement as HTMLElement;
    [...page.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Edit')!.click();
    await harness.fixture.whenStable();
    expect(page.querySelector('form')).toBeTruthy();

    const other = leadWith({ candidate: 'Sam Lee' }, { id: '01a09ba4-78af-70c8-bdff-6737d7c1bbc9' });
    await harness.navigateByUrl(`/leads/${other.id}`);
    http.expectOne(`${environment.apiBaseUrl}/leads/${other.id}`).flush(other);
    await harness.fixture.whenStable();

    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Sam Lee');
    expect(page.querySelector('form')).toBeNull();
  });
});
