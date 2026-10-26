import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { MemberRole } from '@core/auth/auth.types';
import { signInAs } from '@core/auth/auth.testing';

import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let fixture: ComponentFixture<Sidebar>;

  const links = () =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('nav a')].map((link) => [
      link.textContent?.trim(),
      link.getAttribute('href'),
    ]);

  async function renderFor(role: MemberRole): Promise<void> {
    await signInAs(role);
    fixture = TestBed.createComponent(Sidebar);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should expose a labelled nav landmark', async () => {
    await renderFor('owner');

    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe('Main');
  });

  it('links an owner to the blog, the leads inbox, Developers, and settings', async () => {
    await renderFor('owner');

    expect(links()).toEqual([
      ['Blog', '/blog'],
      ['Leads', '/leads'],
      ['Developers', '/developers'],
      ['Settings', '/settings'],
    ]);
  });

  it('shows an admin the Developers link too', async () => {
    await renderFor('admin');

    expect(links().map(([name]) => name)).toContain('Developers');
  });

  it('keeps Developers from a member, because the page shows the integration key', async () => {
    await renderFor('member');

    expect(links()).toEqual([
      ['Blog', '/blog'],
      ['Leads', '/leads'],
      ['Settings', '/settings'],
    ]);
  });

  it('lists Developers with the work, above the settings link at the foot', async () => {
    await renderFor('owner');
    const el = fixture.nativeElement as HTMLElement;
    const [main, settings] = [...el.querySelectorAll('nav')];

    expect([...main.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toContain('/developers');
    expect(settings.querySelector('a[href="/developers"]')).toBeNull();
  });

  it('keeps settings at the foot of the column, out of the way of the work', async () => {
    await renderFor('owner');
    const el = fixture.nativeElement as HTMLElement;
    const [main, settings] = [...el.querySelectorAll('nav')];

    expect(main.getAttribute('aria-label')).toBe('Main');
    expect(settings.getAttribute('aria-label')).toBe('Settings');
    expect(main.classList).toContain('flex-1');
    expect(settings).toBe(main.nextElementSibling);
  });
});
