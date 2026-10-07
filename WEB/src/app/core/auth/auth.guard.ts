import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from './session.store';

export const authGuard: CanActivateFn = (_, state) =>
  inject(SessionStore).hasValidSession() ||
  inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

export const adminGuard: CanActivateFn = () =>
  inject(SessionStore).isAdmin() ||
  inject(Router).createUrlTree(['/unauthorized'], { queryParams: { reason: 'forbidden' } });
