import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { toastState } from '@spartan-ng/brain/sonner';
import { signInAs } from '@core/auth/auth.testing';
import { environment } from '@env/environment';
import { Developers } from './developers';
import { agentPrompt, guideUrl } from './developer-snippets';

const KEY_URL = `${environment.apiBaseUrl}/integration-key`;
const KEY = 'pbi_k3y-for-acme';

describe('Developers', () => {
  let fixture: ComponentFixture<Developers>;
  let http: HttpTestingController;
  let el: HTMLElement;
  const writeText = vi.fn<(text: string) => Promise<void>>();

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim();
  const section = (id: string) => el.querySelector(`section[aria-labelledby="${id}"]`)!;
  const button = (label: string) =>
    [...el.querySelectorAll('button')].find((node) => node.getAttribute('aria-label') === label);
  const toasts = () => toastState.toasts().map((each) => each.title);

  async function open(): Promise<void> {
    await signInAs('owner', 'acme-inc');
    TestBed.tick();
    http.expectOne(KEY_URL).flush({ key: KEY });
    await fixture.whenStable();
  }

  beforeEach(async () => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await TestBed.configureTestingModule({
      imports: [Developers],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Developers);
    el = fixture.nativeElement as HTMLElement;
    toastState.dismiss();
  });

  afterEach(() => http.verify());

  it('uses the standard page width', () => {
    expect(el.classList).toContain('page-standard');
  });

  it('shows the real key, the API base URL and the organization slug at the top', async () => {
    await open();

    const rows = [...section('developers-connection').querySelectorAll('dl > div')];
    expect(rows.map((row) => [text(row.querySelector('dt')), text(row.querySelector('code'))])).toEqual([
      ['Integration key', KEY],
      ['API base URL', environment.apiBaseUrl],
      ['Organization slug', 'acme-inc'],
    ]);
    expect(text(el.querySelector('h1'))).toBe('Developers');
  });

  it('links to Settings to rotate the key', async () => {
    await open();

    const link = section('developers-connection').querySelector<HTMLAnchorElement>('a[href="/settings/integration-key"]')!;
    expect(text(link)).toBe('rotate it in Settings');
  });

  it('copies the key, the base URL and the slug', async () => {
    await open();

    button('Copy integration key')!.click();
    await vi.waitFor(() => expect(toasts()).toContain('Integration key copied'));
    button('Copy API base URL')!.click();
    button('Copy organization slug')!.click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(3));
    expect(writeText.mock.calls.map(([value]) => value)).toEqual([KEY, environment.apiBaseUrl, 'acme-inc']);
  });

  it('shows an agent prompt filled in for this organization, with a copy button that copies it', async () => {
    await open();
    const expected = agentPrompt({ apiBaseUrl: environment.apiBaseUrl, slug: 'acme-inc' });

    const prompt = section('developers-prompt').querySelector('pre')!;
    expect(prompt.textContent).toBe(expected);
    expect(prompt.textContent).toContain(`API base URL: ${environment.apiBaseUrl}`);
    expect(prompt.textContent).toContain('Organization slug: acme-inc');
    expect(prompt.textContent).toContain(guideUrl(environment.apiBaseUrl));
    expect(prompt.textContent).toContain('Next.js App Router');
    expect(prompt.textContent).not.toContain(KEY);

    button('Copy agent prompt')!.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(expected));
    await vi.waitFor(() => expect(toasts()).toContain('Agent prompt copied'));
  });

  it('makes the prompt readable and reachable for keyboard and screen reader users', async () => {
    await open();

    // A group, not a second region with the section's name.
    const prompt = section('developers-prompt').querySelector('pre')!;
    expect(prompt.getAttribute('role')).toBe('group');
    expect(prompt.getAttribute('aria-label')).toBe('Agent prompt');
    expect(prompt.getAttribute('tabindex')).toBe('0');
    expect(el.querySelector('#developers-prompt')?.textContent?.trim()).toBe('Paste this to your AI agent');
  });

  it('names each example for assistive tech and keeps it reachable by keyboard', async () => {
    await open();

    const example = section('developers-reference').querySelector('li pre')!;
    expect(example.getAttribute('role')).toBe('group');
    expect(example.getAttribute('aria-label')).toBe('Example: List posts');
    expect(example.getAttribute('tabindex')).toBe('0');
  });

  it('underlines the link in the sentence, so it does not rely on color', async () => {
    await open();

    const link = section('developers-connection').querySelector('p a')!;
    expect(link.classList).toContain('underline');
  });

  it('lists the quick reference, each item with one example for this organization', async () => {
    await open();

    const items = [...section('developers-reference').querySelectorAll('li')];
    expect(items.map((item) => text(item.querySelector('h3')))).toEqual([
      'List posts',
      'Get a post',
      'Filter by category and tag',
      'Submit a lead',
      'Webhook payload',
      'Check the webhook signature',
    ]);
    for (const item of items) {
      expect(item.querySelectorAll('pre').length).toBe(1);
    }
    expect(text(items[0].querySelector('pre'))).toContain(`${environment.apiBaseUrl}/public/acme-inc/blog/posts?limit=5`);
  });

  it('copies an example', async () => {
    await open();

    button('Copy example: Get a post')!.click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain('/public/acme-inc/blog/posts/spring-openings');
    await vi.waitFor(() => expect(toasts()).toContain('Get a post example copied'));
  });

  it('links to the full guide on the API, in a new tab', async () => {
    await open();

    const link = [...el.querySelectorAll<HTMLAnchorElement>('a')].find((a) => text(a)?.startsWith('Read the full guide'))!;
    expect(link.getAttribute('href')).toBe(`${environment.apiBaseUrl}/docs/integration.md`);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
    expect(text(link)).toContain('(opens in a new tab)');
  });

  it('says the key is safe in website code', async () => {
    await open();

    expect(text(section('developers-connection'))).toContain('safe in website code');
  });

  it('holds the key row on a placeholder while the key loads, and still shows the rest', async () => {
    await signInAs('owner', 'acme-inc');
    // The app is not stable while the key request is out, so render once and look.
    TestBed.tick();

    const connection = section('developers-connection');
    expect(text(connection.querySelector('[role="status"]'))).toBe('Loading the integration key');
    expect(connection.querySelectorAll('code').length).toBe(2);
    expect(button('Copy integration key')).toBeUndefined();

    http.expectOne(KEY_URL).flush({ key: KEY });
  });

  it('reports a key that will not load and tries again on request', async () => {
    await signInAs('owner', 'acme-inc');
    TestBed.tick();
    http.expectOne(KEY_URL).flush({ message: 'Integration key not found' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    const alert = el.querySelector('[role="alert"]')!;
    expect(text(alert)).toContain('Could not load the integration key');
    expect(text(alert)).toContain('Integration key not found');
    expect(
      alert.querySelector<HTMLAnchorElement>('a[href="/settings/integration-key"]'),
    ).not.toBeNull();

    [...alert.querySelectorAll('button')].find((node) => text(node) === 'Try again')!.click();
    TestBed.tick();
    http.expectOne(KEY_URL).flush({ key: KEY });
    await fixture.whenStable();

    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(text(el.querySelector('dl code'))).toBe(KEY);
  });
});
