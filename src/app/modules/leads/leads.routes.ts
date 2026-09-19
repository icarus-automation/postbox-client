import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Leads | Lead Inbox',
    loadComponent: () => import('./lead-list/lead-list').then((m) => m.LeadList),
  },
  {
    path: ':id',
    title: 'Lead | Lead Inbox',
    loadComponent: () => import('./lead-detail/lead-detail').then((m) => m.LeadDetail),
  },
];
