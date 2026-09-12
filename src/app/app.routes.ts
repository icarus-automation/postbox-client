import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        // DELETE ME: the welcome screen exists to verify a fresh clone renders.
        // Replace with your first feature, e.g.
        //   loadChildren: () => import('./modules/home/home.routes').then((m) => m.routes)
        loadComponent: () => import('./modules/welcome/welcome').then((m) => m.Welcome),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
