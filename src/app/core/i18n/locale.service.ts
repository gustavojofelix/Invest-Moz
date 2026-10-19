import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { SafeStorage } from '../adapters/safe-storage';
import type { Locale, LocalizedText } from '../domain/types';
import { DEFAULT_LOCALE, HTML_LANG, INTL_LOCALE, isLocale } from './locales';

/** Single source of truth for the active locale. Driven by the `:lang` route param. */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly transloco = inject(TranslocoService);
  private readonly storage = inject(SafeStorage);
  private readonly document = inject(DOCUMENT);

  private readonly _lang = signal<Locale>(DEFAULT_LOCALE);
  readonly lang = this._lang.asReadonly();
  readonly intl = computed(() => INTL_LOCALE[this._lang()]);

  /** The visitor's last explicit choice, if any. */
  storedPreference(): Locale | null {
    const v = this.storage.get<string | null>('lang', null);
    return isLocale(v) ? v : null;
  }

  use(lang: Locale): void {
    this._lang.set(lang);
    this.transloco.setActiveLang(lang);
    this.document.documentElement.lang = HTML_LANG[lang];
    this.storage.set('lang', lang);
  }

  /** Picks the active locale from LocalizedText. */
  text(value: LocalizedText | undefined | null): string {
    if (!value) return '';
    return value[this._lang()] ?? value.pt ?? '';
  }

  /** Translates a global or scoped key in the active language. */
  t(key: string, params?: Record<string, unknown>): string {
    return this.transloco.translate(key, params);
  }

  /** Swaps the language segment of an app URL: /pt/project -> /en/project. */
  switchUrl(url: string, lang: Locale): string {
    const match = /^([^?#]*)(.*)$/.exec(url);
    const path = match?.[1] ?? '/';
    const rest = match?.[2] ?? '';
    const parts = path.split('/');
    if (isLocale(parts[1])) parts[1] = lang;
    else parts.splice(1, 0, lang);
    const joined = parts.join('/');
    return (joined.length > 1 ? joined.replace(/\/$/, '') : joined) + rest;
  }
}
