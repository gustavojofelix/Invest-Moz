import type { RoadmapStepId } from '@core/domain/roadmap-steps';
import type { LocalizedText, RefId } from '@core/domain/types';

/** Shape of `src/assets/data/alerts/alerts.json` (regulatory watch, screen 16). */
export interface RegulatoryAlert {
  id: string;
  /** Labels as cited ("Decreto n.º 41/2026"). */
  instruments: string[];
  /** Knowledge-base ids, when the diploma is in the base (opens the citation sheet). */
  refIds: RefId[];
  /** The roadmap step the change affects; null when it affects another area. */
  step: RoadmapStepId | null;
  /** Another screen affected when there is no step (e.g. the incentive estimator). */
  area?: 'incentives';
  severity: 'action' | 'watch' | 'info';
  status: 'in_force' | 'upcoming' | 'pending';
  /** Effective date (ISO); null when pending or not confirmed. */
  effective: string | null;
  published: string;
  title: LocalizedText;
  /** What changed. */
  summary: LocalizedText;
  /** What it means for the investor. */
  impact: LocalizedText;
  /** Question pre-filled when the investor asks Tiva about it. */
  question: LocalizedText;
}

export interface AlertsData {
  status: 'illustrative' | 'verified';
  source: string;
  alerts: RegulatoryAlert[];
}

export type AlertChannel = 'whatsapp' | 'email' | 'push';
