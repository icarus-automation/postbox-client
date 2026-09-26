import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Content | Lead Inbox',
    loadComponent: () => import('./content-list/content-list').then((m) => m.ContentList),
  },
  {
    path: ':id',
    title: 'Edit | Lead Inbox',
    loadComponent: () => import('./content-editor/content-editor').then((m) => m.ContentEditor),
  },
];
