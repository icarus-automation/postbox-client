import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let fixture: ComponentFixture<Sidebar>;

  const links = () => [...(fixture.nativeElement as HTMLElement).querySelectorAll('nav a')];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    await fixture.whenStable();
  });

  it('should expose a labelled nav landmark', () => {
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe('Main');
  });

  it('links to content, the leads inbox, and settings', () => {
    expect(links().map((link) => [link.textContent?.trim(), link.getAttribute('href')])).toEqual([
      ['Content', '/content'],
      ['Leads', '/leads'],
      ['Settings', '/settings'],
    ]);
  });

  it('keeps settings at the foot of the column, out of the way of the work', () => {
    const el = fixture.nativeElement as HTMLElement;
    const [main, settings] = [...el.querySelectorAll('nav')];

    expect(main.getAttribute('aria-label')).toBe('Main');
    expect(settings.getAttribute('aria-label')).toBe('Settings');
    expect(main.classList).toContain('flex-1');
    expect(settings).toBe(main.nextElementSibling);
  });
});
