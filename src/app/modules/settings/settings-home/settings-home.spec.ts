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

    expect(sections.map((section) => text(section.querySelector('h2')))).toEqual(['General', 'Leads']);
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

  it('shows a screen that does not exist yet as Soon, with nowhere to click', () => {
    const heading = [...el.querySelectorAll('h3')].find((each) => text(each)?.startsWith('Organization'))!;

    expect(text(heading)).toBe('Organization Soon');
    expect(heading.querySelector('a')).toBeNull();
    expect(heading.closest('div')?.className).toContain('border-dashed');
  });

  it('uses the wide page width', () => {
    expect(el.classList).toContain('page-wide');
  });
});
