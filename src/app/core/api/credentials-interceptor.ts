import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '@env/environment';

/**
 * The session lives in an HTTP-only cookie on the API origin, so every call has to
 * opt in to sending it. Scoped to our own base URL so requests to anywhere else
 * never carry credentials.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.url.startsWith(environment.apiBaseUrl) ? req.clone({ withCredentials: true }) : req);
