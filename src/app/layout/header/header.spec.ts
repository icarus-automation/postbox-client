import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Auth } from '@core/auth/auth';
import { environment } from '@env/environment';
import { Header } from './header';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
  });

  it('shows the brand as a link back to the inbox', () => {
    const brand = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(brand?.textContent?.trim()).toBe('Lead Inbox');
    expect(brand?.getAttribute('href')).toBe('/leads');
  });

  it('stays quiet about the user until a session is read', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
  });

  it('shows the signed-in email and a named sign out control', async () => {
    const restored = TestBed.inject(Auth).restore();
    http.expectOne(`${environment.apiBaseUrl}/auth/get-session`).flush({
      session: { id: 's', token: 't', userId: 'u', activeOrganizationId: 'o', expiresAt: '', createdAt: '', updatedAt: '', ipAddress: '', userAgent: '' },
      user: { id: 'u', name: 'Ace Owner', email: 'owner@local.test', emailVerified: false, image: null, createdAt: '', updatedAt: '' },
    });
    await restored;
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('owner@local.test');
    expect(el.querySelector('button')?.textContent?.trim()).toBe('Sign out');
  });

  it('gives phones, which have no sidebar, a named way into settings', async () => {
    const restored = TestBed.inject(Auth).restore();
    http.expectOne(`${environment.apiBaseUrl}/auth/get-session`).flush({
      session: { id: 's', token: 't', userId: 'u', activeOrganizationId: 'o', expiresAt: '', createdAt: '', updatedAt: '', ipAddress: '', userAgent: '' },
      user: { id: 'u', name: 'Ace Owner', email: 'owner@local.test', emailVerified: false, image: null, createdAt: '', updatedAt: '' },
    });
    await restored;
    await fixture.whenStable();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/settings"]');
    expect(link?.getAttribute('aria-label')).toBe('Settings');
    expect(link?.classList).toContain('md:hidden');
  });
});
