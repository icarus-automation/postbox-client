import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ALL_FIELDS, SYSTEM_FIELDS } from '@core/lead-fields/lead-fields.testing';
import type { LeadField } from '@core/lead-fields/lead-fields.types';
import { environment } from '@env/environment';
import { LEAD, leadPage } from '../leads.testing';
import type { LeadPage } from '../leads.types';
import { LEAD_COLUMNS_KEY, LeadColumns } from '../services/lead-columns';
import { LeadList } from './lead-list';

const LEADS_URL = `${environment.apiBaseUrl}/leads`;
const FIELDS_URL = `${LEADS_URL}/fields`;

const EMPTY_PAGE = { data: [], meta: { total: 0, page: 1, limit: 20, lastPage: 0 } };

describe('LeadList', () => {
  let fixture: ComponentFixture<LeadList>;
  let http: HttpTestingController;
  let el: HTMLElement;

  /**
   * The open leads request. An open request keeps the app unstable, so `whenStable()` is
   * only safe once every request has been answered.
   */
  function leadsRequest(): TestRequest {
    return http.expectOne((request) => request.url === LEADS_URL);
  }

  function fieldsRequest(): TestRequest {
    return http.expectOne(FIELDS_URL);
  }

  /** Answers the definitions and hands back the page request they unblock. */
  async function answerFields(fields: LeadField[] = ALL_FIELDS): Promise<TestRequest> {
    fieldsRequest().flush(fields);

    return await vi.waitFor(() => leadsRequest());
  }

  /** Answers the definitions, then the page they unblock, then lets the view settle. */
  async function respond(
    body: LeadPage | string = leadPage(),
    opts?: { status: number; statusText: string },
    fields: LeadField[] = ALL_FIELDS,
  ): Promise<void> {
    (await answerFields(fields)).flush(body, opts);
    await fixture.whenStable();
  }

  /** Set the query params this screen was opened with, then let it fetch. */
  function start(params: Record<string, string> = {}): void {
    for (const [name, value] of Object.entries(params)) {
      fixture.componentRef.setInput(name, value);
    }

    TestBed.tick();
  }

  const headers = () => [...el.querySelectorAll('thead th')].map((th) => th.textContent?.trim());
  const cells = () => [...el.querySelectorAll('tbody tr:first-child td')];

  /** The columns menu sits in an overlay, so it is never inside the page element. */
  const menu = () => document.querySelector<HTMLElement>('[data-slot="popover-content"]');

  async function openColumns(): Promise<void> {
    [...el.querySelectorAll<HTMLButtonElement>('button')]
      .find((each) => each.textContent?.trim() === 'Columns')!
      .click();
    await fixture.whenStable();
  }

  /** Ticks or unticks one field in the open columns menu. */
  function pick(key: string): void {
    menu()!.querySelector<HTMLElement>(`#lead-column-${key}`)!.click();
  }

  const DEFAULT_HEADERS = ['Contact', 'Product', 'Status', 'Received', 'Deal size'];

  beforeEach(async () => {
    // The column pick outlives a test, because it is kept in this browser.
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [LeadList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LeadList);
    el = fixture.nativeElement as HTMLElement;
  });

  it('reads the field definitions and the first page together when there is no filter', () => {
    start();

    expect(fieldsRequest().request.method).toBe('GET');

    const request = leadsRequest().request;
    expect(request.params.get('page')).toBe('1');
    expect(request.params.get('limit')).toBe('20');
    expect(request.params.has('status')).toBe(false);
  });

  it('falls back to page one when the query string is junk', () => {
    start({ page: 'banana' });

    expect(leadsRequest().request.params.get('page')).toBe('1');
  });

  it('asks for the page the query string names', () => {
    start({ page: '3' });

    expect(leadsRequest().request.params.get('page')).toBe('3');
  });

  it('waits for the definitions before filtering, then passes a status the field offers', async () => {
    start({ status: 'qualified' });

    http.expectNone((request) => request.url === LEADS_URL);

    expect((await answerFields()).request.params.get('status')).toBe('qualified');
  });

  it('ignores a status the status field does not offer', async () => {
    start({ status: 'nonsense' });

    expect((await answerFields()).request.params.has('status')).toBe(false);
  });

  it('opens with the short fields only, so nothing has to scroll sideways to be read', async () => {
    start();
    await respond();

    // Long text and links are on the lead itself until someone asks for the column.
    expect(headers()).toEqual(DEFAULT_HEADERS);
    expect([...el.querySelectorAll('thead th')].every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    expect(el.querySelector('table')?.getAttribute('aria-label')).toBe('Leads');
  });

  it('offers every other field in the columns menu and keeps the name column out of it', async () => {
    start();
    await respond();
    await openColumns();

    const options = [...menu()!.querySelectorAll('label')].map((label) => label.textContent?.trim());
    expect(options).toEqual(ALL_FIELDS.slice(1).map((field) => field.label));
  });

  it('adds a column the person picks and remembers it for the next visit', async () => {
    start();
    await respond();
    await openColumns();

    pick('whyLead');
    await fixture.whenStable();

    // Columns follow the definitions' order, not the order they were picked in.
    expect(headers()).toEqual([
      'Contact',
      'Product',
      'Why this is a lead',
      'Status',
      'Received',
      'Deal size',
    ]);
    expect(JSON.parse(localStorage.getItem(LEAD_COLUMNS_KEY) ?? 'null')).toContain('whyLead');
  });

  it('drops a column the person unticks and still names every row', async () => {
    start();
    await respond();
    await openColumns();

    for (const key of ['product', 'status', 'receivedAt', 'dealSize']) {
      pick(key);
    }
    await fixture.whenStable();

    expect(headers()).toEqual(['Contact']);
    expect(el.querySelector('tbody a')?.textContent?.trim()).toBe('Dana Reyes');
  });

  it('hands the table back to the usual columns', async () => {
    start();
    await respond();
    await openColumns();

    pick('product');
    await fixture.whenStable();

    const reset = [...menu()!.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === 'Reset columns',
    )!;
    reset.click();
    await fixture.whenStable();

    expect(headers()).toEqual(DEFAULT_HEADERS);
    expect(localStorage.getItem(LEAD_COLUMNS_KEY)).toBeNull();
  });

  it('follows the labels and order the API sends', async () => {
    const [candidate, product, ...rest] = SYSTEM_FIELDS;
    const fields = [{ ...product, label: 'Offer' }, { ...candidate, label: 'Name' }, ...rest];

    start();
    await respond(leadPage(), undefined, fields);

    expect(headers().slice(0, 2)).toEqual(['Offer', 'Name']);
    expect(cells()[0].textContent?.trim()).toBe('POS');
  });

  it('shows each value the way its type reads', async () => {
    TestBed.inject(LeadColumns).pick(ALL_FIELDS.map((field) => field.key));

    start();
    await respond();

    const text = (key: string) =>
      cells()[ALL_FIELDS.findIndex((field) => field.key === key)].textContent?.replace(/\s+/g, ' ').trim();

    expect(text('candidate')).toBe('Dana Reyes');
    expect(text('product')).toBe('POS');
    expect(text('signal')).toBe('Asked which POS handles split bills for a 40-seat cafe');
    expect(text('whyLead')).toBe(LEAD.values['whyLead']);
    expect(text('status')).toBe('New');
    expect(text('receivedAt')).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{2}:\d{2}$/);
    expect(text('dealSize')).toBe('1,200');
    expect(text('tier')).toBe('Gold (retired)');
    expect(text('followUp')).toBe('Oct 1, 2026');
  });

  it('uses the wide page width', () => {
    expect(el.classList).toContain('page-wide');
  });

  it('links the lead name to the lead and lets a click anywhere in its cell open it', async () => {
    start();
    await respond();

    const cell = cells()[0];
    const links = cell.querySelectorAll('a');

    // The one link stretches its ::after over the positioned cell.
    expect(links.length).toBe(1);
    expect(links[0].getAttribute('href')).toContain(LEAD.id);
    expect(links[0].textContent?.trim()).toBe('Dana Reyes');
    expect(cell.classList).toContain('relative');
    expect(links[0].classList).toContain('after:absolute');
    expect(links[0].classList).toContain('after:inset-0');
  });

  it('opens a picked link off-site safely, named after the site it goes to', async () => {
    start();
    await respond();
    await openColumns();

    pick('source');
    await fixture.whenStable();

    const links = [...el.querySelectorAll<HTMLAnchorElement>('tbody a[target="_blank"]')];
    expect(links.length).toBe(1);

    const [source] = links;
    expect(source.getAttribute('href')).toBe(LEAD.values['source']);
    expect(source.getAttribute('rel')).toBe('noopener noreferrer');
    expect(source.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'facebook.com Source for Dana Reyes (opens in a new tab)',
    );
  });

  it('offers a filter for each status option plus all, marking the current one', async () => {
    start();
    await respond();

    const nav = el.querySelector('nav[aria-label="Filter leads by status"]')!;
    const links = [...nav.querySelectorAll('a')];

    expect(links.map((a) => a.textContent?.trim())).toEqual(['All', 'New', 'Contacted', 'Qualified', 'Archived']);
    expect(links.filter((a) => a.getAttribute('aria-current') === 'page').length).toBe(1);
    expect(links[0].getAttribute('aria-current')).toBe('page');
  });

  it('reads the inbox by default, so nothing archived is mixed into it', () => {
    start();

    expect(leadsRequest().request.params.get('archived')).toBe('false');
  });

  it('reads the archive as its own list, with no status carried into it', async () => {
    start({ archived: 'true', status: 'new' });

    const request = (await answerFields()).request;
    expect(request.params.get('archived')).toBe('true');

    const nav = el.querySelector('nav[aria-label="Filter leads by status"]')!;
    const current = [...nav.querySelectorAll('a')].filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current.map((a) => a.textContent?.trim())).toEqual(['Archived']);
  });

  it('drops the archive when a stage is picked, and the stage when the archive is', async () => {
    start();
    await respond();

    const link = (name: string) =>
      [...el.querySelectorAll('nav a')].find((a) => a.textContent?.trim() === name)!.getAttribute('href');

    expect(link('Contacted')).toContain('status=contacted');
    expect(link('Contacted')).not.toContain('archived');
    expect(link('Archived')).toContain('archived=true');
    expect(link('Archived')).not.toContain('status');
  });

  it('counts the list in the heading and says no more than that on one page', async () => {
    start();
    await respond(leadPage({ meta: { total: 7, page: 1, limit: 20, lastPage: 1 } }));

    expect(el.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Leads (7)');
    expect(el.textContent).not.toContain('Showing');
  });

  it('says the inbox is empty rather than showing a bare table', async () => {
    start();
    await respond(EMPTY_PAGE);

    expect(el.querySelector('tbody tr')).toBeNull();
    expect(el.textContent).toContain('No leads yet');
  });

  it('explains an empty filter differently from an empty inbox', async () => {
    start({ status: 'contacted' });
    await respond(EMPTY_PAGE);

    expect(el.textContent).toContain('No leads with this status');
    expect(el.textContent).toContain("Set a lead's status to Contacted");
  });

  it('explains an empty archive in its own words', async () => {
    start({ archived: 'true' });
    await respond(EMPTY_PAGE);

    expect(el.textContent).toContain('No archived leads');
    expect(el.textContent).toContain('Archived leads appear here');
  });

  it('points to Lead fields when there are no fields to make columns from', async () => {
    start();
    await respond(leadPage(), undefined, []);

    expect(el.querySelector('table')).toBeNull();
    expect(el.textContent).toContain('No lead fields');
    expect(el.querySelector('a[href="/settings/lead-fields"]')).toBeTruthy();
  });

  it('counts what this page is showing', async () => {
    start();
    await respond(leadPage({ meta: { total: 42, page: 2, limit: 20, lastPage: 3 } }));

    expect(el.textContent).toContain('Showing 21 to 40 of 42');
  });

  it('pages only in the directions that exist', async () => {
    start();
    await respond(leadPage({ meta: { total: 42, page: 1, limit: 20, lastPage: 3 } }));

    const nav = el.querySelector('nav[aria-label="Pagination"]')!;
    expect([...nav.querySelectorAll('a')].map((a) => a.textContent?.trim())).toEqual(['Next']);
    expect(nav.textContent).toContain('Page 1 of 3');
  });

  it('hides pagination when everything fits on one page', async () => {
    start();
    await respond();

    expect(el.querySelector('nav[aria-label="Pagination"]')).toBeNull();
  });

  it('surfaces a failed page with a way to try again', async () => {
    start();
    await respond('boom', { status: 500, statusText: 'Server Error' });

    const alert = el.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Could not load leads');
    expect(el.querySelector('tbody')).toBeNull();

    alert.querySelector('button')!.click();
    TestBed.tick();

    expect(leadsRequest().request.method).toBe('GET');
    http.expectNone(FIELDS_URL);
  });

  it('surfaces failed definitions and reads them again on retry', async () => {
    start();
    fieldsRequest().flush({ statusCode: 500, message: 'Database error' }, { status: 500, statusText: 'Server Error' });
    leadsRequest().flush(leadPage());
    await fixture.whenStable();

    const alert = el.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Database error');
    expect(el.querySelector('table')).toBeNull();

    alert.querySelector('button')!.click();
    TestBed.tick();

    expect(fieldsRequest().request.method).toBe('GET');
  });
});

describe('LeadList inside the router', () => {
  it('carries the tab and page into the lead it opens', async () => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'leads', component: LeadList }], withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    const harness = await RouterTestingHarness.create();
    const http = TestBed.inject(HttpTestingController);
    await harness.navigateByUrl('/leads?status=new&page=2', LeadList);

    http.expectOne(FIELDS_URL).flush(ALL_FIELDS);

    const request = await vi.waitFor(() => http.expectOne((req) => req.url === LEADS_URL));
    expect(request.request.params.get('status')).toBe('new');
    request.flush(leadPage({ meta: { total: 21, page: 2, limit: 20, lastPage: 2 } }));
    await harness.fixture.whenStable();

    const link = (harness.routeNativeElement as HTMLElement).querySelector('tbody a')!;
    expect(link.getAttribute('href')).toBe(`/leads/${LEAD.id}?status=new&page=2`);
  });
});
