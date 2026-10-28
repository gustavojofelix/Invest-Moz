import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { RULE_SET } from '@core/domain/rule-set.data';
import { classifySector } from '@core/domain/rules-engine';
import { pickText } from '@core/domain/text';
import { PROVINCES, type ProvinceCode, type SectorId } from '@core/domain/types';
import { LocPipe, formatMoney } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { ProjectRepository } from '@core/ports';
import { OpportunityData } from '@features/map/opportunities';
import { ConfirmText } from '@shared/ui/confirm-text';
import { Icon } from '@shared/ui/icon';
import { RefTag } from '@shared/ui/ref-tag';
import { EstimatorData, type Benefit, type RegimeId } from './estimator-data';

const SECTORS: readonly SectorId[] = [
  'agro_industry',
  'tourism',
  'energy',
  'logistics',
  'mining',
  'oil_gas',
  'services',
  'general',
];

function asProvince(v: string | undefined): ProvinceCode | null {
  return (PROVINCES as readonly string[]).includes(v ?? '') ? (v as ProvinceCode) : null;
}

function asSector(v: string | undefined): SectorId | null {
  return (SECTORS as readonly string[]).includes(v ?? '') ? (v as SectorId) : null;
}

interface Row {
  benefit: Benefit;
  likely: boolean;
  estimate: string | null;
}

