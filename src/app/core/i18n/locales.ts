import { LOCALES, type Locale } from '../domain/types';

export { LOCALES, type Locale };

export const DEFAULT_LOCALE: Locale = 'pt';

/** Intl locale used for number, currency and date formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  pt: 'pt-MZ',
  en: 'en-GB',
  fr: 'fr-FR',
};

/** Value of <html lang>. */
export const HTML_LANG: Record<Locale, string> = {
  pt: 'pt-MZ',
  en: 'en-GB',
  fr: 'fr',
};

export const LOCALE_LABEL: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
  fr: 'Français',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
