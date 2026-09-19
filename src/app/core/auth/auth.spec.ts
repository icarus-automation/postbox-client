import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { Auth } from './auth';
import type { SessionResponse } from './auth.types';

const BASE = `${environment.apiBaseUrl}/auth`;

const SESSION: SessionResponse = {
  session: {
    id: 'sess-1',
    token: 'tok-1',
    userId: 'user-1',
    activeOrganizationId: 'org-1',
    expiresAt: '2026-09-19T16:39:57.034Z',
    createdAt: '2026-09-12T16:39:57.034Z',
    updatedAt: '2026-09-12T16:39:57.034Z',
    ipAddress: '',
    userAgent: 'test',
  },
  user: {
    id: 'user-1',
    name: 'Ace Owner',
    email: 'owner@local.test',
    emailVerified: false,
    image: null,
    createdAt: '2026-09-12T16:39:42.899Z',
    updatedAt: '2026-09-12T16:39:42.899Z',
  },
};

describe('Auth', () => {
  let auth: Auth;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    auth = TestBed.inject(Auth);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the session once and serves the cached answer after that', async () => {
    const pending = auth.restore();
    http.expectOne(`${BASE}/get-session`).flush(SESSION);

    expect(await pending).toEqual(SESSION);
    expect(auth.isSignedIn()).toBe(true);
    expect(auth.user()?.email).toBe('owner@local.test');

    // A second restore must not reach the API again.
    expect(await auth.restore()).toEqual(SESSION);
  });

  it('treats the literal null body as signed out', async () => {
    const pending = auth.restore();
    http.expectOne(`${BASE}/get-session`).flush(null);

    expect(await pending).toBeNull();
    expect(auth.isSignedIn()).toBe(false);
    expect(auth.user()).toBeNull();
  });

  it('shares one request between callers that restore at the same time', async () => {
    const first = auth.restore();
    const second = auth.restore();

    http.expectOne(`${BASE}/get-session`).flush(SESSION);

    expect(await first).toEqual(SESSION);
    expect(await second).toEqual(SESSION);
  });

  it('does not cache a failed read, so the next navigation tries again', async () => {
    const pending = auth.restore();
    http.expectOne(`${BASE}/get-session`).flush('', { status: 500, statusText: 'Server Error' });

    expect(await pending).toBeNull();

    const retry = auth.restore();
    http.expectOne(`${BASE}/get-session`).flush(SESSION);
    expect(await retry).toEqual(SESSION);
  });

  it('reads the canonical session back after signing in', async () => {
    const pending = auth.signIn('owner@local.test', 'password123');

    const signIn = http.expectOne(`${BASE}/sign-in/email`);
    expect(signIn.request.method).toBe('POST');
    expect(signIn.request.body).toEqual({ email: 'owner@local.test', password: 'password123' });
    signIn.flush({ token: 'tok-1', user: SESSION.user });

    const session = await vi.waitFor(() => http.expectOne(`${BASE}/get-session`));
    session.flush(SESSION);

    await pending;
    expect(auth.session()?.session.activeOrganizationId).toBe('org-1');
  });

  it('creates the account, then reads the session it signed in with', async () => {
    const pending = auth.signUp('Ace Owner', 'owner@local.test', 'password123');

    const signUp = http.expectOne(`${BASE}/sign-up/email`);
    expect(signUp.request.method).toBe('POST');
    expect(signUp.request.body).toEqual({
      name: 'Ace Owner',
      email: 'owner@local.test',
      password: 'password123',
    });
    signUp.flush({ token: 'tok-1', user: SESSION.user });

    const session = await vi.waitFor(() => http.expectOne(`${BASE}/get-session`));
    session.flush(SESSION);

    await pending;
    expect(auth.isSignedIn()).toBe(true);
    expect(auth.session()?.session.activeOrganizationId).toBe('org-1');
  });

  it('leaves the visitor signed out when sign-up is refused', async () => {
    const pending = auth.signUp('Ace Owner', 'owner@local.test', 'password123');

    http
      .expectOne(`${BASE}/sign-up/email`)
      .flush(
        { message: 'User already exists. Use another email.', code: 'USER_ALREADY_EXISTS' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

    await expect(pending).rejects.toBeDefined();
    expect(auth.isSignedIn()).toBe(false);
  });

  it('clears the session even when sign-out fails', async () => {
    const restored = auth.restore();
    http.expectOne(`${BASE}/get-session`).flush(SESSION);
    await restored;

    const pending = auth.signOut();
    http.expectOne(`${BASE}/sign-out`).flush('', { status: 500, statusText: 'Server Error' });

    await expect(pending).rejects.toBeDefined();
    expect(auth.isSignedIn()).toBe(false);
  });

  it('forgets the session without calling the API', async () => {
    const restored = auth.restore();
    http.expectOne(`${BASE}/get-session`).flush(SESSION);
    await restored;

    auth.forget();

    expect(auth.isSignedIn()).toBe(false);
    expect(await auth.restore()).toBeNull();
  });
});