/** 8 · Incentive estimator: indicative fiscal and customs benefits by sector, province and regime. */
@Component({
  selector: 'im-incentives-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, TranslocoDirective, LocPipe, RefTag, ConfirmText],
  template: `
    <ng-container *transloco="let t">
      <header class="border-b border-rule bg-paper">
        <div class="container-page py-6 sm:py-8">
          <p class="eyebrow text-brand">{{ t('incentives.eyebrow') }}</p>
          <h1 class="mt-1 font-serif text-2xl sm:text-3xl">{{ t('incentives.title') }}</h1>
          <p class="mt-2 max-w-2xl text-muted">{{ t('incentives.intro') }}</p>
        </div>
      </header>

      <div class="container-page grid gap-6 py-6 lg:grid-cols-12 lg:py-10">
        <form
          class="card grid min-w-0 grid-cols-2 content-start gap-3 p-4 sm:p-5 lg:sticky lg:top-24 lg:col-span-5"
          (submit)="$event.preventDefault()"
          [attr.aria-label]="t('incentives.form')"
        >
          <div class="col-span-2 min-w-0 sm:col-span-1 lg:col-span-2 xl:col-span-1">
            <label class="field-label" for="inc-sector">{{ t('incentives.fields.sector') }}</label>
            <select
              id="inc-sector"
              class="input mt-1.5"
              [value]="chosenSector()"
              (change)="chosenSector.set($any($event.target).value)"
            >
              @for (s of sectors; track s) {
                <option [value]="s">{{ t('incentives.sectors.' + s) }}</option>
              }
            </select>
          </div>
          <div class="col-span-2 min-w-0 sm:col-span-1 lg:col-span-2 xl:col-span-1">
            <label class="field-label" for="inc-province">{{
              t('incentives.fields.province')
            }}</label>
            <select
              id="inc-province"
              class="input mt-1.5"
              [value]="chosenProvince()"
              (change)="chosenProvince.set($any($event.target).value)"
            >
              @for (p of provinceOptions(); track p.code) {
                <option [value]="p.code">{{ p.name }}</option>
              }
            </select>
          </div>
          <div class="min-w-0">
            <label class="field-label" for="inc-amount">{{ t('incentives.fields.amount') }}</label>
            <input
              id="inc-amount"
              class="input mt-1.5"
              type="number"
              inputmode="numeric"
              min="0"
              step="10000"
              [value]="amount()"
              (input)="amount.set(toNumber($any($event.target).value))"
              aria-describedby="inc-amount-hint"
            />
            <p id="inc-amount-hint" class="field-hint">{{ amountLabel() }}</p>
          </div>
          <div class="min-w-0">
            <label class="field-label" for="inc-jobs">{{ t('incentives.fields.jobs') }}</label>
            <input
              id="inc-jobs"
              class="input mt-1.5"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              [value]="jobs()"
              (input)="jobs.set(toNumber($any($event.target).value))"
            />
          </div>

          <fieldset class="col-span-2 mt-1">
            <legend class="field-label">{{ t('incentives.fields.regime') }}</legend>
            <div class="mt-1.5 grid grid-cols-3 gap-1.5">
              @for (r of regimes(); track r.id) {
                <button
                  type="button"
                  class="regime"
                  [attr.aria-pressed]="chosenRegime() === r.id"
                  (click)="chosenRegime.set(r.id)"
                >
                  {{ r.label | loc: lang() }}
                </button>
              }
            </div>
            @if (regimeDef(); as r) {
              <p class="field-hint mt-2">{{ r.hint | loc: lang() }}</p>
            }
          </fieldset>

          @if (chosenRegime() === 'ifz') {
            <label class="col-span-2 flex min-h-11 items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                class="mt-0.5 h-5 w-5 shrink-0 accent-brand"
                [checked]="exports70()"
                (change)="exports70.set($any($event.target).checked)"
              />
              <span>{{ t('incentives.fields.exports70') }}</span>
            </label>
          }
        </form>

        <section class="min-w-0 lg:col-span-7" [attr.aria-label]="t('incentives.results')">
          <div
            class="flex gap-3 rounded-md bg-warn-bg px-4 py-3 text-sm leading-relaxed text-warn-ink"
            role="note"
          >
            <svg
              imIcon="triangle-alert"
              [size]="20"
              class="mt-0.5 shrink-0"
              aria-hidden="true"
            ></svg>
            <div>
              <p class="font-bold">{{ t('incentives.warning.title') }}</p>
              <p class="mt-0.5">{{ t('incentives.warning.text') }}</p>
            </div>
          </div>

          <h2 class="mt-6 font-serif text-xl">
            {{ t('incentives.heading', { regime: (regimeDef()?.label | loc: lang()) ?? '' }) }}
          </h2>
          <ul class="mt-3 space-y-3" role="list">
            @for (row of rows(); track row.benefit.id) {
              <li class="card p-4">
                <div class="flex items-start justify-between gap-3">
                  <h3 class="text-base font-bold">{{ row.benefit.title | loc: lang() }}</h3>
                  <span class="tag" [class.tag-ok]="row.likely" [class.tag-warn]="!row.likely">{{
                    row.likely ? t('incentives.status.likely') : t('incentives.status.check')
                  }}</span>
                </div>
                <p class="mt-1 text-sm text-muted">
                  <span class="label-caps me-1 text-[0.6875rem]">{{
                    t('incentives.kind.' + row.benefit.kind)
                  }}</span>
                </p>
                <p class="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  <im-confirm-text [text]="row.benefit.detail | loc: lang()" />
                </p>
                @if (row.estimate) {
                  <p class="mt-2 text-sm">
                    <span class="font-bold">{{ t('incentives.estimate.label') }}</span>
                    {{ row.estimate }}
                    <span class="text-muted">· {{ t('incentives.estimate.note') }}</span>
                    <im-confirm-text [text]="itcRate" />
                  </p>
                }
                @if (!row.likely && row.benefit.status === 'exports') {
                  <p class="mt-2 text-sm text-warn-ink">{{ t('incentives.exportsNeeded') }}</p>
                }
                <div class="mt-3 flex flex-wrap gap-2">
                  @for (r of row.benefit.refs; track r) {
                    <im-ref-tag [refId]="r" />
                  }
                </div>
              </li>
            }
          </ul>

          @if (chosenRegime() !== 'general') {
            <div class="card mt-4 p-4">
              <h3 class="label-caps text-muted">
                {{ t('incentives.zones.title', { province: provinceName() }) }}
              </h3>
              @if (zones().length) {
                <ul class="mt-2 divide-y divide-rule-soft" role="list">
                  @for (z of zones(); track z.id) {
                    <li class="py-2">
                      <span class="font-bold">{{ z.name | loc: lang() }}</span>
                      <span class="block text-sm text-muted">{{ z.detail | loc: lang() }}</span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="mt-2 text-sm text-muted">{{ t('incentives.zones.none') }}</p>
              }
              <a
                class="link mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm"
                [routerLink]="['/', lang(), 'map']"
                [queryParams]="{ province: chosenProvince(), sector: chosenSector() }"
                >{{ t('incentives.zones.map') }}
                <svg imIcon="arrow-right" [size]="16" class="flip" aria-hidden="true"></svg
              ></a>
            </div>
          }

          <div class="mt-5 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
            <span class="label-caps me-1 text-muted">{{ t('incentives.sources') }}</span>
            <im-ref-tag refId="lei-4-2009" [label]="'Lei n.º 4/2009 · CBF'" />
            <im-ref-tag refId="lei-8-2023" />
            <im-ref-tag refId="zee-zfi" />
          </div>
          <p class="mt-3 text-xs text-muted">{{ t('disclaimer') }}</p>

          <div class="surface-deep mt-6 rounded-xl p-5 sm:p-6">
            <p class="eyebrow text-on-deep-muted">{{ t('incentives.upgrade.eyebrow') }}</p>
            <h2 class="mt-1 font-serif text-xl">{{ t('incentives.upgrade.title') }}</h2>
            <p class="mt-2 text-sm text-on-deep-muted">{{ t('incentives.upgrade.text') }}</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <a
                class="btn btn-highlight"
                [routerLink]="['/', lang(), 'expert']"
                [queryParams]="{ from: 'incentives' }"
                >{{ t('incentives.upgrade.cta') }}</a
              >
              @if (projectRef(); as ref) {
                <a
                  class="btn btn-outline border-brand-line text-on-deep"
                  [routerLink]="['/', lang(), 'roadmap', ref]"
                  >{{ t('incentives.roadmap') }}</a
                >
              } @else {
                <a
                  class="btn btn-outline border-brand-line text-on-deep"
                  [routerLink]="['/', lang(), 'pathfinder']"
                  >{{ t('incentives.pathfinder') }}</a
                >
              }
            </div>
          </div>
        </section>
      </div>
    </ng-container>
  `,
  styles: `
    .regime {
      min-height: 2.75rem;
      padding: 0.375rem 0.5rem;
      border: 1px solid var(--rule);
      border-radius: var(--radius);
      background: var(--paper);
      color: var(--ink);
      font: inherit;
      font-size: 0.875rem;
      line-height: 1.2;
    }
    .regime:hover {
      border-color: var(--brand);
    }
    .regime[aria-pressed='true'] {
      background: var(--brand);
      border-color: var(--brand);
      color: var(--brand-ink);
      font-weight: 700;
    }
    :host-context([dir='rtl']) .flip {
      transform: scaleX(-1);
    }
  `,
})
export class IncentivesPage {
  readonly sector = input<string>();
  readonly province = input<string>();
  readonly regime = input<string>();
  private readonly projects = inject(ProjectRepository);
  private readonly tables = inject(EstimatorData);
  private readonly opportunities = inject(OpportunityData);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly sectors = SECTORS;
  protected readonly projectRef = this.projects.currentRef;
  protected readonly itcRate = '({{ITC_RATE_BY_LOCATION}})';

