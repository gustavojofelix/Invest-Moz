import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { isLocale } from '@core/i18n/locales';
import { AuthService } from '@core/ports';

/** Demo-only guard: sends visitors without a demo session to `/:lang/login`. */
export const authGuard: CanActivateFn = (route, state) => {
  if (inject(AuthService).user()) return true;
  const fromPath = route.pathFromRoot.map((r) => r.paramMap.get('lang')).find((l) => isLocale(l));
  const lang = fromPath ?? 'pt';
  return inject(Router).createUrlTree(['/', lang, 'login'], { queryParams: { next: state.url } });
};
