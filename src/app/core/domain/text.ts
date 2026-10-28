import { LOCALES, type Locale, type LocalizedText } from './types';

/** Lower-cases, strips diacritics and collapses punctuation to spaces. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%]+/gu, ' ')
    .trim();
}

/**
 * True when `phrase` occurs in the already-normalised `haystack` on word
 * boundaries. A trailing `*` makes the last word a prefix: "export*" matches
 * "exporta", "exportacao", "exports".
 */
export function containsPhrase(haystack: string, phrase: string): boolean {
  const prefix = phrase.endsWith('*');
  const p = normalize(prefix ? phrase.slice(0, -1) : phrase);
  if (!p) return false;
  const padded = ` ${haystack} `;
  return prefix ? padded.includes(` ${p}`) : padded.includes(` ${p} `);
}

/**
 * Picks one locale from LocalizedText. Missing entries fall back to English,
 * then Portuguese, so partially translated content never renders blank.
 */
export function pickText(
  value: Partial<Record<Locale, string>> | null | undefined,
  lang: Locale,
): string {
  if (!value) return '';
  return value[lang] || value.en || value.pt || '';
}

/** A LocalizedText with every locale empty. */
export function emptyText(): LocalizedText {
  return Object.fromEntries(LOCALES.map((l) => [l, ''])) as LocalizedText;
}

/** Completes a partial LocalizedText: missing locales take the English text. */
export function fillText(partial: Partial<LocalizedText> & { en: string }): LocalizedText {
  return Object.fromEntries(LOCALES.map((l) => [l, partial[l] ?? partial.en])) as LocalizedText;
}
