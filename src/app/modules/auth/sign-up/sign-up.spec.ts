import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { GoogleSignIn } from '@core/auth/google-sign-in';
import { environment } from '@env/environment';
import { SignUp } from './sign-up';

const SIGN_UP_URL = `${environment.apiBaseUrl}/auth/sign-up/email`;
const ADMISSION_URL = `${environment.apiBaseUrl}/workspaces/admission`;

const ONBOARDING = {
  phase: 'onboarding' as const,
  user: { id: 'u', name: 'Ace Owner', email: 'owner@local.test' },
  password: 'sealed' as const,
  workspaceUrlPrefix: 'handshakes.cards/',
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

  function googleButton(): HTMLButtonElement {
    return [...el.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Continue with Google'),
    )!;
  }

  async function fillAndSubmit(name = 'Ace Owner'): Promise<void> {
    type('#name', name);
    type('#email', 'owner@local.test');
    type('#password', 'password123');
    await fixture.whenStable();
    submit();
    await fixture.whenStable();
  }

  /** Answers sign-up, then the admission read it sets off. */
  async function answerSignUp(): Promise<void> {
    http.expectOne(SIGN_UP_URL).flush({ token: 't', user: ONBOARDING.user });

    const admission = await vi.waitFor(() => http.expectOne(ADMISSION_URL));
    admission.flush(ONBOARDING);
    await fixture.whenStable();
  }

  /** Refuses sign-up the way Better Auth does: `{ message, code }` and a status. */
  async function refuseSignUp(code: string, message: string, status: number): Promise<void> {
    http.expectOne(SIGN_UP_URL).flush({ code, message }, { status, statusText: 'Refused' });
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

  afterEach(() => http.verify());

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

  it('offers a live Google button beside the form', () => {
    expect(googleButton().disabled).toBe(false);
    expect(googleButton().querySelector('svg')).toBeTruthy();
  });

  it('starts Google when the button is pressed', async () => {
    const start = vi
      .spyOn(TestBed.inject(GoogleSignIn), 'continueWithGoogle')
      .mockResolvedValue();

    googleButton().click();
    await fixture.whenStable();

    expect(start).toHaveBeenCalledOnce();
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
    expect(fieldError('email-error')).toBe('Enter your email.');
    expect(fieldError('password-error')).toBe('Use at least 8 characters.');
  });

  it('sends one request when the form is submitted twice', async () => {
    await fillAndSubmit();
    submit();
    await fixture.whenStable();

    expect(http.match(SIGN_UP_URL).length).toBe(1);
  });

  it('creates the account, reads admission and continues to onboarding', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    await fillAndSubmit('  Ace Owner ');

    const signUp = http.expectOne(SIGN_UP_URL);
    expect(signUp.request.method).toBe('POST');
    expect(signUp.request.body).toEqual({
      name: 'Ace Owner',
      email: 'owner@local.test',
      password: 'password123',
    });
    signUp.flush({ token: 't', user: ONBOARDING.user });

    const admission = await vi.waitFor(() => http.expectOne(ADMISSION_URL));
    admission.flush(ONBOARDING);

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/create-organization'));
  });

  it('says on the email field when the email already has an account', async () => {
    await fillAndSubmit();
    await refuseSignUp(
      'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      'User already exists. Use another email.',
      422,
    );

    await vi.waitFor(() => {
      expect(fieldError('email-error')).toBe('This email already has an account. Sign in instead.');
    });
    expect(el.querySelector('#email')?.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('[data-slot="alert"]')).toBeNull();
    expect(el.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false);
  });

  it('clears the taken mark as soon as the email changes', async () => {
    await fillAndSubmit();
    await refuseSignUp(
      'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      'User already exists. Use another email.',
      422,
    );
    await vi.waitFor(() => expect(fieldError('email-error')).not.toBeNull());

    type('#email', 'second@local.test');
    await fixture.whenStable();

    expect(fieldError('email-error')).toBeNull();
  });

  it('puts the API refusing a weak password on the password field', async () => {
    await fillAndSubmit();
    await refuseSignUp('PASSWORD_TOO_SHORT', 'Password too short', 400);

    await vi.waitFor(() => {
      expect(fieldError('password-error')).toBe('Use at least 8 characters.');
    });
    expect(el.querySelector('[data-slot="alert"]')).toBeNull();
  });

  it('puts an address the API refuses on the email field', async () => {
    await fillAndSubmit();
    await refuseSignUp('VALIDATION_ERROR', '[body.email] Invalid email address', 400);

    await vi.waitFor(() => {
      expect(fieldError('email-error')).toBe('Enter a valid email address.');
    });
  });

  it('shows any other refusal in the alert', async () => {
    await fillAndSubmit();
    await refuseSignUp('FAILED_TO_CREATE_USER', 'Failed to create user', 422);

    const alert = await vi.waitFor(() => {
      const node = el.querySelector('[data-slot="alert"]')!;
      expect(node.textContent).toContain('Failed to create user');
      return node;
    });
    expect(alert.textContent).toContain('Sign up failed');
    expect(fieldError('email-error')).toBeNull();
  });

  it('does not blame the form when the next page fails to load', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockRejectedValue(
      new Error('Failed to fetch dynamically imported module'),
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await fillAndSubmit();
    await answerSignUp();

    const alert = await vi.waitFor(() => {
      const node = el.querySelector('[data-slot="alert"]')!;
      expect(node.textContent).toContain('Your account is ready');
      return node;
    });
    expect(alert.textContent).toContain('Could not continue');
    expect(alert.textContent).not.toContain('Sign up failed');
  });
});
