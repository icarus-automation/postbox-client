import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';
import { editorRole } from './auth.types';

/** Admitted visitors enter the shell. Onboarding goes to create. Everyone else signs in. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const admission = await auth.restore();

  if (admission.phase === 'admitted') return true;
  if (admission.phase === 'onboarding') return router.createUrlTree(['/create-organization']);

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * For screens only owners and admins use, such as the Developers page. It runs under
 * `authGuard`, so a signed-out visitor has already gone to sign in. A member goes back to the
 * inbox, which is also what the API would refuse them with a 403.
 */
export const editorGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const admission = await auth.restore();

  if (admission.phase === 'admitted' && editorRole(admission.workspace.role)) return true;

  return router.createUrlTree(['/leads']);
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
