import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthShell } from './auth-shell';

@Component({
  imports: [AuthShell],
  template: `
    <app-auth-shell heading="Sign in to Lead Inbox" description="Enter your email and password.">
      <form id="projected-form"></form>
      <p authShellFooter>No account yet?</p>
    </app-auth-shell>
  `,
})
class Host {}

describe('AuthShell', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();

    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  it('supplies the one main landmark, since these screens sit outside MainLayout', () => {
    const mains = el.querySelectorAll('main');

    expect(mains.length).toBe(1);
    expect(mains[0].id).toBe('main-content');
  });

  it('puts the heading and description on a single card', () => {
    const card = el.querySelector('main [data-slot="card"]')!;

    expect(el.querySelectorAll('[data-slot="card"]').length).toBe(1);
    expect(card.querySelector('h1')?.textContent?.trim()).toBe('Sign in to Lead Inbox');
    expect(card.textContent).toContain('Enter your email and password.');
  });

  it('shows Google as coming soon and never as a live button', () => {
    const google = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Continue with Google'),
    )!;

    expect(google.disabled).toBe(true);
    expect(google.textContent).toContain('Soon');
    expect(google.querySelector('.sr-only')?.textContent).toContain('coming soon');
  });

  it('projects the form into the card and the footer below it', () => {
    const card = el.querySelector('[data-slot="card"]')!;

    expect(card.querySelector('[data-slot="card-content"] #projected-form')).toBeTruthy();
    expect(card.querySelector('[data-slot="card-footer"]')?.textContent).toContain('No account yet?');
  });
});
