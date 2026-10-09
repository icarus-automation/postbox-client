import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { GoogleSignIn } from './google-sign-in';

const SOCIAL_URL = `${environment.apiBaseUrl}/auth/sign-in/social`;

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('GoogleSignIn', () => {
  afterEach(() => vi.restoreAllMocks());

  // The client keeps the `fetch` it finds when the service is made, so each test stubs
  // fetch before it injects the service.

  it('starts Google with credentials and sends people back to this origin', async () => {
    // `redirect: false` keeps the client from leaving the test page for Google.
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(json({ url: 'https://accounts.google.com/o/oauth2/v2/auth', redirect: false }));

    await TestBed.inject(GoogleSignIn).continueWithGoogle();

    const call = fetch.mock.calls.find(([input]) => String(input) === SOCIAL_URL);
    expect(call).toBeDefined();
    const init = call![1]!;
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(String(init.body))).toMatchObject({
      provider: 'google',
      callbackURL: `${window.location.origin}/`,
      errorCallbackURL: `${window.location.origin}/login`,
    });
  });

  it('throws the API message when Google cannot start', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ message: 'Invalid callbackURL', code: 'INVALID_CALLBACK_URL' }, 403),
    );

    await expect(TestBed.inject(GoogleSignIn).continueWithGoogle()).rejects.toThrow(
      'Invalid callbackURL',
    );
  });
});
