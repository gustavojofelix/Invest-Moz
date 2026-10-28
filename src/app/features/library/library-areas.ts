import type { GuideChapterId } from '@core/domain/guide';
import type { RefId } from '@core/domain/types';

/**
 * The library re-presents the twelve guide chapters as ten topic areas (screen
 * 11). An area links to its main chapter; `fragment` jumps to a section when
 * two areas share a chapter (labour and immigration both live in "people").
 */
export interface LibraryArea {
  id: string;
  icon: string;
  chapters: GuideChapterId[];
  fragment?: string;
}

export const LIBRARY_AREAS: LibraryArea[] = [
  { id: 'investment', icon: 'landmark', chapters: ['investment-law', 'zones'] },
  { id: 'companies', icon: 'building', chapters: ['company-setup'] },
  { id: 'licensing', icon: 'file-check', chapters: ['roadmap'] },
  { id: 'tax', icon: 'receipt', chapters: ['tax'] },
  { id: 'labour', icon: 'users', chapters: ['people'], fragment: 'labour-law' },
  { id: 'immigration', icon: 'plane', chapters: ['people'], fragment: 'work-permits' },
  { id: 'land', icon: 'map-pin', chapters: ['land-esg'] },
  { id: 'exchange', icon: 'banknote', chapters: ['exchange'] },
  { id: 'sectors', icon: 'factory', chapters: ['sectors'] },
  { id: 'disputes', icon: 'gavel', chapters: ['protection'] },
];

/** Country overviews shown as "Start here" above the areas. */
export const START_HERE: GuideChapterId[] = ['at-a-glance', 'why-mozambique'];

/** The area an article belongs to (its eyebrow); `start` for the overviews. */
export function areaOf(chapter: GuideChapterId): string {
  return LIBRARY_AREAS.find((a) => a.chapters.includes(chapter))?.id ?? 'start';
}

/** The diplomas each article is based on (knowledge-base ids, opened in the citation sheet). */
export const CHAPTER_DIPLOMAS: Record<GuideChapterId, RefId[]> = {
  'at-a-glance': ['apiex-guide-2026', 'business-guide-2025'],
  'why-mozambique': ['apiex-guide-2026'],
  sectors: ['lei-21-2014', 'dec-70-2017'],
  'investment-law': ['lei-8-2023', 'dec-8-2024'],
  'company-setup': ['dl-1-2022'],
  roadmap: ['dec-41-2026', 'lei-8-2023'],
  zones: ['zee-zfi', 'lei-4-2009'],
  tax: ['cirpc', 'civa', 'dta-network'],
  people: ['lei-13-2023', 'dec-88-2024'],
  exchange: ['lei-11-2009', 'aviso-3-gbm-2024'],
  'land-esg': ['lei-19-97', 'aia-regulation'],
  protection: ['lei-8-2023'],
};
