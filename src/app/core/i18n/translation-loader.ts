import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { from, map, type Observable } from 'rxjs';

type JsonModule = Promise<{ default: Translation }>;

/**
 * Translations are bundled as lazy chunks (dynamic import) rather than fetched
 * over HTTP, so prerendering and offline demos never depend on the network.
 * Keys: "<lang>" for the global file, "<scope>/<lang>" for feature scopes.
 */
const FILES: Record<string, () => JsonModule> = {
  pt: () => import('../../../assets/i18n/pt.json'),
  en: () => import('../../../assets/i18n/en.json'),
  fr: () => import('../../../assets/i18n/fr.json'),
  'landing/pt': () => import('../../../assets/i18n/landing/pt.json'),
  'landing/en': () => import('../../../assets/i18n/landing/en.json'),
  'landing/fr': () => import('../../../assets/i18n/landing/fr.json'),
  'intake/pt': () => import('../../../assets/i18n/intake/pt.json'),
  'intake/en': () => import('../../../assets/i18n/intake/en.json'),
  'intake/fr': () => import('../../../assets/i18n/intake/fr.json'),
  'assessment/pt': () => import('../../../assets/i18n/assessment/pt.json'),
  'assessment/en': () => import('../../../assets/i18n/assessment/en.json'),
  'assessment/fr': () => import('../../../assets/i18n/assessment/fr.json'),
  'qa/pt': () => import('../../../assets/i18n/qa/pt.json'),
  'qa/en': () => import('../../../assets/i18n/qa/en.json'),
  'qa/fr': () => import('../../../assets/i18n/qa/fr.json'),
  'enquiry/pt': () => import('../../../assets/i18n/enquiry/pt.json'),
  'enquiry/en': () => import('../../../assets/i18n/enquiry/en.json'),
  'enquiry/fr': () => import('../../../assets/i18n/enquiry/fr.json'),
  'inbox/pt': () => import('../../../assets/i18n/inbox/pt.json'),
  'inbox/en': () => import('../../../assets/i18n/inbox/en.json'),
  'inbox/fr': () => import('../../../assets/i18n/inbox/fr.json'),
  'demo/pt': () => import('../../../assets/i18n/demo/pt.json'),
  'demo/en': () => import('../../../assets/i18n/demo/en.json'),
  'demo/fr': () => import('../../../assets/i18n/demo/fr.json'),
};

export const TRANSLATION_SCOPES = [
  'landing',
  'intake',
  'assessment',
  'qa',
  'enquiry',
  'inbox',
  'demo',
] as const;
export type TranslationScope = (typeof TRANSLATION_SCOPES)[number];

@Injectable({ providedIn: 'root' })
export class InlineTranslationLoader implements TranslocoLoader {
  getTranslation(path: string): Observable<Translation> {
    const load = FILES[path];
    if (!load) return from(Promise.resolve({}));
    return from(load()).pipe(map((m) => m.default));
  }
}
