import { providePrimeNG } from 'primeng/config';
import { puddTheme } from './core/config/prime-theme';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    providePrimeNG({
      theme: { preset: puddTheme, options: { darkModeSelector: '.pudd-dark' } },
      pt: {
        progressspinner: { root: { class: 'loading-spinner' } },
        confirmdialog: { root: { class: 'confirmation-dialog' } },
        toast: { root: { class: 'feedback-toast' }, detail: { class: 'feedback-toast-detail' } },
      },
      translation: {
        accept: 'Confirmar',
        reject: 'Cancelar',
        choose: 'Escolher',
        upload: 'Enviar',
        cancel: 'Cancelar',
        emptyMessage: 'Nenhum resultado',
      },
    }),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          const fromPath = from.firstChild?.routeConfig?.path;
          const toPath = to.firstChild?.routeConfig?.path;
          const authPaths = ['login', 'register'];
          if (
            !authPaths.includes(fromPath ?? '') ||
            !authPaths.includes(toPath ?? '') ||
            fromPath === toPath ||
            matchMedia('(prefers-reduced-motion: reduce)').matches
          )
            transition.skipTransition();
        },
      }),
    ),
  ],
};
