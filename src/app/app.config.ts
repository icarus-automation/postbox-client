import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { credentialsInterceptor } from '@core/api/credentials-interceptor';
import { unauthorizedInterceptor } from '@core/api/unauthorized-interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withFetch(),
      // Credentials first so the request carries the session cookie, then the 401
      // handler wraps the response on the way back.
      withInterceptors([credentialsInterceptor, unauthorizedInterceptor]),
    ),
    provideRouter(
      routes,
      // route params / query params arrive as signal `input()`s on the component
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
  ],
};
