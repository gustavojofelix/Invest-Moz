import { pickText } from '../domain/text';
import { LOCALES, REVIEWED_LOCALES, type Locale } from '../domain/types';

export { LOCALES, REVIEWED_LOCALES, pickText, type Locale };

export const DEFAULT_LOCALE: Locale = 'pt';

/** Intl locale used for number, currency and date formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  pt: 'pt-MZ',
  en: 'en-GB',
  fr: 'fr-FR',
  zh: 'zh-CN',
  ar: 'ar-EG',
  hi: 'hi-IN',
  sw: 'sw-TZ',
  af: 'af-ZA',
};

/** Value of <html lang>. */
export const HTML_LANG: Record<Locale, string> = {
  pt: 'pt-MZ',
  en: 'en-GB',
  fr: 'fr',
  zh: 'zh-Hans',
  ar: 'ar',
  hi: 'hi',
  sw: 'sw',
  af: 'af',
};

/** Each language's own name (endonym). */
export const LOCALE_LABEL: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
  fr: 'Français',
  zh: '中文',
  ar: 'العربية',
  hi: 'हिन्दी',
  sw: 'Kiswahili',
  af: 'Afrikaans',
};

/** Text direction; Arabic is the only right-to-left locale. */
export const LOCALE_DIR: Record<Locale, 'ltr' | 'rtl'> = {
  pt: 'ltr',
  en: 'ltr',
  fr: 'ltr',
  zh: 'ltr',
  ar: 'rtl',
  hi: 'ltr',
  sw: 'ltr',
  af: 'ltr',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** True for the five machine-translated locales (shown with a "translation under review" note). */
export function isMachineTranslated(lang: Locale): boolean {
  return !REVIEWED_LOCALES.includes(lang);
}
