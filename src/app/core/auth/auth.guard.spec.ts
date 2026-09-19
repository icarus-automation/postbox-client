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
import { authGuard, guestGuard } from './auth.guard';

const GET_SESSION = `${environment.apiBaseUrl}/auth/get-session`;

const SESSION = {
  session: {
    id: 's',
    token: 't',
    userId: 'u',
    activeOrganizationId: 'o',
    expiresAt: '',
    createdAt: '',
    updatedAt: '',
    ipAddress: '',
    userAgent: '',
  },
  user: {
    id: 'u',
    name: 'Ace Owner',
    email: 'owner@local.test',
    emailVerified: false,
    image: null,
    createdAt: '',
    updatedAt: '',
  },
};

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
    http.expectOne(GET_SESSION).flush(null);

    expect(router.serializeUrl((await pending) as UrlTree)).toBe(
      '/login?returnUrl=%2Fleads%2Fabc123',
    );
  });

  it('lets a signed-in visitor through', async () => {
    const pending = run(authGuard, '/leads');
    http.expectOne(GET_SESSION).flush(SESSION);

    expect(await pending).toBe(true);
  });

  it('bounces a signed-in visitor off the login screen', async () => {
    const pending = run(guestGuard, '/login');
    http.expectOne(GET_SESSION).flush(SESSION);

    expect(router.serializeUrl((await pending) as UrlTree)).toBe('/leads');
  });

  it('lets a signed-out visitor reach the login screen', async () => {
    const pending = run(guestGuard, '/login');
    http.expectOne(GET_SESSION).flush(null);

    expect(await pending).toBe(true);
  });
});
