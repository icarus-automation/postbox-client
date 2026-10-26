import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { toastState } from '@spartan-ng/brain/sonner';
import { environment } from '@env/environment';
import { ApiKeysSettings } from './api-keys-settings';
import type { ApiKeySummary, CreatedApiKey } from './api-keys.types';

const KEYS_URL = `${environment.apiBaseUrl}/api-keys`;
const RAW_KEY = 'cms_AbCdEfGh1234567890RAWVALUE';

const n8n: ApiKeySummary = {
  id: 'key-n8n',
  name: 'n8n lead intake',
  keyPrefix: 'cms_n8nAAAAA',
  lastUsedAt: '2026-10-24T09:30:00.000Z',
  revokedAt: null,
  createdAt: '2026-10-01T09:30:00.000Z',
};

const postman: ApiKeySummary = {
  id: 'key-postman',
  name: 'Postman',
  keyPrefix: 'cms_postBBBB',
  lastUsedAt: null,
  revokedAt: '2026-10-10T09:30:00.000Z',
  createdAt: '2026-09-12T09:30:00.000Z',
};

const created: CreatedApiKey = {
  id: 'key-agent',
  name: 'Draft agent',
  keyPrefix: 'cms_AbCdEfGh',
  lastUsedAt: null,
  revokedAt: null,
  createdAt: '2026-10-25T09:30:00.000Z',
  key: RAW_KEY,
};

