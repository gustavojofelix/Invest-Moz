/**
 * Invest Moz rules engine — pure TypeScript, no Angular.
 *
 * Input: a project, the declarative rule tables, reference data and "today".
 * Output: a fully localised Assessment (all three locales are rendered, so a
 * language switch never recomputes).
 *
 * Pipeline:
 *   1. deriveFacts()   – input fields + derived facts (sector, treaty, ratios…)
 *   2. vehicle         – first matching rule; adds `vehicle` to the facts
 *   3. every section   – selectAll()/selectFirst() over its table
 *   4. templating      – {{fact.*}} variables filled per locale
 */
import { nextDueDates } from './calendar';
import { selectAll, selectFirst, type Facts } from './conditions';
import { PROVINCE_NAMES } from './provinces';
import type { QuotasTable, RuleSet, SectorDef } from './rule-set';
import { renderLocalized, type TemplateVars } from './template';
import { containsPhrase, emptyText, normalize, pickText } from './text';
import {
  LOCALES,
  type Assessment,
  type Country,
  type Holiday,
  type Locale,
  type LocalizedText,
  type Project,
  type ProjectInput,
  type RefId,
  type SectorId,
} from './types';

export interface EngineContext {
  /** ISO date used as "today" for the obligations calendar. */
  today: string;
  holidays: readonly Holiday[];
  countries: readonly Country[];
}

const INTL: Record<Locale, string> = {
  pt: 'pt-MZ',
  en: 'en-GB',
  fr: 'fr-FR',
  zh: 'zh-CN',
  ar: 'ar-EG',
  hi: 'hi-IN',
  sw: 'sw-TZ',
  af: 'af-ZA',
};

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

/** Classifies the free-text idea into a sector by keyword (first match wins). */
export function classifySector(idea: string, table: RuleSet['sectors']): SectorDef {
  const text = normalize(idea);
  for (const sector of table.sectors) {
    const hit = LOCALES.some((l) =>
      (sector.keywords[l] ?? []).some((k) => containsPhrase(text, k)),
    );
    if (hit) return sector;
  }
  return (
    table.sectors.find((s) => s.id === table.fallback) ?? table.sectors[table.sectors.length - 1]
  );
}

export type QuotaStatus = 'none' | 'within' | 'over';

/** Foreign-worker quota (%) for a headcount; falls back to the table maximum. */
export function quotaPercent(workers: number, quotas: QuotasTable): number {
  return quotas.bands.find((b) => workers >= b.minWorkers)?.percent ?? quotas.maxPercent;
}

export function quotaStatus(
  input: Pick<ProjectInput, 'workers' | 'foreignWorkers'>,
  quotas: QuotasTable,
): QuotaStatus {
  if (input.foreignWorkers <= 0) return 'none';
  if (input.workers <= 0) return 'over';
  const ratio = (input.foreignWorkers / input.workers) * 100;
  return ratio > quotaPercent(input.workers, quotas) ? 'over' : 'within';
}

export function deriveFacts(
  input: ProjectInput,
  rules: RuleSet,
  countries: readonly Country[],
): Facts {
  const sector = classifySector(input.idea, rules.sectors);
  const foreignOwned = input.capital !== 'mozambican';
  const country = countries.find((c) => c.code === input.investorCountry);
  const investmentMzn = Math.round(input.investmentUsd * rules.apiex.fxUsdMzn);
  const foreignRatio =
    input.workers > 0 ? Math.round((input.foreignWorkers / input.workers) * 10000) / 100 : 0;
  return {
    ...input,
    sector: sector.id,
    envCategory: sector.envCategory,
    envRelevant: input.needsLand || sector.envCategory !== 'C',
    foreignOwned,
    treaty: foreignOwned && country?.treaty === true,
    investmentMzn,
    fdiMinimumMet: investmentMzn >= rules.apiex.fdiMinimumMzn,
    foreignRatio,
    hasForeignWorkers: input.foreignWorkers > 0,
    quotaStatus: quotaStatus(input, rules.quotas),
    relatedParties: input.shareholderLoan || input.feesAbroad,
    corridor: rules.zones.corridors[input.province] ?? 'none',
  };
}

