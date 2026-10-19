import { inject } from '@angular/core';
import type { CanMatchFn, ResolveFn } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { DEFAULT_LOCALE, isLocale } from './locales';
import { LocaleService } from './locale.service';
import type { TranslationScope } from './translation-loader';

/** Only matches the `:lang` subtree for pt, en or fr. */
export const localeMatchGuard: CanMatchFn = (_route, segments) => isLocale(segments[0]?.path);

/**
 * Loads the global translation file and activates the locale from `:lang`.
 * Running inside the router makes prerendering wait for translations.
 */
export const localeResolver: ResolveFn<boolean> = async (route) => {
  const param = route.paramMap.get('lang');
  const lang = isLocale(param) ? param : DEFAULT_LOCALE;
  // Inject before awaiting: the injection context ends at the first await.
  const transloco = inject(TranslocoService);
  const locale = inject(LocaleService);
  await firstValueFrom(transloco.load(lang));
  locale.use(lang);
  return true;
};

/** Loads a feature's translation scope for the active locale. */
export function scopeResolver(scope: TranslationScope): ResolveFn<boolean> {
  return async (route) => {
    const param = route.paramMap.get('lang');
    const lang = isLocale(param) ? param : DEFAULT_LOCALE;
    await firstValueFrom(inject(TranslocoService).load(`${scope}/${lang}`));
    return true;
  };
}
