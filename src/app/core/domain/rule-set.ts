/**
 * Shape of the declarative rule tables in `src/assets/data/rules/*.json`.
 * Language-neutral logic; all prose is LocalizedText. The same files are meant
 * to be loaded unchanged by the future Python engine.
 */
import type {
  ComparisonRow,
  Locale,
  LocalizedText,
  ProvinceCode,
  RefId,
  RoadmapPhase,
  Rule,
  SectorId,
  TriggerKind,
  Vehicle,
} from './types';

export interface SectorDef {
  id: SectorId;
  label: LocalizedText;
  /** Likely environmental category (indicative): A, B or C. */
  envCategory: 'A' | 'B' | 'C';
  keywords: Record<Locale, string[]>;
}

export interface SectorsTable {
  sectors: SectorDef[];
  fallback: SectorId;
}

export interface VehicleDef {
  vehicle: Vehicle;
  name: LocalizedText;
  whenToChoose: LocalizedText;
}

export interface VehiclesTable {
  options: VehicleDef[];
  rules: Rule<{ recommended: Vehicle; alternatives: Vehicle[]; reasoning: LocalizedText }>[];
  /** Comparison shown when these conditions hold (foreign or mixed capital). */
  comparisonWhen: Rule<unknown>['when'];
  comparison: ComparisonRow[];
}

export interface ApiexTable {
  /** Indicative USD→MZN rate used only to compare against MZN thresholds. To confirm. */
  fxUsdMzn: number;
  /** Minimum FDI for the export-of-profits guarantee (Lei 8/2023). */
  fdiMinimumMzn: number;
  regime: Rule<{
    threshold: LocalizedText;
    authority: LocalizedText;
    path: LocalizedText;
    refs: RefId[];
  }>[];
  fdiGuarantee: Rule<{ text: LocalizedText }>[];
}

export interface TreatiesTable {
  /** Domestic withholding on dividends paid abroad when no treaty applies. */
  noTreatyRate: LocalizedText;
  entries: { country: string; dividends: LocalizedText; refs: RefId[] }[];
  /** Used for treaty countries without a known rate (a to-confirm placeholder). */
  unknownTreatyRate: LocalizedText;
}

export interface QuotasTable {
  minPercent: number;
  maxPercent: number;
  /** Quota by headcount, largest first: the first band with `workers >= minWorkers` applies. */
  bands: { minWorkers: number; percent: number }[];
}

export interface RoadmapStepDef {
  id: string;
  phase: RoadmapPhase;
  title: LocalizedText;
  authority: LocalizedText;
  duration: LocalizedText;
  note: LocalizedText;
  critical: boolean;
  refs: RefId[];
}

export interface RoadmapTable {
  steps: Rule<RoadmapStepDef>[];
  timeToOperate: Rule<{ text: LocalizedText }>[];
}

export interface LicencesTable {
  licences: Rule<{
    id: string;
    kind: 'bau' | 'sector' | 'environmental' | 'duat' | 'other';
    title: LocalizedText;
    detail: LocalizedText;
    authority: LocalizedText;
    category?: string;
    refs: RefId[];
  }>[];
}

export interface TriggersTable {
  triggers: Rule<{
    trigger: TriggerKind;
    fact: LocalizedText;
    text: LocalizedText;
    severity: 'info' | 'attention';
    refs: RefId[];
  }>[];
  watchPoints: Rule<{ text: LocalizedText; refs?: RefId[] }>[];
}

export interface IncentivesTable {
  incentives: Rule<{
    id: string;
    title: LocalizedText;
    detail: LocalizedText;
    conditions: LocalizedText;
    refs: RefId[];
  }>[];
}

export interface ObligationsTable {
  obligations: Rule<{
    id: string;
    title: LocalizedText;
    frequency: LocalizedText;
    schedule:
      | { kind: 'monthly'; day: number | 'last-working-day' }
      | { kind: 'annual'; months: number[]; day: number | 'last-working-day' }
      | { kind: 'text' };
    note?: LocalizedText;
    refs: RefId[];
  }>[];
}

export interface NoteDef {
  id: string;
  title: LocalizedText;
  text: LocalizedText;
  refs: RefId[];
}

export interface ZonesTable {
  corridors: Record<ProvinceCode, 'nacala' | 'beira' | 'maputo' | 'none'>;
  location: Rule<NoteDef>[];
  financing: Rule<NoteDef>[];
  esg: Rule<NoteDef>[];
}

export interface RuleSet {
  sectors: SectorsTable;
  vehicles: VehiclesTable;
  apiex: ApiexTable;
  treaties: TreatiesTable;
  quotas: QuotasTable;
  roadmap: RoadmapTable;
  licences: LicencesTable;
  triggers: TriggersTable;
  incentives: IncentivesTable;
  obligations: ObligationsTable;
  zones: ZonesTable;
}
