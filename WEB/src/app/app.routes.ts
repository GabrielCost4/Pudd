import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Entrar | Pudd',
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login),
  },
  { path: '**', redirectTo: 'login' },
];
