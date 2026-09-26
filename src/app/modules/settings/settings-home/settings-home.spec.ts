import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SettingsHome } from './settings-home';

describe('SettingsHome', () => {
  let fixture: ComponentFixture<SettingsHome>;
  let el: HTMLElement;

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsHome],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsHome);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('groups the screens under headings its sections are named by', () => {
    const sections = [...el.querySelectorAll('section')];

    expect(sections.map((section) => text(section.querySelector('h2')))).toEqual(['General', 'Blog', 'Leads']);
    for (const section of sections) {
      expect(section.getAttribute('aria-labelledby')).toBe(section.querySelector('h2')?.id);
    }
  });

  it('opens lead fields from the Leads section', () => {
    const link = el.querySelector<HTMLAnchorElement>('a[href="/settings/lead-fields"]')!;

    expect(text(link)).toBe('Lead fields');
    // The link covers its whole card, so a click anywhere in it opens the screen.
    expect(link.classList).toContain('after:absolute');
    expect(link.closest('div')?.classList).toContain('relative');
  });

  it('opens categories and tags from the Blog section', () => {
    const blog = [...el.querySelectorAll('section')].find(
      (section) => text(section.querySelector('h2')) === 'Blog',
    )!;

    expect(
      [...blog.querySelectorAll('a')].map((link) => [text(link), link.getAttribute('href')]),
    ).toEqual([
      ['Categories', '/settings/categories'],
      ['Tags', '/settings/tags'],
    ]);
  });

  it('opens organization from the General section', () => {
    const link = el.querySelector<HTMLAnchorElement>('a[href="/settings/organization"]')!;

    expect(text(link)).toBe('Organization');
    expect(link.closest('div')?.className).not.toContain('border-dashed');
  });

  it('uses the wide page width', () => {
    expect(el.classList).toContain('page-wide');
  });
});
