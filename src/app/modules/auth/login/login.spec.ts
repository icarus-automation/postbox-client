import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '@env/environment';
import { Login } from './login';

const BASE = `${environment.apiBaseUrl}/auth`;
const SIGN_IN_URL = `${BASE}/sign-in/email`;
const ADMISSION_URL = `${environment.apiBaseUrl}/workspaces/admission`;

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

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
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

  async function fillAndSubmit(): Promise<void> {
    type('#email', 'owner@local.test');
    type('#password', 'password123');
    await fixture.whenStable();
    submit();
    await fixture.whenStable();
  }

  /** Answers sign-in, then the admission read it sets off. */
  async function answerSignIn(): Promise<void> {
    http.expectOne(SIGN_IN_URL).flush({ token: 't', user: ADMITTED.user });

    const admission = await vi.waitFor(() => http.expectOne(ADMISSION_URL));
    admission.flush(ADMITTED);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('gives the screen one main landmark and both fields a label', () => {
    expect(el.querySelectorAll('main').length).toBe(1);

    for (const [id, text] of [
      ['email', 'Email'],
      ['password', 'Password'],
    ]) {
      expect(el.querySelector(`label[for="${id}"]`)?.textContent?.trim()).toBe(text);
      expect(el.querySelector(`input#${id}`)).toBeTruthy();
    }
  });

  it('links to the sign-up page', () => {
    const link = el.querySelector('a[href="/sign-up"]');

    expect(link?.textContent?.trim()).toBe('Create one');
    expect(el.textContent).not.toContain('no sign-up');
  });

  it('offers a live Google button', () => {
    const google = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Continue with Google'),
    )!;

    expect(google.disabled).toBe(false);
    expect(google.querySelector('svg')).toBeTruthy();
  });

  it('holds field errors back until the field has been touched', async () => {
    expect(fieldError('email-error')).toBeNull();

    el.querySelector<HTMLInputElement>('#email')!.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    const input = el.querySelector<HTMLInputElement>('#email')!;
    expect(fieldError('email-error')).toBe('Enter your email.');
    expect(input.getAttribute('aria-describedby')).toBe('email-error');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('does not call the API when the form is empty', async () => {
    submit();
    await fixture.whenStable();

    http.expectNone(SIGN_IN_URL);
    expect(fieldError('email-error')).toBe('Enter your email.');
    expect(fieldError('password-error')).toBe('Enter your password.');
  });

  it('sends one request when the form is submitted twice', async () => {
    await fillAndSubmit();
    submit();
    await fixture.whenStable();

    expect(http.match(SIGN_IN_URL).length).toBe(1);
  });

  it('signs in and lands on the inbox', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    await fillAndSubmit();

    const signIn = http.expectOne(SIGN_IN_URL);
    expect(signIn.request.body).toEqual({
      email: 'owner@local.test',
      password: 'password123',
    });
    signIn.flush({ token: 't', user: ADMITTED.user });

    const admission = await vi.waitFor(() => http.expectOne(ADMISSION_URL));
    admission.flush(ADMITTED);

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/leads'));
  });

  it('returns to the page the guard turned them away from', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentRef.setInput('returnUrl', '/leads/abc123');

    await fillAndSubmit();
    await answerSignIn();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/leads/abc123'));
  });

  it('refuses to follow a returnUrl that points off this site', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentRef.setInput('returnUrl', '//evil.example.com/steal');

    await fillAndSubmit();
    await answerSignIn();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith('/leads'));
  });

  it('does not blame the credentials when the next page fails to load', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockRejectedValue(
      new Error('Failed to fetch dynamically imported module'),
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await fillAndSubmit();
    await answerSignIn();

    const alert = await vi.waitFor(() => {
      const node = el.querySelector('[role="alert"]')!;
      expect(node.textContent).toContain('You are signed in');
      return node;
    });
    expect(alert.textContent).toContain('Could not open leads');
    expect(alert.textContent).not.toContain('Sign in failed');
  });

  it('shows a Google callback error and hides the raw code', async () => {
    fixture.componentRef.setInput('error', 'unable_to_link_account');
    await fixture.whenStable();

    const alert = el.querySelector('[role="alert"]')?.textContent ?? '';
    expect(alert).toContain('Google could not be linked to this account.');
    expect(alert).not.toContain('unable_to_link_account');
  });

  it('replaces an unknown Google callback code with one sentence', async () => {
    fixture.componentRef.setInput('error', '<script>');
    await fixture.whenStable();

    const alert = el.querySelector('[role="alert"]')?.textContent ?? '';
    expect(alert).toContain('Google sign-in did not finish.');
    expect(alert).not.toContain('<script>');
  });

  it('shows the message the API gave for bad credentials', async () => {
    await fillAndSubmit();

    http
      .expectOne(SIGN_IN_URL)
      .flush(
        { message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD' },
        { status: 401, statusText: 'Unauthorized' },
      );

    await vi.waitFor(() => {
      expect(el.querySelector('[role="alert"]')?.textContent).toContain('Invalid email or password');
    });
    expect(el.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(false);
  });
});
