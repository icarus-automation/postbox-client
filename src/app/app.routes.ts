import { Routes } from '@angular/router';
import { authGuard, guestGuard, onboardingGuard } from '@core/auth/auth.guard';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: 'create-organization',
    canActivate: [onboardingGuard],
    title: 'Create organization | Lead Inbox',
    loadComponent: () =>
      import('./modules/auth/create-organization/create-organization').then(
        (m) => m.CreateOrganization,
      ),
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'leads' },
      {
        path: 'blog',
        loadChildren: () => import('./modules/blog/blog.routes').then((m) => m.routes),
      },
      {
        path: 'leads',
        loadChildren: () => import('./modules/leads/leads.routes').then((m) => m.routes),
      },
      {
        path: 'settings',
        loadChildren: () => import('./modules/settings/settings.routes').then((m) => m.routes),
      },
    ],
  },
  {
    // `/login` and `/sign-up`. Signed-out screens have no app chrome, so they sit
    // outside MainLayout. Listed after it, so app URLs never load this chunk.
    path: '',
    canActivate: [guestGuard],
    loadChildren: () => import('./modules/auth/auth.routes').then((m) => m.routes),
  },
  { path: '**', redirectTo: '' },
];
