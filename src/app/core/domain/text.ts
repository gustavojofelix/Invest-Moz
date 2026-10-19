/** Lower-cases, strips diacritics and collapses punctuation to spaces. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, ' ')
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
