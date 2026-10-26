import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { credentialsInterceptor } from '@core/api/credentials-interceptor';
import {
  Router,
  provideRouter,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { environment } from '@env/environment';
import type { Admission, MemberRole } from './auth.types';
import { authGuard, editorGuard, guestGuard, onboardingGuard } from './auth.guard';

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
      providers: [
        provideRouter([]),
        // As in app.config, so the guard's session read goes out the way the app sends it.
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  it('reads the session with credentials, so the cookie reaches the API', async () => {
    const pending = run(authGuard, '/leads');
    const read = http.expectOne(ADMISSION_URL);
    expect(read.request.withCredentials).toBe(true);
    read.flush(ADMITTED);

    expect(await pending).toBe(true);
  });

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

  describe('editorGuard', () => {
    function admittedAs(role: MemberRole): Admission {
      return {
        phase: 'admitted',
        user: { id: 'u', name: 'Ace Owner', email: 'owner@local.test' },
        password: 'sealed',
        workspaceUrlPrefix: 'handshakes.cards/',
        workspace: { id: 'o', name: 'Acme Inc', slug: 'acme-inc', website: null, logoUrl: null, role },
      };
    }

    it('lets an owner through', async () => {
      const owner = run(editorGuard, '/developers');
      http.expectOne(ADMISSION_URL).flush(admittedAs('owner'));
      expect(await owner).toBe(true);
    });

    it('lets an admin through, on the read the owner already made', async () => {
      const first = run(editorGuard, '/developers');
      http.expectOne(ADMISSION_URL).flush(admittedAs('admin'));
      expect(await first).toBe(true);

      expect(await run(editorGuard, '/settings/api-keys')).toBe(true);
    });

    it('sends a member back to the inbox', async () => {
      const pending = run(editorGuard, '/developers');
      http.expectOne(ADMISSION_URL).flush(admittedAs('member'));

      expect(router.serializeUrl((await pending) as UrlTree)).toBe('/leads');
    });

    it('sends anyone who is not admitted to the inbox, where the shell guard takes over', async () => {
      const pending = run(editorGuard, '/developers');
      http.expectOne(ADMISSION_URL).flush(SIGNED_OUT);

      expect(router.serializeUrl((await pending) as UrlTree)).toBe('/leads');
    });
  });
});
