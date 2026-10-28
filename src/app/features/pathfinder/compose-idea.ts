import { PROVINCE_NAMES } from '@core/domain/provinces';
import type { ProvinceCode, SectorId } from '@core/domain/types';

/**
 * The rules engine reads the sector from the idea text. Make sure the text
 * carries the sector the investor chose: append the sector label when the idea
 * does not already classify to it.
 */
export function composeIdea(
  idea: string,
  chosen: SectorId,
  province: ProvinceCode,
  classify: (text: string) => string,
): string {
  const base = idea.trim();
  const provinceName = PROVINCE_NAMES[province];
  if (!base) return `${SECTOR_PHRASE[chosen]} · ${provinceName.en}`;
  if (chosen === 'general' || classify(base) === chosen) return base;
  const withLabel = `${base} (${SECTOR_PHRASE[chosen]})`;
  if (classify(withLabel) === chosen) return withLabel;
  // The idea names a sector that ranks first in the rules: lead with the choice
  // and keep only the sentences that do not point elsewhere.
  return `${SECTOR_PHRASE[chosen]} · ${provinceName.en}. ${base.replace(/[.!?]?$/, '.')}`
    .split('. ')
    .filter((part, i) => i === 0 || classify(part) === chosen || classify(part) === 'general')
    .join('. ');
}

/** English phrases that the sector keywords in `rules/sectors.json` recognise. */
const SECTOR_PHRASE: Record<SectorId, string> = {
  agro_industry: 'Agro-processing',
  energy: 'Solar energy',
  tourism: 'Tourism',
  logistics: 'Logistics',
  mining: 'Mining',
  oil_gas: 'Oil and gas',
  services: 'Services',
  general: 'Trading company',
};
