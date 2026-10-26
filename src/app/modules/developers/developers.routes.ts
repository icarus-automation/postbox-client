import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Developers | Lead Inbox',
    loadComponent: () => import('./developers').then((m) => m.Developers),
  },
];
