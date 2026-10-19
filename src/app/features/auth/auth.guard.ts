import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '@core/ports';

/** Demo-only guard: redirects to the login page when there is no demo session. */
export const authGuard: CanActivateFn = (route, state) => {
  if (inject(AuthService).user()) return true;
  const lang = route.paramMap.get('lang') ?? 'pt';
  return inject(Router).createUrlTree(['/', lang, 'login'], { queryParams: { next: state.url } });
};
