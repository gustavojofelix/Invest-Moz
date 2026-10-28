/**
 * Investor guide: long-form, public reference content (no project needed).
 * Text fields use the same Markdown subset as answers (see richtext.ts), so
 * bodies can cite `[ref:<id>]` and flag `{{TO_CONFIRM}}` values.
 */
import type { LocalizedText, RefId, TopicId } from './types';

export const GUIDE_CHAPTERS = [
  'at-a-glance',
  'why-mozambique',
  'sectors',
  'investment-law',
  'company-setup',
  'roadmap',
  'zones',
  'tax',
  'people',
  'exchange',
  'land-esg',
  'protection',
] as const;
export type GuideChapterId = (typeof GUIDE_CHAPTERS)[number];

export function isGuideChapter(id: string | null | undefined): id is GuideChapterId {
  return (GUIDE_CHAPTERS as readonly string[]).includes(id ?? '');
}

/** A headline number: "32M tons", "Port of Maputo throughput 2025". */
export interface GuideFact {
  value: LocalizedText;
  label: LocalizedText;
}

/** One step of a procedure (registration, investment journey…). */
export interface GuideStep {
  title: LocalizedText;
  text: LocalizedText;
  /** Institution or office. */
  where?: LocalizedText;
  /** Indicative duration. */
  time?: LocalizedText;
}

/** Plain-text table; the first column labels the row. */
export interface GuideTable {
  caption: LocalizedText;
  columns: LocalizedText[];
  rows: LocalizedText[][];
  note?: LocalizedText;
}

export interface GuideSection {
  id: string;
  title: LocalizedText;
  body?: LocalizedText;
  facts?: GuideFact[];
  steps?: GuideStep[];
  table?: GuideTable;
}

/** Chapter metadata, listed in the guide index. */
export interface GuideChapterMeta {
  id: GuideChapterId;
  title: LocalizedText;
  /** One or two sentences for the chapter card and the meta description. */
  summary: LocalizedText;
  /** Ids from `GuideIndex.sources`. */
  sources: string[];
  /** Q&A topic offered as "ask a question" from this chapter. */
  topic?: TopicId;
}

/** A chapter's body, stored in its own file and loaded on demand. */
export interface GuideChapterBody {
  id: GuideChapterId;
  sections: GuideSection[];
}

export interface GuideSource {
  id: string;
  title: string;
  publisher: LocalizedText;
  /** Publication date, YYYY or YYYY-MM. */
  date: string;
  refId?: RefId;
}

export interface GuideIndex {
  lastReviewed: string;
  sources: GuideSource[];
  chapters: GuideChapterMeta[];
}