  private readonly data = resource({ loader: () => this.tables.load() });
  private readonly map = resource({ loader: () => this.opportunities.load() });
  private readonly project = resource({
    params: () => this.projects.currentRef(),
    loader: async ({ params: ref }) => (ref ? this.projects.get(ref) : null),
  });

  protected readonly chosenSector = linkedSignal<SectorId>(() => {
    const p = this.project.value();
    return (
      asSector(this.sector()) ??
      (p ? classifySector(p.input.idea, RULE_SET.sectors).id : 'agro_industry')
    );
  });
  protected readonly chosenProvince = linkedSignal<ProvinceCode>(
    () => asProvince(this.province()) ?? this.project.value()?.input.province ?? 'nampula',
  );
  protected readonly amount = linkedSignal(
    () => this.project.value()?.input.investmentUsd ?? 2_000_000,
  );
  protected readonly jobs = linkedSignal(() => {
    const p = this.project.value()?.input;
    return p ? Math.max(0, p.workers - p.foreignWorkers) : 80;
  });
  protected readonly chosenRegime = linkedSignal<RegimeId>(() => {
    const r = this.regime();
    return r === 'sez' || r === 'ifz' ? r : 'general';
  });
  protected readonly exports70 = linkedSignal(() => !!this.project.value()?.input.exports);

  protected readonly regimes = computed(() => this.data.value()?.regimes ?? []);
  protected readonly regimeDef = computed(() =>
    this.regimes().find((r) => r.id === this.chosenRegime()),
  );

  protected readonly provinceOptions = computed(() => {
    const l = this.lang();
    return PROVINCES.map((code) => ({ code, name: pickText(PROVINCE_NAMES[code], l) }));
  });
  protected readonly provinceName = computed(() =>
    pickText(PROVINCE_NAMES[this.chosenProvince()], this.lang()),
  );
  protected readonly amountLabel = computed(() => formatMoney(this.amount(), 'USD', this.lang()));

  protected readonly rows = computed<Row[]>(() => {
    const d = this.data.value();
    if (!d) return [];
    const regime = this.chosenRegime();
    const sector = this.chosenSector();
    const amount = this.amount();
    const mzn = amount * RULE_SET.apiex.fxUsdMzn;
    const l = this.lang();
    return d.benefits
      .filter(
        (b) =>
          (b.regime === regime || (b.regime === 'zones' && regime !== 'general')) &&
          (!b.sectors || b.sectors.includes(sector)) &&
          (!b.minInvestmentMzn || mzn >= b.minInvestmentMzn),
      )
      .map((b) => {
        const likely =
          b.status === 'likely' ||
          (b.status === 'jobs' && this.jobs() > 0) ||
          (b.status === 'exports' && this.exports70());
        let estimate: string | null = null;
        if (b.estimate === 'itc' && b.estimateRange && amount > 0) {
          const [lo, hi] = b.estimateRange;
          estimate = `${formatMoney((amount * lo) / 100, 'USD', l)} – ${formatMoney((amount * hi) / 100, 'USD', l)}`;
        }
        return { benefit: b, likely, estimate };
      });
  });

  protected readonly zones = computed(() => {
    const d = this.map.value();
    const regime = this.chosenRegime();
    if (!d || regime === 'general') return [];
    const kinds = regime === 'sez' ? ['sez'] : ['ifz', 'park'];
    return d.zones.filter((z) => z.province === this.chosenProvince() && kinds.includes(z.kind));
  });

  protected toNumber(v: string): number {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  }
}
