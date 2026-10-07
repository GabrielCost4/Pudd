import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL, isApiUrl } from '../config/api';
import { SessionStore } from './session.store';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiUrl(request.url)) return next(request);
  const session = inject(SessionStore);
  const router = inject(Router);
  const publicEndpoint = request.url === API_BASE_URL + '/Auth/login' ||
    request.url === API_BASE_URL + '/Auth/register';
  const token = publicEndpoint ? null : session.accessToken();
  const outgoing = token ? request.clone({ setHeaders: { Authorization: 'Bearer ' + token } }) : request;
  return next(outgoing).pipe(catchError((error: unknown) => {
    if (!publicEndpoint && error instanceof HttpErrorResponse) {
      // Uma resposta antiga não deve encerrar uma sessão que acabou de mudar.
      if (error.status === 401 && token === session.accessToken()) {
        session.clear();
        void router.navigate(['/unauthorized'], { queryParams: { reason: 'session' } });
      } else if (error.status === 403) {
        void router.navigate(['/unauthorized'], { queryParams: { reason: 'forbidden' } });
      }
    }
    return throwError(() => error);
  }));
};
