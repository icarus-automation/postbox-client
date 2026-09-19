import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '@env/environment';
import { SignUp } from './sign-up';

const BASE = `${environment.apiBaseUrl}/auth`;
const SIGN_UP_URL = `${BASE}/sign-up/email`;
const GET_SESSION_URL = `${BASE}/get-session`;

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

describe('SignUp', () => {
  let fixture: ComponentFixture<SignUp>;
  let http: HttpTestingController;
  let el: HTMLElement;

  function type(selector: string, value: string): void {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function submit(): void {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
  }

  /** The message a field is showing, or null while its error is hidden. */
  function fieldError(id: string): string | null {
    const node = el.querySelector(`#${id}`);
    return !node || node.hasAttribute('hidden') ? null : node.textContent!.replace(/\s+/g, ' ').trim();
  }

  async function fillAndSubmit(name = 'Ace Owner'): Promise<void> {
    type('#name', name);
    type('#email', 'owner@local.test');
    type('#password', 'password123');
    await fixture.whenStable();
    submit();
    await fixture.whenStable();
  }

  /** Answers sign-up, then the session read it sets off. */
  async function answerSignUp(): Promise<void> {
    http.expectOne(SIGN_UP_URL).flush({ token: 't', user: SESSION.user });

    const session = await vi.waitFor(() => http.expectOne(GET_SESSION_URL));
    session.flush(SESSION);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignUp],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SignUp);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('gives the screen one main landmark and every field a label', () => {
    expect(el.querySelectorAll('main').length).toBe(1);
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Create account');

    for (const [id, text] of [
      ['name', 'Name'],
      ['email', 'Email'],
      ['password', 'Password'],
    ]) {
      expect(el.querySelector(`label[for="${id}"]`)?.textContent?.trim()).toBe(text);
      expect(el.querySelector(`input#${id}`)).toBeTruthy();
    }
  });

  it('asks the browser for a new password rather than a saved one', () => {
    expect(el.querySelector('#password')?.getAttribute('autocomplete')).toBe('new-password');
  });

  it('offers Google as coming soon, the same as sign in', () => {
    const google = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Continue with Google'),
    )!;

    expect(google.disabled).toBe(true);
    expect(google.textContent).toContain('coming soon');
  });

  it('links back to sign in', () => {
    const link = el.querySelector('a[href="/login"]');

    expect(link?.textContent?.trim()).toBe('Sign in');
  });

  it('states the password rule up front and flags a short one', async () => {
    const password = el.querySelector<HTMLInputElement>('#password')!;
    expect(el.querySelector('#password-hint')?.textContent?.trim()).toBe('At least 8 characters.');
    expect(password.getAttribute('aria-describedby')).toBe('password-hint');
    expect(fieldError('password-error')).toBeNull();

    type('#password', 'short');
    password.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(fieldError('password-error')).toBe('Use at least 8 characters.');
    expect(el.querySelector('#password-hint')).toBeNull();
    expect(password.getAttribute('aria-describedby')).toBe('password-error');
    expect(password.getAttribute('aria-invalid')).toBe('true');
  });

  it('does not call the API while the form is incomplete', async () => {
    type('#name', '   ');
    submit();
    await fixture.whenStable();

    http.expectNone(SIGN_UP_URL);
    expect(fieldError('name-error')).toBe('Enter your name.');
    expect(fieldError('email-error')).toBe('Enter a valid email address.');
    expect(fieldError('password-error')).toBe('Use at least 8 characters.');
  });

  it('sends one request when the form is submitted twice', async () => {
    await fillAndSubmit();
    submit();
    await fixture.whenStable();

    expect(http.match(SIGN_UP_URL).length).toBe(1);
  });

  it('creates the account and lands on the inbox', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    await fillAndSubmit('  Ace Owner ');

    const signUp = http.expectOne(SIGN_UP_URL);
    expect(signUp.request.body).toEqual({
      name: 'Ace Owner',
      email: 'owner@local.test',
      password: 'password123',
    });
    signUp.flush({ token: 't', user: SESSION.user });

    const session = await vi.waitFor(() => http.expectOne(GET_SESSION_URL));
    session.flush(SESSION);

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/leads'));
  });

  it('shows the message the API gave when the email is taken', async () => {
    await fillAndSubmit();

    http
      .expectOne(SIGN_UP_URL)
      .flush(
        { message: 'User already exists. Use another email.', code: 'USER_ALREADY_EXISTS' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

    const alert = await vi.waitFor(() => {
      const node = el.querySelector('[role="alert"]')!;
      expect(node.textContent).toContain('User already exists. Use another email.');
      return node;
    });
    expect(alert.textContent).toContain('Sign up failed');
    expect(el.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false);
  });

  it('does not blame the form when the inbox fails to load', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockRejectedValue(
      new Error('Failed to fetch dynamically imported module'),
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await fillAndSubmit();
    await answerSignUp();

    const alert = await vi.waitFor(() => {
      const node = el.querySelector('[role="alert"]')!;
      expect(node.textContent).toContain('Your account is ready');
      return node;
    });
    expect(alert.textContent).toContain('Could not open leads');
    expect(alert.textContent).not.toContain('Sign up failed');
  });
});
