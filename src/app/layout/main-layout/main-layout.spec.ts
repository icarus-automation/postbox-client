import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MainLayout } from './main-layout';

describe('MainLayout', () => {
  let fixture: ComponentFixture<MainLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayout);
    await fixture.whenStable();
  });

  it('should render header, sidebar and a skip link', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-header')).toBeTruthy();
    expect(el.querySelector('app-sidebar')).toBeTruthy();
    expect(el.querySelector('a[href="#main-content"]')).toBeTruthy();
  });

  it('owns the single main landmark the pages render into', () => {
    const mains = (fixture.nativeElement as HTMLElement).querySelectorAll('main');
    expect(mains.length).toBe(1);
    expect(mains[0].id).toBe('main-content');
  });

  it('gives the top bar and the main column the same side gutter', () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('app-header header')?.classList).toContain('shell-gutter');
    expect(el.querySelector('main')?.classList).toContain('shell-gutter');
  });

  it('leaves the page width to the page, with no centered column of its own', () => {
    const main = (fixture.nativeElement as HTMLElement).querySelector('main')!;

    expect(main.className).not.toMatch(/\bmax-w-|\bmx-auto\b/);
    expect(main.querySelector('[class*="max-w-"]')).toBeNull();
  });
});
