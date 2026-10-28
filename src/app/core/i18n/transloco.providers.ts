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
      // A key missing in one of the machine-translated locales shows in English.
      fallbackLang: 'en',
      reRenderOnLangChange: true,
      prodMode: !isDevMode(),
      missingHandler: {
        logMissingKey: isDevMode(),
        useFallbackTranslation: true,
      },
    },
    loader: InlineTranslationLoader,
  });
}
