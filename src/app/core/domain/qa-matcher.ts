import { containsPhrase, normalize, pickText } from './text';
import { LOCALES, type Locale, type QaAnswer } from './types';

/**
 * Keyword matcher for free-text questions, in all three languages.
 *
 * Score = Σ keyword hits (phrases weigh more; the active locale weighs 1,
 * other locales 0.8) + 6 × Dice similarity with the canonical question's
 * significant words. Below `MIN_SCORE` the caller shows the polite fallback.
 */
export const MIN_SCORE = 1;

const STOPWORDS = new Set(
  (
    'a o os as de do da dos das um uma e ou em no na nos nas para por com sem que qual quais como ' +
    'quando onde se ser sao pode posso preciso devo minha meu nossa nosso sua seu empresa ' +
    'the of and or in on to for with without what which how when where is are can do does my our ' +
    'company need le la les des du un une et ou en au aux pour par avec sans que quel quelle ' +
    'comment quand est sont peut puis dois ma mon notre votre societe entreprise'
  ).split(' '),
);

function significantWords(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

export function scoreAnswer(question: string, answer: QaAnswer, lang: Locale): number {
  const text = normalize(question);
  if (!text) return 0;
  let score = 0;
  for (const l of LOCALES) {
    const weight = l === lang ? 1 : 0.8;
    for (const k of answer.keywords[l] ?? []) {
      if (containsPhrase(text, k)) {
        const words = normalize(k).split(' ').length;
        score += weight * (1 + 0.5 * (words - 1));
      }
    }
  }
  const asked = new Set(significantWords(question));
  const canonical = new Set(significantWords(pickText(answer.question, lang)));
  let shared = 0;
  for (const w of asked) if (canonical.has(w)) shared++;
  // Similarity to the canonical question (Dice coefficient), weighted so a
  // near-verbatim question always wins over incidental keyword hits.
  if (asked.size && canonical.size) score += (12 * shared) / (asked.size + canonical.size);
  return Math.round(score * 100) / 100;
}

export function bestAnswer(
  question: string,
  answers: readonly QaAnswer[],
  lang: Locale,
): { answer: QaAnswer | null; score: number } {
  let best: QaAnswer | null = null;
  let bestScore = 0;
  for (const a of answers) {
    const s = scoreAnswer(question, a, lang);
    if (s > bestScore) {
      best = a;
      bestScore = s;
    }
  }
  return bestScore >= MIN_SCORE
    ? { answer: best, score: bestScore }
    : { answer: null, score: bestScore };
}

/** Splits text into phrase-sized chunks for the simulated streaming. */
export function chunkPhrases(text: string): string[] {
  const chunks = text.match(/[^.!?;:\n]+[.!?;:]*\s*|\n+/g) ?? [text];
  // Merge very short pieces so the reveal reads naturally.
  const out: string[] = [];
  for (const c of chunks) {
    if (out.length && out[out.length - 1].length < 18 && !c.startsWith('\n'))
      out[out.length - 1] += c;
    else out.push(c);
  }
  return out;
}