/** Localised dividend withholding for the investor's country. */
export function treatyRate(
  countryCode: string,
  countries: readonly Country[],
  rules: RuleSet,
): LocalizedText {
  const country = countries.find((c) => c.code === countryCode);
  if (!country?.treaty) return rules.treaties.noTreatyRate;
  const entry = rules.treaties.entries.find((e) => e.country === countryCode);
  if (entry) return entry.dividends;
  return renderLocalized(rules.treaties.unknownTreatyRate, { 'fact.countryCode': countryCode });
}

function templateVars(
  input: ProjectInput,
  facts: Facts,
  rules: RuleSet,
  countries: readonly Country[],
) {
  const country = countries.find((c) => c.code === input.investorCountry);
  const rate = treatyRate(input.investorCountry, countries, rules);
  const sector = rules.sectors.sectors.find((s) => s.id === facts['sector']);
  const vars = {} as Record<Locale, TemplateVars>;
  for (const l of LOCALES) {
    const num = new Intl.NumberFormat(INTL[l], { maximumFractionDigits: 1 });
    vars[l] = {
      'fact.country': pickText(country?.name, l) || input.investorCountry,
      'fact.countryCode': input.investorCountry,
      'fact.treatyRate': pickText(rate, l),
      'fact.ratio': `${num.format(Number(facts['foreignRatio']))}%`,
      'fact.workers': num.format(input.workers),
      'fact.foreignWorkers': num.format(input.foreignWorkers),
      'fact.investmentMzn': `MZN ${num.format(Number(facts['investmentMzn']))}`,
      'fact.investmentUsd': `USD ${num.format(input.investmentUsd)}`,
      'fact.province': pickText(PROVINCE_NAMES[input.province], l),
      'fact.sector': pickText(sector?.label, l),
      'fact.envCategory': String(facts['envCategory'] ?? ''),
      'fact.minQuota': `${rules.quotas.minPercent}%`,
      'fact.maxQuota': `${rules.quotas.maxPercent}%`,
      'fact.quota': `${quotaPercent(input.workers, rules.quotas)}%`,
    };
  }
  return vars;
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------

export function assess(project: Project, rules: RuleSet, ctx: EngineContext): Assessment {
  const input = project.input;
  const base = deriveFacts(input, rules, ctx.countries);

  const vehicleRule = selectFirst(rules.vehicles.rules, base);
  if (!vehicleRule) throw new Error('vehicles.json must contain a catch-all rule');
  const facts: Facts = { ...base, vehicle: vehicleRule.then.recommended };
  const vars = templateVars(input, facts, rules, ctx.countries);
  const L = (t: LocalizedText) => renderLocalized(t, vars);

  const refs = new Set<RefId>();
  const track = <T extends { refs?: RefId[] }>(x: T): T => {
    x.refs?.forEach((r) => refs.add(r));
    return x;
  };

  const optionOf = (v: string) => rules.vehicles.options.find((o) => o.vehicle === v);
  const recommendedDef = optionOf(vehicleRule.then.recommended);

  // Company vs branch comparison (foreign or mixed capital)
  const showComparison = selectFirst(
    [{ id: 'cmp', when: rules.vehicles.comparisonWhen, then: true }],
    facts,
  );
  const companyVsBranch = showComparison
    ? rules.vehicles.comparison.map((row) => track({ ...row }))
    : undefined;

  // Investment regime
  const regime = selectFirst(rules.apiex.regime, facts);
  const guarantee = selectFirst(rules.apiex.fdiGuarantee, facts);

  // Roadmap
  const roadmap = selectAll(rules.roadmap.steps, facts).map((r, i) =>
    track({
      ...r.then,
      number: i + 1,
      title: L(r.then.title),
      authority: L(r.then.authority),
      duration: L(r.then.duration),
      note: L(r.then.note),
      refs: [...r.then.refs],
    }),
  );
  const timeToOperate = selectFirst(rules.roadmap.timeToOperate, facts);

  const holidays = new Set(ctx.holidays.map((h) => h.date));

  const assessment: Assessment = {
    projectRef: project.ref,
    sector: facts['sector'] as SectorId,
    vehicle: {
      recommended: vehicleRule.then.recommended,
      recommendedName: recommendedDef?.name ?? emptyText(),
      reasoning: L(vehicleRule.then.reasoning),
      alternatives: vehicleRule.then.alternatives
        .map((v) => optionOf(v))
        .filter((o): o is NonNullable<typeof o> => !!o)
        .map((o) => ({ vehicle: o.vehicle, name: o.name, whenToChoose: o.whenToChoose })),
    },
    companyVsBranch,
    investmentRegime: track({
      threshold: regime ? L(regime.then.threshold) : emptyText(),
      authority: regime ? L(regime.then.authority) : emptyText(),
      path: regime ? L(regime.then.path) : emptyText(),
      fdiGuarantee: guarantee ? L(guarantee.then.text) : emptyText(),
      refs: [...(regime?.then.refs ?? [])],
    }),
    roadmap,
    timeToOperate: timeToOperate ? L(timeToOperate.then.text) : emptyText(),
    licences: selectAll(rules.licences.licences, facts).map((r) =>
      track({
        ...r.then,
        title: L(r.then.title),
        detail: L(r.then.detail),
        authority: L(r.then.authority),
        refs: [...r.then.refs],
      }),
    ),
    factTriggers: selectAll(rules.triggers.triggers, facts).map((r) =>
      track({
        id: r.id,
        ...r.then,
        fact: L(r.then.fact),
        text: L(r.then.text),
        refs: [...r.then.refs],
      }),
    ),
    incentives: selectAll(rules.incentives.incentives, facts).map((r) =>
      track({
        ...r.then,
        title: L(r.then.title),
        detail: L(r.then.detail),
        conditions: L(r.then.conditions),
        refs: [...r.then.refs],
      }),
    ),
    obligations: selectAll(rules.obligations.obligations, facts)
      .map((r) =>
        track({
          ...r.then,
          title: L(r.then.title),
          frequency: L(r.then.frequency),
          note: r.then.note ? L(r.then.note) : undefined,
          next: nextDueDates(r.then.schedule, ctx.today, holidays, 3),
          refs: [...r.then.refs],
        }),
      )
      .sort(byNextDueDate),
    location: selectAll(rules.zones.location, facts).map((r) =>
      track({ ...r.then, title: L(r.then.title), text: L(r.then.text), refs: [...r.then.refs] }),
    ),
    financing: selectAll(rules.zones.financing, facts).map((r) =>
      track({ ...r.then, title: L(r.then.title), text: L(r.then.text), refs: [...r.then.refs] }),
    ),
    esg: selectAll(rules.zones.esg, facts).map((r) =>
      track({ ...r.then, title: L(r.then.title), text: L(r.then.text), refs: [...r.then.refs] }),
    ),
    watchPoints: selectAll(rules.triggers.watchPoints, facts).map((r) => {
      track({ refs: r.then.refs });
      return L(r.then.text);
    }),
    refs: [],
  };
  assessment.refs = [...refs];
  return assessment;
}

/** Soonest deadline first; obligations without a fixed date go last. */
function byNextDueDate(a: { next: { date: string }[] }, b: { next: { date: string }[] }): number {
  const da = a.next[0]?.date ?? '9999';
  const db = b.next[0]?.date ?? '9999';
  return da.localeCompare(db);
}

// ---------------------------------------------------------------------------
// Visitor projects
// ---------------------------------------------------------------------------

/** Builds a stored Project (title, sector, summary) from free input. */
export function describeProject(
  ref: string,
  input: ProjectInput,
  rules: RuleSet,
  createdAt: string,
): Project {
  const sector = classifySector(input.idea, rules.sectors);
  const firstSentence = input.idea.trim().split(/(?<=[.!?])\s|\n/)[0] ?? '';
  const short =
    firstSentence.length > 72 ? firstSentence.slice(0, 69).trimEnd() + '…' : firstSentence;
  const title = {} as LocalizedText;
  const summary = {} as LocalizedText;
  for (const l of LOCALES) {
    title[l] = short || sector.label[l];
    const usd = new Intl.NumberFormat(INTL[l], {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(input.investmentUsd);
    summary[l] = `${sector.label[l]} · ${PROVINCE_NAMES[input.province][l]} · ${usd}`;
  }
  return { ref, example: false, title, sector: sector.label, summary, input, createdAt };
}
