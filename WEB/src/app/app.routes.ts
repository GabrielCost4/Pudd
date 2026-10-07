import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Entrar | Pudd',
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Criar conta | Pudd',
    data: { register: true },
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: 'unauthorized',
    title: 'Acesso não autorizado | Pudd',
    loadComponent: () =>
      import('./features/errors/pages/error-page/error-page').then((m) => m.ErrorPage),
  },
  {
    path: 'notfound',
    title: 'Página não encontrada | Pudd',
    data: { notFound: true },
    loadComponent: () =>
      import('./features/errors/pages/error-page/error-page').then((m) => m.ErrorPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./core/layout/app-shell').then((m) => m.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'feed' },
      {
        path: 'feed',
        title: 'Comunidade | Pudd',
        loadComponent: () => import('./features/posts/pages/feed/feed').then((m) => m.Feed),
      },
      {
        path: 'posts/new',
        title: 'Publicar | Pudd',
        loadComponent: () =>
          import('./features/posts/pages/editor/post-editor').then((m) => m.PostEditor),
      },
      {
        path: 'posts/:id/edit',
        title: 'Editar publicação | Pudd',
        loadComponent: () =>
          import('./features/posts/pages/editor/post-editor').then((m) => m.PostEditor),
      },
      {
        path: 'posts/:id',
        title: 'Publicação | Pudd',
        loadComponent: () =>
          import('./features/posts/pages/detail/post-detail').then((m) => m.PostDetail),
      },
      {
        path: 'profile/:id',
        title: 'Perfil | Pudd',
        loadComponent: () =>
          import('./features/profile/pages/profile/profile').then((m) => m.ProfilePage),
      },
      {
        path: 'admin',
        title: 'Administração | Pudd',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/pages/users/admin-users').then((m) => m.AdminUsers),
      },
    ],
  },
  {
    path: '**',
    title: 'Página não encontrada | Pudd',
    data: { notFound: true },
    loadComponent: () =>
      import('./features/errors/pages/error-page/error-page').then((m) => m.ErrorPage),
  },
];
