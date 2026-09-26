import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SYSTEM_FIELDS } from '@core/lead-fields/lead-fields.testing';
import { environment } from '@env/environment';
import { routes } from './app.routes';

const ADMISSION_URL = `${environment.apiBaseUrl}/workspaces/admission`;
const LEADS_URL = `${environment.apiBaseUrl}/leads`;
const FIELDS_URL = `${LEADS_URL}/fields`;

const ADMITTED = {
  phase: 'admitted' as const,
  user: { id: 'u', name: 'Ace Owner', email: 'owner@local.test' },
  password: 'sealed' as const,
  workspaceUrlPrefix: 'handshakes.cards/',
  workspace: {
    id: 'o',
    name: 'Acme Inc',
    slug: 'acme-inc',
    website: null,
    logoUrl: null,
    role: 'owner' as const,
  },
};

const ONBOARDING = {
  phase: 'onboarding' as const,
  user: { id: 'u', name: 'Ace', email: 'ace@local.test' },
  password: 'open' as const,
  workspaceUrlPrefix: 'handshakes.cards/',
};

const SIGNED_OUT = { phase: 'signed-out' as const };

describe('app routes', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  /**
   * Starts a navigation and answers the one session read the guards make. Does not wait
   * for stability, because a page that loads data holds the app unstable until the
   * test answers that request too.
   */
  async function visit(url: string, admission: typeof ADMITTED | typeof ONBOARDING | typeof SIGNED_OUT): Promise<HTMLElement> {
    const navigation = harness.navigateByUrl(url);
    const read = await vi.waitFor(() => http.expectOne(ADMISSION_URL));
    read.flush(admission);
    await navigation;
    return harness.fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  it('shows the sign-up page to a signed-out visitor, outside the app chrome', async () => {
    const el = await visit('/sign-up', SIGNED_OUT);

    expect(TestBed.inject(Router).url).toBe('/sign-up');
    expect(el.querySelector('app-sign-up')).toBeTruthy();
    expect(el.querySelector('app-main-layout')).toBeNull();
  });

  it('shows the sign in page to a signed-out visitor', async () => {
    const el = await visit('/login', SIGNED_OUT);

    expect(el.querySelector('app-login')).toBeTruthy();
  });

  it('sends a signed-out visitor from the inbox to sign in', async () => {
    const el = await visit('/leads', SIGNED_OUT);

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fleads');
    expect(el.querySelector('app-login')).toBeTruthy();
  });

  it('sends a signed-out visitor from a lead to sign in', async () => {
    await visit('/leads/01a09ba4-75d2-7308-9384-7a9b2967e673', SIGNED_OUT);

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fleads%2F01a09ba4-75d2-7308-9384-7a9b2967e673');
    http.expectNone((request) => request.url.startsWith(LEADS_URL));
  });

  it('sends a signed-out visitor from lead fields to sign in, without reading the fields', async () => {
    const el = await visit('/settings/lead-fields', SIGNED_OUT);

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fsettings%2Flead-fields');
    expect(el.querySelector('app-login')).toBeTruthy();
    http.expectNone(FIELDS_URL);
  });

  it('sends a signed-in visitor from sign-up to the inbox inside the app chrome', async () => {
    const el = await visit('/sign-up', ADMITTED);

    const fields = await vi.waitFor(() => http.expectOne(FIELDS_URL));
    fields.flush(SYSTEM_FIELDS);
    const leads = await vi.waitFor(() => http.expectOne((request) => request.url === LEADS_URL));
    leads.flush({ data: [], meta: { total: 0, page: 1, limit: 20, lastPage: 1 } });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/leads');
    expect(el.querySelector('app-main-layout app-lead-list')).toBeTruthy();
    expect(el.querySelector('app-sign-up')).toBeNull();
  });

  it('opens settings inside the app chrome for a signed-in visitor', async () => {
    const el = await visit('/settings', ADMITTED);

    expect(TestBed.inject(Router).url).toBe('/settings');
    expect(el.querySelector('app-main-layout app-settings-home')).toBeTruthy();
    // Settings is a way in, not a screen that reads anything of its own.
    http.expectNone(FIELDS_URL);
  });

  it('sends a signed-in visitor with no workspace to create organization, outside the shell', async () => {
    const el = await visit('/leads', ONBOARDING);

    expect(TestBed.inject(Router).url).toBe('/create-organization');
    expect(el.querySelector('app-main-layout')).toBeNull();
    expect(el.querySelector('app-create-organization')).toBeTruthy();
    http.expectNone(LEADS_URL);
  });

  it('opens lead fields inside the app chrome for a signed-in visitor', async () => {
    const el = await visit('/settings/lead-fields', ADMITTED);

    const fields = await vi.waitFor(() => http.expectOne(FIELDS_URL));
    fields.flush(SYSTEM_FIELDS);
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/settings/lead-fields');
    expect(el.querySelector('app-main-layout app-lead-field-list')).toBeTruthy();
    expect(el.querySelectorAll('app-main-layout tbody tr').length).toBe(SYSTEM_FIELDS.length);
  });
});
