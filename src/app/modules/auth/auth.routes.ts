import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in | Lead Inbox',
    loadComponent: () => import('./login/login').then((m) => m.Login),
  },
  {
    path: 'sign-up',
    title: 'Create account | Lead Inbox',
    loadComponent: () => import('./sign-up/sign-up').then((m) => m.SignUp),
  },
];
