import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@env/environment';
import { catchError, throwError } from 'rxjs';
import { Auth } from '../auth/auth';

/**
 * A 401 on an app route means the cookie went stale, so drop the session and send
 * the person to login. Auth routes are left alone: sign-in answers 401 for bad
 * credentials, and that belongs to the login form.
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const isAuthRoute = req.url.startsWith(`${environment.apiBaseUrl}/auth/`);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!isAuthRoute && error instanceof HttpErrorResponse && error.status === 401) {
        auth.forget();
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }

      return throwError(() => error);
    }),
  );
};
