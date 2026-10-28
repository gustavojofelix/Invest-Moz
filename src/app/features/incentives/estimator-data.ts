import { Injectable, PendingTasks, inject } from '@angular/core';
import { tracked } from '@core/adapters/pending';
import type { LocalizedText, RefId, SectorId } from '@core/domain/types';

export type RegimeId = 'general' | 'sez' | 'ifz';

export interface Regime {
  id: RegimeId;
  label: LocalizedText;
  hint: LocalizedText;
}

/**
 * How sure the estimate is: `likely`, `check`, or decided by the inputs —
 * `jobs` (likely with local jobs) and `exports` (likely when ≥70% is exported).
 */
export type BenefitStatus = 'likely' | 'check' | 'jobs' | 'exports';

export interface Benefit {
  id: string;
  /** `zones` applies to both SEZ and IFZ. */
  regime: RegimeId | 'zones';
  kind: 'fiscal' | 'customs' | 'other';
  status: BenefitStatus;
  /** Only shown for these sectors. */
  sectors?: SectorId[];
  /** Only shown at or above this investment (MZN). */
  minInvestmentMzn?: number;
  /** `itc`: show the illustrative 5–10% range for the amount entered. */
  estimate?: 'itc';
  /** Percentages of the investment for the illustrative range, as stated in `detail`. */
  estimateRange?: [number, number];
  title: LocalizedText;
  detail: LocalizedText;
  refs: RefId[];
}

export interface EstimatorTables {
  regimes: Regime[];
  benefits: Benefit[];
}

/** Indicative incentive tables for the estimator (`data/incentives`). */
@Injectable({ providedIn: 'root' })
export class EstimatorData {
  private readonly tasks = inject(PendingTasks);
  private data?: Promise<EstimatorTables>;

  load(): Promise<EstimatorTables> {
    this.data ??= tracked(this.tasks, () =>
      import('../../../assets/data/incentives/estimator.json').then(
        (m) => m.default as unknown as EstimatorTables,
      ),
    );
    return this.data;
  }
}
