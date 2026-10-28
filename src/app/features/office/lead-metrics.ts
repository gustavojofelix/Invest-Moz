import { RULE_SET } from '@core/domain/rule-set.data';
import { classifySector } from '@core/domain/rules-engine';
import type { Enquiry, SectorId } from '@core/domain/types';

export type FitBand = 'high' | 'medium' | 'low';

export interface FitScore {
  score: number;
  band: FitBand;
  parts: { size: number; sector: number; origin: number; completeness: number };
}

/** Sectors the partners prioritise (screen 22 demand data and the APIEX guide). */
const PRIORITY_SECTORS: readonly SectorId[] = [
  'agro_industry',
  'energy',
  'tourism',
  'logistics',
  'oil_gas',
  'mining',
];

export function leadSector(e: Enquiry): SectorId | null {
  const idea = e.projectSnapshot?.input.idea;
  return idea ? classifySector(idea, RULE_SET.sectors).id : null;
}

/**
 * Indicative fit score (0–100) from the project snapshot: size (30), sector
 * (25), origin (20) and how complete the handoff is (25). A triage aid, not a
 * judgement on the investor.
 */
export function fitScore(e: Enquiry): FitScore {
  const input = e.projectSnapshot?.input;
  const usd = input?.investmentUsd ?? 0;
  const size = usd >= 1_000_000 ? 30 : usd >= 250_000 ? 20 : usd > 0 ? 10 : 0;

  const sectorId = leadSector(e);
  const sector = !sectorId
    ? 0
    : PRIORITY_SECTORS.includes(sectorId)
      ? 25
      : sectorId === 'services'
        ? 15
        : 10;

  const origin = !input ? 0 : input.capital === 'mozambican' ? 10 : 20;

  const completeness =
    (e.projectSnapshot ? 10 : 0) +
    (e.phone ? 5 : 0) +
    (e.consent?.shareSummary ? 5 : 0) +
    (e.areas.length >= 2 ? 5 : 0);

  const score = size + sector + origin + completeness;
  const band: FitBand = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low';
  return { score, band, parts: { size, sector, origin, completeness } };
}

export interface LeadMetrics {
  total: number;
  thisMonth: number;
  /** Won ÷ all handoffs, 0–1. */
  conversion: number;
  /** Share of handoffs with a first reply (a note or a status change). */
  responseRate: number;
  /** Median hours from handoff to the first internal note; null without data. */
  medianReplyHours: number | null;
}

export function leadMetrics(list: readonly Enquiry[], now: Date = new Date()): LeadMetrics {
  const month = now.toISOString().slice(0, 7);
  const replies = list
    .filter((e) => e.notes.length > 0)
    .map((e) => (Date.parse(e.notes[0].at) - Date.parse(e.createdAt)) / 3_600_000)
    .filter((h) => Number.isFinite(h) && h >= 0)
    .sort((a, b) => a - b);
  const mid = Math.floor(replies.length / 2);
  const median =
    replies.length === 0
      ? null
      : replies.length % 2
        ? replies[mid]
        : (replies[mid - 1] + replies[mid]) / 2;
  const total = list.length;
  return {
    total,
    thisMonth: list.filter((e) => e.createdAt.slice(0, 7) === month).length,
    conversion: total ? list.filter((e) => e.status === 'won').length / total : 0,
    responseRate: total
      ? list.filter((e) => e.notes.length > 0 || e.status !== 'new').length / total
      : 0,
    medianReplyHours: median === null ? null : Math.round(median),
  };
}

/** Expert a lead asked for; legacy enquiries (no expertId) went to Tax Advisory. */
export function leadExpert(e: Enquiry): string {
  return e.expertId ?? 'tax-advisory';
}
