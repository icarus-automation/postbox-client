import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { credentialsInterceptor } from '@core/api/credentials-interceptor';
import { environment } from '@env/environment';
import { Auth } from './auth';
import type { Admission } from './auth.types';

const ADMISSION_URL = `${environment.apiBaseUrl}/workspaces/admission`;
const AUTH_URL = `${environment.apiBaseUrl}/auth`;

const ADMITTED: Admission = {
  phase: 'admitted',
  user: { id: 'user-1', name: 'Ace Owner', email: 'owner@local.test' },
  password: 'sealed',
  workspaceUrlPrefix: 'handshakes.cards/',
  workspace: {
    id: 'org-1',
    name: 'Acme Inc',
    slug: 'acme-inc',
    website: null,
    logoUrl: null,
    role: 'owner',
  },
};

const ONBOARDING: Admission = {
  phase: 'onboarding',
  user: { id: 'user-2', name: 'Ada Lovelace', email: 'ada@local.test' },
  password: 'sealed',
  workspaceUrlPrefix: 'handshakes.cards/',
};

const SIGNED_OUT: Admission = { phase: 'signed-out' };

describe('Auth', () => {
  let auth: Auth;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // The credentials interceptor runs as it does in app.config, so these tests also
      // see whether the session cookie travels.
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    auth = TestBed.inject(Auth);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads admission once and serves the cached answer after that', async () => {
    const pending = auth.restore();
    http.expectOne(ADMISSION_URL).flush(ADMITTED);

    expect(await pending).toEqual(ADMITTED);
    expect(auth.isSignedIn()).toBe(true);
    expect(auth.user()?.email).toBe('owner@local.test');
    expect(auth.workspace()?.slug).toBe('acme-inc');

    expect(await auth.restore()).toEqual(ADMITTED);
  });

  it('treats a signed-out body as signed out', async () => {
    const pending = auth.restore();
    http.expectOne(ADMISSION_URL).flush(SIGNED_OUT);

    expect(await pending).toEqual(SIGNED_OUT);
    expect(auth.isSignedIn()).toBe(false);
    expect(auth.user()).toBeNull();
  });

  it('shares one request between callers that restore at the same time', async () => {
    const first = auth.restore();
    const second = auth.restore();

    http.expectOne(ADMISSION_URL).flush(ADMITTED);

    expect(await first).toEqual(ADMITTED);
    expect(await second).toEqual(ADMITTED);
  });

  it('does not cache a failed read, so the next navigation tries again', async () => {
    const pending = auth.restore();
    http.expectOne(ADMISSION_URL).flush('', { status: 500, statusText: 'Server Error' });

    expect(await pending).toEqual(SIGNED_OUT);

    const retry = auth.restore();
    http.expectOne(ADMISSION_URL).flush(ADMITTED);
    expect(await retry).toEqual(ADMITTED);
  });

  it('reads admission after signing in', async () => {
    const pending = auth.signIn('owner@local.test', 'password123');

    const signIn = http.expectOne(`${environment.apiBaseUrl}/auth/sign-in/email`);
    expect(signIn.request.method).toBe('POST');
    expect(signIn.request.body).toEqual({ email: 'owner@local.test', password: 'password123' });
    signIn.flush({ token: 'tok-1', user: { email: 'owner@local.test' } });

    const admission = await vi.waitFor(() => http.expectOne(ADMISSION_URL));
    admission.flush(ADMITTED);

    expect(await pending).toEqual(ADMITTED);
    expect(auth.workspace()?.id).toBe('org-1');
  });

  it('signs up, then reads admission for the new account', async () => {
    const pending = auth.signUp('Ada Lovelace', 'ada@local.test', 'correct-horse');

    const signUp = http.expectOne(`${AUTH_URL}/sign-up/email`);
    expect(signUp.request.method).toBe('POST');
    expect(signUp.request.body).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@local.test',
      password: 'correct-horse',
    });
    signUp.flush({ token: 'tok-2', user: ONBOARDING.user });

    const admission = await vi.waitFor(() => http.expectOne(ADMISSION_URL));
    admission.flush(ONBOARDING);

    expect(await pending).toEqual(ONBOARDING);
    expect(auth.isSignedIn()).toBe(true);
    expect(auth.workspace()).toBeNull();
  });

  it('sends the session cookie with every auth and session request', async () => {
    /** Answers one request after checking it opted in to credentials. */
    async function answer(url: string, body: object): Promise<void> {
      const request = await vi.waitFor(() => http.expectOne(url));
      expect(request.request.withCredentials).toBe(true);
      request.flush(body);
    }

    const restored = auth.restore();
    await answer(ADMISSION_URL, SIGNED_OUT);
    await restored;

    const signedUp = auth.signUp('Ada Lovelace', 'ada@local.test', 'correct-horse');
    await answer(`${AUTH_URL}/sign-up/email`, { token: 'tok-2' });
    await answer(ADMISSION_URL, ONBOARDING);
    await signedUp;

    const signedOut = auth.signOut();
    await answer(`${AUTH_URL}/sign-out`, { success: true });
    await signedOut;

    const signedIn = auth.signIn('owner@local.test', 'password123');
    await answer(`${AUTH_URL}/sign-in/email`, { token: 'tok-1' });
    await answer(ADMISSION_URL, ADMITTED);
    await signedIn;
  });

  it('clears admission even when sign-out fails', async () => {
    const restored = auth.restore();
    http.expectOne(ADMISSION_URL).flush(ADMITTED);
    await restored;

    const pending = auth.signOut();
    http.expectOne(`${environment.apiBaseUrl}/auth/sign-out`).flush('', {
      status: 500,
      statusText: 'Server Error',
    });

    await expect(pending).rejects.toBeDefined();
    expect(auth.isSignedIn()).toBe(false);
  });

  it('forgets admission without calling the API', async () => {
    const restored = auth.restore();
    http.expectOne(ADMISSION_URL).flush(ADMITTED);
    await restored;

    auth.forget();

    expect(auth.isSignedIn()).toBe(false);
    expect(await auth.restore()).toEqual(SIGNED_OUT);
  });

  it('posts a new password and reloads admission', async () => {
    const pending = auth.setPassword('correct-horse');

    const setPassword = http.expectOne(`${environment.apiBaseUrl}/account/password`);
    expect(setPassword.request.body).toEqual({ newPassword: 'correct-horse' });
    setPassword.flush({ status: true });

    const sealed: Admission = { ...ADMITTED, password: 'sealed' };
    const admission = await vi.waitFor(() => http.expectOne(ADMISSION_URL));
    admission.flush(sealed);

    await pending;
    expect(auth.admission()).toEqual(sealed);
  });
});
