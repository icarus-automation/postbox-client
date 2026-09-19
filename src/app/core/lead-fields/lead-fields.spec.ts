import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { LeadFields } from './lead-fields';
import { CUSTOM_FIELDS, SYSTEM_FIELDS } from './lead-fields.testing';

const FIELDS_URL = `${environment.apiBaseUrl}/leads/fields`;

describe('LeadFields', () => {
  let service: LeadFields;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });

    service = TestBed.inject(LeadFields);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads every field in the order the API returns them', async () => {
    const fields = TestBed.runInInjectionContext(() => service.all());
    TestBed.tick();

    const request = http.expectOne(FIELDS_URL);
    expect(request.request.method).toBe('GET');
    request.flush(SYSTEM_FIELDS);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(fields.value()?.map((field) => field.key)).toEqual([
      'candidate',
      'product',
      'source',
      'signal',
      'whyLead',
      'status',
      'receivedAt',
    ]);
  });

  it('gives each screen a fresh read rather than a shared copy', () => {
    TestBed.runInInjectionContext(() => service.all());
    TestBed.runInInjectionContext(() => service.all());
    TestBed.tick();

    const reads = http.match(FIELDS_URL);
    expect(reads.length).toBe(2);
    reads.forEach((read) => read.flush([]));
  });

  it('posts a new field and resolves with the field the API saved', async () => {
    const [dealSize] = CUSTOM_FIELDS;
    const body = { key: 'dealSize', label: 'Deal size', type: 'number', isRequired: false } as const;
    const created = service.create(body);

    const request = http.expectOne(FIELDS_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(dealSize);

    await expect(created).resolves.toEqual(dealSize);
  });
});
