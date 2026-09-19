import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

/** Holds signed-out visitors at the login screen, remembering where they aimed. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (await auth.restore()) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps people who already have a session off the login screen. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return (await auth.restore()) ? router.createUrlTree(['/leads']) : true;
};
