import { isDevMode } from '@angular/core';
import { provideTransloco } from '@jsverse/transloco';
import { LOCALES } from '../domain/types';
import { DEFAULT_LOCALE } from './locales';
import { InlineTranslationLoader } from './translation-loader';

export function provideI18n() {
  return provideTransloco({
    config: {
      availableLangs: [...LOCALES],
      defaultLang: DEFAULT_LOCALE,
      fallbackLang: DEFAULT_LOCALE,
      reRenderOnLangChange: true,
      prodMode: !isDevMode(),
      missingHandler: {
        logMissingKey: isDevMode(),
        useFallbackTranslation: false,
      },
    },
    loader: InlineTranslationLoader,
  });
}
