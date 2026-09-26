import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GoogleSignIn } from '@core/auth/google-sign-in';
import { SignUp } from './sign-up';

describe('SignUp', () => {
  let fixture: ComponentFixture<SignUp>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignUp],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(SignUp);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('gives the screen one main landmark and no email form', () => {
    expect(el.querySelectorAll('main').length).toBe(1);
    expect(el.querySelector('input[type="email"]')).toBeNull();
    expect(el.querySelector('input[type="password"]')).toBeNull();
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Create account');
  });

  it('offers a live Google button', () => {
    const google = [...el.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Continue with Google'),
    )!;

    expect(google.disabled).toBe(false);
    expect(google.querySelector('svg')).toBeTruthy();
  });

  it('starts Google when the button is pressed', async () => {
    const start = vi
      .spyOn(TestBed.inject(GoogleSignIn), 'continueWithGoogle')
      .mockResolvedValue();

    const google = [...el.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Continue with Google'),
    )!;
    google.click();
    await fixture.whenStable();

    expect(start).toHaveBeenCalledOnce();
  });

  it('links back to sign in', () => {
    const link = el.querySelector('a[href="/login"]');
    expect(link?.textContent?.trim()).toBe('Sign in');
  });
});
