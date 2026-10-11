import { providePrimeNG } from 'primeng/config';
import { puddTheme } from './core/config/prime-theme';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    providePrimeNG({
      theme: { preset: puddTheme, options: { darkModeSelector: '.pudd-dark' } },
      pt: {
        progressspinner: { root: { class: 'loading-spinner' } },
        confirmdialog: { root: { class: 'confirmation-dialog' } },
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
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
  ],
};
