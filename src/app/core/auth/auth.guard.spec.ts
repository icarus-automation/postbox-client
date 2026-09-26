import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  Router,
  provideRouter,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { environment } from '@env/environment';
import type { Admission } from './auth.types';
import { authGuard, guestGuard, onboardingGuard } from './auth.guard';

const ADMISSION_URL = `${environment.apiBaseUrl}/workspaces/admission`;

const ADMITTED: Admission = {
  phase: 'admitted',
  user: { id: 'u', name: 'Ace Owner', email: 'owner@local.test' },
  password: 'sealed',
  workspaceUrlPrefix: 'handshakes.cards/',
  workspace: {
    id: 'o',
    name: 'Acme Inc',
    slug: 'acme-inc',
    website: null,
    logoUrl: null,
    role: 'owner',
  },
};

const ONBOARDING: Admission = {
  phase: 'onboarding',
  user: { id: 'u', name: 'Ace', email: 'ace@local.test' },
  password: 'open',
  workspaceUrlPrefix: 'handshakes.cards/',
};

const SIGNED_OUT: Admission = { phase: 'signed-out' };

describe('auth guards', () => {
  let http: HttpTestingController;
  let router: Router;

  function run(guard: typeof authGuard, url: string) {
    return TestBed.runInInjectionContext(
      () =>
        guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot) as Promise<
          boolean | UrlTree
        >,
    );
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  it('sends a signed-out visitor to login and remembers where they aimed', async () => {
    const pending = run(authGuard, '/leads/abc123');
    http.expectOne(ADMISSION_URL).flush(SIGNED_OUT);

    expect(router.serializeUrl((await pending) as UrlTree)).toBe(
      '/login?returnUrl=%2Fleads%2Fabc123',
    );
  });

  it('sends onboarding away from the shell to create organization', async () => {
    const pending = run(authGuard, '/leads');
    http.expectOne(ADMISSION_URL).flush(ONBOARDING);

    expect(router.serializeUrl((await pending) as UrlTree)).toBe('/create-organization');
  });

  it('lets an admitted visitor into the shell', async () => {
    const pending = run(authGuard, '/leads');
    http.expectOne(ADMISSION_URL).flush(ADMITTED);

    expect(await pending).toBe(true);
  });

  it('bounces an admitted visitor off the login screen', async () => {
    const pending = run(guestGuard, '/login');
    http.expectOne(ADMISSION_URL).flush(ADMITTED);

    expect(router.serializeUrl((await pending) as UrlTree)).toBe('/leads');
  });

  it('sends onboarding from login to create organization', async () => {
    const pending = run(guestGuard, '/login');
    http.expectOne(ADMISSION_URL).flush(ONBOARDING);

    expect(router.serializeUrl((await pending) as UrlTree)).toBe('/create-organization');
  });

  it('lets a signed-out visitor reach the login screen', async () => {
    const pending = run(guestGuard, '/login');
    http.expectOne(ADMISSION_URL).flush(SIGNED_OUT);

    expect(await pending).toBe(true);
  });

  it('lets onboarding open the create screen', async () => {
    const pending = run(onboardingGuard, '/create-organization');
    http.expectOne(ADMISSION_URL).flush(ONBOARDING);
    expect(await pending).toBe(true);
  });

  it('sends an admitted visitor from the create screen to leads', async () => {
    const pending = run(onboardingGuard, '/create-organization');
    http.expectOne(ADMISSION_URL).flush(ADMITTED);
    expect(router.serializeUrl((await pending) as UrlTree)).toBe('/leads');
  });
});
