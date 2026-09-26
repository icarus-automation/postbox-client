import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Settings | Lead Inbox',
    loadComponent: () => import('./settings-home/settings-home').then((m) => m.SettingsHome),
  },
  {
    path: 'lead-fields',
    title: 'Lead fields | Lead Inbox',
    loadComponent: () => import('./lead-field-list/lead-field-list').then((m) => m.LeadFieldList),
  },
  {
    path: 'organization',
    title: 'Organization | Lead Inbox',
    loadComponent: () =>
      import('./organization/organization-settings').then((m) => m.OrganizationSettings),
  },
];
