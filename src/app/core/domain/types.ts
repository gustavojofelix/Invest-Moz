/**
 * Domain types for Invest Moz.
 *
 * Pure TypeScript: no Angular imports. These types mirror the JSON Schemas in
 * `src/assets/data/schema/` and are designed to become Pydantic models later.
 */

export const LOCALES = ['pt', 'en', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export type LocalizedText = Record<Locale, string>;

export const PROVINCES = [
  'niassa',
  'cabo_delgado',
  'nampula',
  'zambezia',
  'tete',
  'manica',
  'sofala',
  'inhambane',
  'gaza',
  'maputo_provincia',
  'maputo_cidade',
] as const;
export type ProvinceCode = (typeof PROVINCES)[number];

export const TOPICS = [
  'companies',
  'licensing',
  'investment',
  'tax',
  'labour',
  'immigration',
  'exchange',
  'customs',
  'incentives',
  'compliance',
  'land',
  'local_content',
] as const;
export type TopicId = (typeof TOPICS)[number];

export type RefId = string;
export type Vehicle = 'lda' | 'sa' | 'sas' | 'branch';
export type CapitalOrigin = 'foreign' | 'mixed' | 'mozambican';

export interface ProjectInput {
  idea: string;
  province: ProvinceCode;
  capital: CapitalOrigin;
  /** ISO 3166-1 alpha-2 */
  investorCountry: string;
  investmentUsd: number;
  workers: number;
  foreignWorkers: number;
  importsGoods: boolean;
  exports: boolean;
  needsLand: boolean;
  shareholderLoan: boolean;
  feesAbroad: boolean;
  temporaryImport: boolean;
}

/** A stored project: seeded example or one described by the visitor. */
export interface Project {
  ref: string;
  example: boolean;
  title: LocalizedText;
  sector: LocalizedText;
  summary: LocalizedText;
  input: ProjectInput;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Declarative rules
// ---------------------------------------------------------------------------

export type ConditionOp = 'eq' | 'in' | 'gte' | 'lt' | 'between';

/**
 * A single condition on a fact. Facts are the ProjectInput fields plus derived
 * facts computed by the engine (see `deriveFacts`): `sector`, `foreignShare`,
 * `treaty`, `investmentMzn`, `foreignRatio`.
 */
export interface Condition {
  field: string;
  op: ConditionOp;
  value: unknown;
}

export interface Rule<T> {
  id: string;
  /** All conditions must hold (AND). An empty list always matches. */
  when: Condition[];
  then: T;
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

export interface VehicleOption {
  vehicle: Vehicle;
  name: LocalizedText;
  whenToChoose: LocalizedText;
}

export interface ComparisonRow {
  id: string;
  label: LocalizedText;
  company: LocalizedText;
  branch: LocalizedText;
  refs: RefId[];
}

export type RoadmapPhase = 'explore' | 'establish' | 'operate';

export interface RoadmapStep {
  id: string;
  number: number;
  phase: RoadmapPhase;
  title: LocalizedText;
  authority: LocalizedText;
  duration: LocalizedText;
  note: LocalizedText;
  critical: boolean;
  refs: RefId[];
}

export interface LicenceItem {
  id: string;
  kind: 'bau' | 'sector' | 'environmental' | 'duat' | 'other';
  title: LocalizedText;
  detail: LocalizedText;
  authority: LocalizedText;
  category?: string;
  refs: RefId[];
}

export type TriggerKind = 'treaty' | 'loan' | 'fees_abroad' | 'temporary_import' | 'quota' | 'land' | 'exports' | 'local_content';

export interface TriggerResult {
  id: string;
  trigger: TriggerKind;
  fact: LocalizedText;
  text: LocalizedText;
  severity: 'info' | 'attention';
  refs: RefId[];
}

export interface IncentiveItem {
  id: string;
  title: LocalizedText;
  detail: LocalizedText;
  conditions: LocalizedText;
  refs: RefId[];
}

export type ObligationSchedule =
  | { kind: 'monthly'; day: number | 'last-working-day' }
  | { kind: 'annual'; months: number[]; day: number | 'last-working-day' }
  | { kind: 'text' };

export interface Obligation {
  id: string;
  title: LocalizedText;
  frequency: LocalizedText;
  schedule: ObligationSchedule;
  /** Next actual due dates (ISO), already shifted to working days. Empty for `text` schedules. */
  next: DueDate[];
  note?: LocalizedText;
  refs: RefId[];
}

export interface DueDate {
  date: string;
  nominal: string;
  shifted: boolean;
}

export interface ZoneNote {
  id: string;
  title: LocalizedText;
  text: LocalizedText;
  refs: RefId[];
}

export type FinancingNote = ZoneNote;
export type EsgNote = ZoneNote;

export interface Assessment {
  projectRef: string;
  sector: SectorId;
  vehicle: {
    recommended: Vehicle;
    recommendedName: LocalizedText;
    alternatives: VehicleOption[];
    reasoning: LocalizedText;
  };
  companyVsBranch?: ComparisonRow[];
  investmentRegime: {
    threshold: string;
    authority: LocalizedText;
    path: LocalizedText;
    fdiGuarantee: LocalizedText;
    refs: RefId[];
  };
  roadmap: RoadmapStep[];
  timeToOperate: LocalizedText;
  licences: LicenceItem[];
  factTriggers: TriggerResult[];
  incentives: IncentiveItem[];
  obligations: Obligation[];
  location: ZoneNote[];
  financing: FinancingNote[];
  esg: EsgNote[];
  watchPoints: LocalizedText[];
  refs: RefId[];
}

export type SectorId =
  | 'agro_industry'
  | 'energy'
  | 'logistics'
  | 'tourism'
  | 'oil_gas'
  | 'mining'
  | 'services'
  | 'general';

// ---------------------------------------------------------------------------
// Knowledge base and Q&A
// ---------------------------------------------------------------------------

export interface LegalReference {
  id: RefId;
  topic: TopicId;
  /** Short label as shown in mono tags, e.g. "Lei n.º 8/2023". */
  instrument: string;
  title: LocalizedText;
  summary: LocalizedText;
  excerpt?: LocalizedText;
  lastReviewed: string;
  status: 'illustrative' | 'verified';
}

export interface QaTopic {
  id: TopicId;
  label: LocalizedText;
  /** Main reference label shown under the topic, e.g. "DL 1/2022". */
  refLabel: string;
  refId: RefId;
  intro: LocalizedText;
}

export interface QaAnswer {
  id: string;
  topic: TopicId;
  question: LocalizedText;
  keywords: Record<Locale, string[]>;
  /**
   * Markdown subset: paragraphs, "- " bullets, **bold**, inline refs as
   * [ref:<RefId>]. Context: {{ctx.<name>}}, sections {{#ctx}}…{{/ctx}} and
   * {{^ctx}}…{{/ctx}}. To-confirm placeholders: {{UPPER_SNAKE}}.
   */
  body: LocalizedText;
  refs: RefId[];
  whenToTalk: LocalizedText;
}

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

export type EnquiryStatus = 'new' | 'in_review' | 'quoted' | 'won';

export interface Enquiry {
  ref: string;
  createdAt: string;
  locale: Locale;
  name: string;
  company: string;
  email: string;
  phone?: string;
  areas: TopicId[];
  message: string;
  projectSnapshot?: {
    projectRef: string;
    input: ProjectInput;
    vehicle: Vehicle;
    summary: LocalizedText;
  };
  status: EnquiryStatus;
  notes: { at: string; text: string }[];
  /** True when submitted during the current demo (not seeded). */
  submittedInDemo?: boolean;
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export interface Country {
  code: string;
  name: LocalizedText;
  treaty: boolean;
  status?: 'illustrative' | 'verified';
}

export interface Holiday {
  date: string;
  name: LocalizedText;
}
