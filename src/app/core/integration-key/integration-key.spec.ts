import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { IntegrationKey } from './integration-key';

const KEY_URL = `${environment.apiBaseUrl}/integration-key`;

describe('IntegrationKey', () => {
  let service: IntegrationKey;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });

    service = TestBed.inject(IntegrationKey);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the key of the signed-in organization', async () => {
    const key = TestBed.runInInjectionContext(() => service.current());
    TestBed.tick();

    const request = http.expectOne(KEY_URL);
    expect(request.request.method).toBe('GET');
    request.flush({ key: 'pbi_live' });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(key.value()).toEqual({ key: 'pbi_live' });
  });

  it('gives each screen a fresh read rather than a shared copy', () => {
    TestBed.runInInjectionContext(() => service.current());
    TestBed.runInInjectionContext(() => service.current());
    TestBed.tick();

    const reads = http.match(KEY_URL);
    expect(reads.length).toBe(2);
    reads.forEach((read) => read.flush({ key: 'pbi_live' }));
  });

  it('rotates with a POST and resolves with the new key', async () => {
    const rotated = service.rotate();

    const request = http.expectOne(`${KEY_URL}/rotate`);
    expect(request.request.method).toBe('POST');
    request.flush({ key: 'pbi_new' });

    await expect(rotated).resolves.toEqual({ key: 'pbi_new' });
  });
});
