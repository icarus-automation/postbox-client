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
    path: 'categories',
    title: 'Categories | Lead Inbox',
    data: { kind: 'category' },
    loadComponent: () => import('./blog-terms/blog-term-list').then((m) => m.BlogTermList),
  },
  {
    path: 'tags',
    title: 'Tags | Lead Inbox',
    data: { kind: 'tag' },
    loadComponent: () => import('./blog-terms/blog-term-list').then((m) => m.BlogTermList),
  },
  {
    path: 'organization',
    title: 'Organization | Lead Inbox',
    loadComponent: () =>
      import('./organization/organization-settings').then((m) => m.OrganizationSettings),
  },
];
