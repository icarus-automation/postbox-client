import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Auth } from '@core/auth/auth';
import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';
import { credentialsInterceptor } from './credentials-interceptor';
import { unauthorizedInterceptor } from './unauthorized-interceptor';

describe('API interceptors', () => {
  let http: HttpTestingController;
  let client: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([credentialsInterceptor, unauthorizedInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => http.verify());

  it('sends credentials with API calls so the session cookie travels', () => {
    client.get(`${environment.apiBaseUrl}/leads`).subscribe();

    expect(http.expectOne(`${environment.apiBaseUrl}/leads`).request.withCredentials).toBe(true);
  });

  it('leaves requests to anywhere else without credentials', () => {
    client.get('https://example.com/thing').subscribe();

    expect(http.expectOne('https://example.com/thing').request.withCredentials).toBe(false);
  });

  it('drops the session and heads to login when an app route answers 401', async () => {
    const auth = TestBed.inject(Auth);
    const forget = vi.spyOn(auth, 'forget');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const answer = firstValueFrom(client.get(`${environment.apiBaseUrl}/leads`));
    http
      .expectOne(`${environment.apiBaseUrl}/leads`)
      .flush('', { status: 401, statusText: 'Unauthorized' });
    await expect(answer).rejects.toBeDefined();

    expect(forget).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
  });

  it('leaves a 401 from sign-in to the login form', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const answer = firstValueFrom(client.post(`${environment.apiBaseUrl}/auth/sign-in/email`, {}));
    http
      .expectOne(`${environment.apiBaseUrl}/auth/sign-in/email`)
      .flush({ message: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });
    await expect(answer).rejects.toBeDefined();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('passes other failures through untouched', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const answer = firstValueFrom(client.get(`${environment.apiBaseUrl}/leads`));
    http
      .expectOne(`${environment.apiBaseUrl}/leads`)
      .flush('', { status: 403, statusText: 'Forbidden' });

    await expect(answer).rejects.toMatchObject({ status: 403 });
    expect(navigate).not.toHaveBeenCalled();
  });
});
