import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { MemberRole } from '@core/auth/auth.types';
import { signInAs } from '@core/auth/auth.testing';
import { SettingsHome } from './settings-home';

describe('SettingsHome', () => {
  let fixture: ComponentFixture<SettingsHome>;
  let el: HTMLElement;

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim();
  const sectionNamed = (name: string) =>
    [...el.querySelectorAll('section')].find((section) => text(section.querySelector('h2')) === name)!;

  async function open(role: MemberRole): Promise<void> {
    await signInAs(role);
    fixture = TestBed.createComponent(SettingsHome);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsHome],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('groups the screens under headings its sections are named by', async () => {
    await open('owner');

    const sections = [...el.querySelectorAll('section')];
    expect(sections.map((section) => text(section.querySelector('h2')))).toEqual([
      'General',
      'Website',
      'Blog',
      'Leads',
      'Advanced',
    ]);
    for (const section of sections) {
      expect(section.getAttribute('aria-labelledby')).toBe(section.querySelector('h2')?.id);
    }
  });

  it('opens lead fields from the Leads section', async () => {
    await open('owner');
    const link = el.querySelector<HTMLAnchorElement>('a[href="/settings/lead-fields"]')!;

    expect(text(link)).toBe('Lead fields');
    // The link covers its whole card, so a click anywhere in it opens the screen.
    expect(link.classList).toContain('after:absolute');
    expect(link.closest('div')?.classList).toContain('relative');
  });

  it('opens categories and tags from the Blog section', async () => {
    await open('owner');
    const blog = sectionNamed('Blog');

    expect(
      [...blog.querySelectorAll('a')].map((link) => [text(link), link.getAttribute('href')]),
    ).toEqual([
      ['Categories', '/settings/categories'],
      ['Tags', '/settings/tags'],
    ]);
  });

  it('opens organization from the General section', async () => {
    await open('owner');
    const link = el.querySelector<HTMLAnchorElement>('a[href="/settings/organization"]')!;

    expect(text(link)).toBe('Organization');
    expect(link.closest('div')?.className).not.toContain('border-dashed');
  });

  it('opens the integration key and Developers from the Website section', async () => {
    await open('owner');

    expect(
      [...sectionNamed('Website').querySelectorAll('a')].map((link) => [text(link), link.getAttribute('href')]),
    ).toEqual([
      ['Integration key', '/settings/integration-key'],
      ['Developers', '/developers'],
    ]);
  });

  it('puts the admin API keys under Advanced, marked server-only', async () => {
    await open('admin');
    const advanced = sectionNamed('Advanced');
    const link = advanced.querySelector<HTMLAnchorElement>('a[href="/settings/api-keys"]')!;

    expect(text(link)).toBe('Admin API keys');
    expect(text(advanced.querySelector('h3'))).toBe('Admin API keys Server-only');
    expect(text(advanced)).toContain('Keys for agents, scripts and servers that file drafts and read leads.');
  });

  it('keeps the keys and the developer screens from a member, who cannot use them', async () => {
    await open('member');

    expect([...el.querySelectorAll('section')].map((section) => text(section.querySelector('h2')))).toEqual([
      'General',
      'Blog',
      'Leads',
    ]);
    expect(el.querySelector('a[href="/settings/integration-key"]')).toBeNull();
    expect(el.querySelector('a[href="/settings/api-keys"]')).toBeNull();
    expect(el.querySelector('a[href="/developers"]')).toBeNull();
  });

  it('uses the wide page width', async () => {
    await open('owner');

    expect(el.classList).toContain('page-wide');
  });
});
