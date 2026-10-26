import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { toastState } from '@spartan-ng/brain/sonner';
import { environment } from '@env/environment';
import { IntegrationKeySettings } from './integration-key-settings';

const KEY_URL = `${environment.apiBaseUrl}/integration-key`;
const ROTATE_URL = `${KEY_URL}/rotate`;
const OLD_KEY = 'pbi_old-key';
const NEW_KEY = 'pbi_new-key';

describe('IntegrationKeySettings', () => {
  let fixture: ComponentFixture<IntegrationKeySettings>;
  let http: HttpTestingController;
  let el: HTMLElement;
  const writeText = vi.fn<(text: string) => Promise<void>>();

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim();
  const dialog = () => document.querySelector<HTMLElement>('[data-slot="dialog-content"]');
  const button = (label: string, root: ParentNode = el) =>
    [...root.querySelectorAll('button')].find(
      (node) => node.getAttribute('aria-label') === label || text(node) === label,
    );
  const toasts = () => toastState.toasts().map((each) => each.title);

  async function open(): Promise<void> {
    TestBed.tick();
    http.expectOne(KEY_URL).flush({ key: OLD_KEY });
    await fixture.whenStable();
  }

  beforeEach(async () => {
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    await TestBed.configureTestingModule({
      imports: [IntegrationKeySettings],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(IntegrationKeySettings);
    el = fixture.nativeElement as HTMLElement;
    toastState.dismiss();
  });

  afterEach(() => http.verify());

  it('uses the standard page width and goes back to settings', async () => {
    await open();

    expect(el.classList).toContain('page-standard');
    expect(el.querySelector('a[href="/settings"]')).not.toBeNull();
    expect(text(el.querySelector('h1'))).toBe('Integration key');
  });

  it('shows the key in full, with copy and rotate', async () => {
    await open();

    expect(text(el.querySelector('code'))).toBe(OLD_KEY);
    expect(button('Copy integration key')).toBeDefined();
    expect(button('Rotate key')).toBeDefined();
    expect(text(el)).toContain('safe in website code');
  });

  it('copies the key', async () => {
    await open();

    button('Copy integration key')!.click();

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(OLD_KEY));
    await vi.waitFor(() => expect(toasts()).toEqual(['Integration key copied']));
  });

  it('points to Developers for connecting a site', async () => {
    await open();

    expect(el.querySelector('a[href="/developers"]')).not.toBeNull();
  });

  it('asks before rotating, and says the old key stops working at once', async () => {
    await open();

    button('Rotate key')!.click();
    await fixture.whenStable();

    expect(text(dialog()?.querySelector('h2'))).toBe('Rotate the integration key?');
    expect(text(dialog())).toContain('The current key stops working right away');
    http.expectNone(ROTATE_URL);
  });

  it('leaves the key alone when the person cancels', async () => {
    await open();

    button('Rotate key')!.click();
    await fixture.whenStable();
    button('Cancel', dialog()!)!.click();
    await fixture.whenStable();

    http.expectNone(ROTATE_URL);
    expect(text(el.querySelector('code'))).toBe(OLD_KEY);
  });

  it('rotates after the person confirms, and shows the new key', async () => {
    await open();

    button('Rotate key')!.click();
    await fixture.whenStable();
    button('Rotate key', dialog()!)!.click();
    const rotate = await vi.waitFor(() => http.expectOne({ method: 'POST', url: ROTATE_URL }));
    rotate.flush({ key: NEW_KEY });
    await vi.waitFor(() => expect(toasts()).toEqual(['Integration key rotated']));
    await fixture.whenStable();

    expect(text(el.querySelector('code'))).toBe(NEW_KEY);
    expect(text(el)).not.toContain(OLD_KEY);

    button('Copy integration key')!.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(NEW_KEY));
  });

  it('keeps the old key on screen and says why when rotating fails', async () => {
    await open();

    button('Rotate key')!.click();
    await fixture.whenStable();
    button('Rotate key', dialog()!)!.click();
    const rotate = await vi.waitFor(() => http.expectOne({ method: 'POST', url: ROTATE_URL }));
    rotate.flush({ message: 'Forbidden resource' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();

    expect(text(dialog()?.querySelector('[role="alert"]'))).toContain('Forbidden resource');
    expect(text(el.querySelector('code'))).toBe(OLD_KEY);
    expect(toasts()).toEqual([]);
  });

  it('reports a key that will not load, and tries again on request', async () => {
    TestBed.tick();
    http.expectOne(KEY_URL).flush({ message: 'Server error' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(text(el.querySelector('[role="alert"]'))).toContain('Could not load the integration key');
    expect(button('Create a key')).toBeUndefined();

    button('Try again')!.click();
    TestBed.tick();
    http.expectOne(KEY_URL).flush({ key: OLD_KEY });
    await fixture.whenStable();

    expect(text(el.querySelector('code'))).toBe(OLD_KEY);
  });

  it('offers to create a key for an organization that has none', async () => {
    TestBed.tick();
    http.expectOne(KEY_URL).flush({ message: 'Integration key not found' }, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(text(el.querySelector('[role="alert"]'))).toContain('No integration key yet');

    button('Create a key')!.click();
    const rotate = await vi.waitFor(() => http.expectOne({ method: 'POST', url: ROTATE_URL }));
    rotate.flush({ key: NEW_KEY });
    await fixture.whenStable();

    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(text(el.querySelector('code'))).toBe(NEW_KEY);
  });
});