describe('ApiKeysSettings', () => {
  let fixture: ComponentFixture<ApiKeysSettings>;
  let http: HttpTestingController;
  let el: HTMLElement;
  const writeText = vi.fn<(text: string) => Promise<void>>();

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim();
  const dialog = () => document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
  const button = (label: string, root: ParentNode = el) =>
    [...root.querySelectorAll('button')].find(
      (node) => node.getAttribute('aria-label') === label || text(node) === label,
    );
  const rows = () =>
    [...el.querySelectorAll('tbody tr')].map((row) => [...row.querySelectorAll('th, td')].map((cell) => text(cell)));
  const toasts = () => toastState.toasts().map((each) => each.title);

  async function open(list: ApiKeySummary[] = [n8n, postman]): Promise<void> {
    TestBed.tick();
    http.expectOne(KEYS_URL).flush(list);
    await fixture.whenStable();
  }

  async function type(input: HTMLInputElement, value: string): Promise<void> {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await TestBed.configureTestingModule({
      imports: [ApiKeysSettings],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ApiKeysSettings);
    el = fixture.nativeElement as HTMLElement;
    toastState.dismiss();
  });

  afterEach(() => http.verify());

  it('uses the wide page width', async () => {
    await open();

    expect(el.classList).toContain('page-wide');
  });

  it('is labelled server-only and says a website must not use these keys', async () => {
    await open();

    expect(text(el.querySelector('h1'))).toBe('Admin API keys Server-only');
    expect(text(el.querySelector('header'))).toContain('Never put one in website code or send one from a browser.');
    expect(el.querySelector('header a[href="/settings/integration-key"]')).not.toBeNull();
  });

  it('lists the keys with their prefix, dates, last use and status, never a raw key', async () => {
    await open();

    expect([...el.querySelectorAll('thead th')].map((th) => text(th))).toEqual([
      'Name',
      'Key',
      'Created',
      'Last used',
      'Status',
      'Actions',
    ]);
    const [first, second] = rows();
    expect(first[0]).toBe('n8n lead intake');
    expect(first[1]).toBe('cms_n8nAAAAA…');
    // The day shifts with the machine's time zone, so only the shape is fixed.
    expect(first[2]).toMatch(/^Oct \d{1,2}, 2026, \d{2}:\d{2}$/);
    expect(first[3]).toMatch(/^Oct \d{1,2}, 2026, \d{2}:\d{2}$/);
    expect(first[4]).toBe('Active');
    expect(second[0]).toBe('Postman');
    expect(second[3]).toBe('Never');
    expect(second[4]).toBe('Revoked');
  });

  it('offers to revoke an active key only', async () => {
    await open();

    expect(button('Revoke n8n lead intake')).toBeDefined();
    expect(button('Revoke Postman')).toBeUndefined();
  });

  it('shows an empty state when there are no keys yet', async () => {
    await open([]);

    expect(text(el.querySelector('h2'))).toBe('No admin API keys yet');
    expect(el.querySelector('table')).toBeNull();
    expect(button('Create key')).toBeDefined();
  });

  describe('creating a key', () => {
    async function openCreate(): Promise<void> {
      button('Create key')!.click();
      await fixture.whenStable();
    }

    async function submitName(name: string): Promise<void> {
      await type(dialog()!.querySelector<HTMLInputElement>('#api-key-name')!, name);
      dialog()!.querySelector('form')!.dispatchEvent(new Event('submit'));
    }

    it('asks for a name before it sends anything', async () => {
      await open();
      await openCreate();

      await submitName('   ');
      await fixture.whenStable();

      expect(text(dialog()?.querySelector('hlm-field-error'))).toBe('Enter a name.');
      http.expectNone({ method: 'POST', url: KEYS_URL });
    });

    it('refuses a name longer than the API takes', async () => {
      await open();
      await openCreate();

      await submitName('x'.repeat(101));
      await fixture.whenStable();

      expect(text(dialog()?.querySelector('hlm-field-error'))).toBe('Use 100 characters or fewer.');
      http.expectNone({ method: 'POST', url: KEYS_URL });
    });

    it('shows the raw key once, with a copy button, and lists the new key without it', async () => {
      await open();
      await openCreate();

      await submitName('  Draft agent  ');
      const post = await vi.waitFor(() => http.expectOne({ method: 'POST', url: KEYS_URL }));
      expect(post.request.body).toEqual({ name: 'Draft agent' });
      post.flush(created);
      await fixture.whenStable();

      expect(text(dialog()?.querySelector('h2'))).toBe('Key created');
      expect(text(dialog())).toContain('This is the only time it is shown.');
      expect(text(dialog()?.querySelector('code'))).toBe(RAW_KEY);
      expect(rows()[0][0]).toBe('Draft agent');
      expect(rows()[0][1]).toBe('cms_AbCdEfGh…');
      expect(text(el)).not.toContain(RAW_KEY);

      button('Copy admin API key', dialog()!)!.click();
      await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(RAW_KEY));
    });

    it('takes the raw key off the screen when the person is done', async () => {
      await open();
      await openCreate();
      await submitName('Draft agent');
      (await vi.waitFor(() => http.expectOne({ method: 'POST', url: KEYS_URL }))).flush(created);
      await fixture.whenStable();

      button('Done', dialog()!)!.click();

      await vi.waitFor(() => expect(dialog()).toBeNull());
      expect(document.body.textContent).not.toContain(RAW_KEY);
    });

    it('starts the next key from a blank form, not from the last key', async () => {
      await open();
      await openCreate();
      await submitName('Draft agent');
      (await vi.waitFor(() => http.expectOne({ method: 'POST', url: KEYS_URL }))).flush(created);
      await fixture.whenStable();
      button('Done', dialog()!)!.click();
      await vi.waitFor(() => expect(dialog()).toBeNull());

      await openCreate();

      expect(text(dialog()?.querySelector('h2'))).toBe('Create an admin API key');
      expect(dialog()!.querySelector<HTMLInputElement>('#api-key-name')!.value).toBe('');
      expect(document.body.textContent).not.toContain(RAW_KEY);
    });

    it('says why a key was not created and keeps the form', async () => {
      await open();
      await openCreate();
      await submitName('Draft agent');

      (await vi.waitFor(() => http.expectOne({ method: 'POST', url: KEYS_URL }))).flush(
        { message: 'Forbidden resource' },
        { status: 403, statusText: 'Forbidden' },
      );
      await fixture.whenStable();

      expect(text(dialog()?.querySelector('[role="alert"]'))).toContain('Forbidden resource');
      expect(dialog()!.querySelector<HTMLInputElement>('#api-key-name')!.value).toBe('Draft agent');
      expect(rows().length).toBe(2);
    });
  });

  describe('revoking a key', () => {
    async function openRevoke(): Promise<void> {
      button('Revoke n8n lead intake')!.click();
      await fixture.whenStable();
    }

    it('warns that anything using the key stops working, and does nothing until confirmed', async () => {
      await open();

      await openRevoke();

      expect(text(dialog()?.querySelector('h2'))).toBe('Revoke n8n lead intake?');
      expect(text(dialog())).toContain('Anything that uses this key stops working right away.');
      http.expectNone({ method: 'DELETE', url: `${KEYS_URL}/${n8n.id}` });
    });

    it('leaves the key active when the person cancels', async () => {
      await open();
      await openRevoke();

      button('Cancel', dialog()!)!.click();
      await fixture.whenStable();

      http.expectNone({ method: 'DELETE', url: `${KEYS_URL}/${n8n.id}` });
      expect(rows()[0][4]).toBe('Active');
    });

    it('revokes it once confirmed, marks the row and takes the action away', async () => {
      await open();
      await openRevoke();

      button('Revoke key', dialog()!)!.click();
      const revoke = await vi.waitFor(() => http.expectOne({ method: 'DELETE', url: `${KEYS_URL}/${n8n.id}` }));
      revoke.flush({ ...n8n, revokedAt: '2026-10-25T10:00:00.000Z' });
      await vi.waitFor(() => expect(toasts()).toEqual(['Revoked n8n lead intake']));
      await fixture.whenStable();

      expect(rows()[0][4]).toBe('Revoked');
      expect(button('Revoke n8n lead intake')).toBeUndefined();
      await vi.waitFor(() => expect(dialog()).toBeNull());
    });

    it('says why a key was not revoked and leaves it active', async () => {
      await open();
      await openRevoke();

      button('Revoke key', dialog()!)!.click();
      (await vi.waitFor(() => http.expectOne({ method: 'DELETE', url: `${KEYS_URL}/${n8n.id}` }))).flush(
        { message: 'API key not found' },
        { status: 404, statusText: 'Not Found' },
      );
      await fixture.whenStable();

      expect(text(dialog()?.querySelector('[role="alert"]'))).toContain('API key not found');
      expect(rows()[0][4]).toBe('Active');
      expect(toasts()).toEqual([]);
    });
  });

  it('reports a list that will not load, and tries again on request', async () => {
    TestBed.tick();
    http.expectOne(KEYS_URL).flush({ message: 'Server error' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(text(el.querySelector('[role="alert"]'))).toContain('Could not load the admin API keys');
    expect(button('Create key')).toBeUndefined();

    button('Try again')!.click();
    TestBed.tick();
    http.expectOne(KEYS_URL).flush([n8n]);
    await fixture.whenStable();

    expect(rows().length).toBe(1);
  });
});
