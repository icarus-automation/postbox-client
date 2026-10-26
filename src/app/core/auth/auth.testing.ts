import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { Auth } from './auth';
import type { MemberRole } from './auth.types';

export const ADMISSION_URL = `${environment.apiBaseUrl}/workspaces/admission`;

/**
 * Signs the test in to an organization with the given role, through the same read the app
 * makes. The spec needs `provideHttpClient()` and `provideHttpClientTesting()`.
 */
export async function signInAs(role: MemberRole = 'owner', slug = 'acme-inc'): Promise<void> {
  const restored = TestBed.inject(Auth).restore();
  TestBed.inject(HttpTestingController)
    .expectOne(ADMISSION_URL)
    .flush({
      phase: 'admitted',
      user: { id: 'u', name: 'Ace Owner', email: 'owner@local.test' },
      password: 'sealed',
      workspaceUrlPrefix: 'handshakes.cards/',
      workspace: { id: 'o', name: 'Acme Inc', slug, website: null, logoUrl: null, role },
    });
  await restored;
}
