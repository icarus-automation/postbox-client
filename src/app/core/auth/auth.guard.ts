import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

/** Admitted visitors enter the shell. Onboarding goes to create. Everyone else signs in. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const admission = await auth.restore();

  if (admission.phase === 'admitted') return true;
  if (admission.phase === 'onboarding') return router.createUrlTree(['/create-organization']);

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Signed-out visitors can open login and sign-up. A workspace sends them on. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const admission = await auth.restore();

  if (admission.phase === 'signed-out') return true;
  if (admission.phase === 'onboarding') return router.createUrlTree(['/create-organization']);

  return router.createUrlTree(['/leads']);
};

/** The create screen is the only page an onboarding session can open. */
export const onboardingGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const admission = await auth.restore();

  if (admission.phase === 'onboarding') return true;
  if (admission.phase === 'admitted') return router.createUrlTree(['/leads']);

  return router.createUrlTree(['/login']);
};
