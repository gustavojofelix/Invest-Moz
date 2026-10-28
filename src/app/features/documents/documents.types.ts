import type { RoadmapStepId } from '@core/domain/roadmap-steps';
import type { LocalizedText, RefId } from '@core/domain/types';

/**
 * Shape of `src/assets/data/documents/checklists.json`.
 *
 * - `upload`: the investor provides it (registry certificate, passport…)
 * - `template`: a blank template is available (supplied by mozTemplates)
 * - `prefilled`: a template Tiva pre-fills from the investor's roadmap
 */
export type DocumentKind = 'upload' | 'template' | 'prefilled';

export interface ChecklistDocument {
  /** Stable id; the same id in two steps is the same document (uploaded once). */
  id: string;
  kind: DocumentKind;
  title: LocalizedText;
  hint?: LocalizedText;
}

export interface StepChecklist {
  id: RoadmapStepId;
  number: number;
  title: LocalizedText;
  authority: LocalizedText;
  refs: RefId[];
  documents: ChecklistDocument[];
}

export interface ChecklistData {
  status: 'illustrative' | 'verified';
  supplier: string;
  steps: StepChecklist[];
}

/** What the simulated upload keeps (metadata only; the file never leaves the browser). */
export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  at: string;
}
