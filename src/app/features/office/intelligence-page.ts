import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { SafeStorage } from '@core/adapters/safe-storage';
import { RULE_SET } from '@core/domain/rule-set.data';
import { pickText } from '@core/domain/text';
import { ImDatePipe, LocPipe, NumberPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { ReferenceData } from '@core/ports';
import { Icon } from '@shared/ui/icon';
import { OfficeData, type IntelPeriod } from './office-data';

const TASKS_KEY = 'office.contentTasks';

/** 22 · Investor intelligence: anonymised demand data for the quarterly partner report. */
@Component({
  selector: 'im-intelligence-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoDirective, ImDatePipe, LocPipe, NumberPipe, Icon],
  styleUrl: './office.css',
  template: `
    <div *transloco="let t" class="office-page">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <h1 class="font-serif text-3xl font-medium sm:text-[2rem]">
            {{ t('office.intel.title') }}
          </h1>
          <p class="text-[0.9375rem] text-muted">{{ t('office.intel.intro') }}</p>
        </div>
        @if (seed.value(); as s) {
          <div class="no-print flex flex-wrap items-center gap-2">
            <label class="sr-only" for="period">{{ t('office.intel.period') }}</label>
            <select
              id="period"
              class="input w-auto"
              [ngModel]="periodId()"
              (ngModelChange)="periodId.set($event)"
            >
              @for (p of s.intel.periods; track p.id) {
                <option [value]="p.id">{{ periodLabel(p) }}</option>
              }
            </select>
            <button type="button" class="btn btn-primary btn-sm" (click)="exportCsv()">
              <svg imIcon="download" [size]="16" aria-hidden="true"></svg
              >{{ t('office.intel.export') }}
            </button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="print()">
              <svg imIcon="printer" [size]="16" aria-hidden="true"></svg
              >{{ t('office.intel.print') }}
            </button>
          </div>
        }
      </header>

      <p
        class="flex items-start gap-2 rounded-md bg-warn-bg px-4 py-3 text-sm text-warn-ink"
        role="note"
      >
        <svg imIcon="info" [size]="18" class="mt-0.5" aria-hidden="true"></svg>
        {{ t('office.intel.demoBanner') }}
      </p>

      @if (period(); as p) {
        <p class="text-sm text-muted">
          {{ periodLabel(p) }} · {{ p.from | imDate: lang() : 'medium' }} –
          {{ p.to | imDate: lang() : 'medium' }}
        </p>

        <!-- KPI tiles -->
        <dl class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          @for (k of kpis(); track k.key) {
            <div class="card stat-tile">
              <dt class="label-caps text-muted">{{ t('office.intel.kpi.' + k.key) }}</dt>
              <dd class="stat-value">{{ k.value }}</dd>
              @if (k.delta !== null) {
                <dd class="text-xs text-muted">
                  {{ t('office.intel.delta', { d: k.delta, prev: k.prev }) }}
                </dd>
              }
            </div>
          }
        </dl>

        <div class="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[3fr_2fr]">
          <!-- Demand by sector -->
          <section class="card p-5" aria-labelledby="sector-title">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="sector-title" class="text-base font-bold">
                {{ t('office.intel.sectorTitle') }}
              </h2>
              <span class="text-xs text-muted">{{ t('office.intel.sectorNote') }}</span>
            </div>
            <div
              class="table-wrap mt-3"
              tabindex="0"
              role="region"
              [attr.aria-labelledby]="'sector-title'"
            >
              <table class="bars">
                <caption class="sr-only">
                  {{
                    t('office.intel.sectorTitle')
                  }}
                  ·
                  {{
                    periodLabel(p)
                  }}
                </caption>
                <thead class="sr-only">
                  <tr>
                    <th scope="col">{{ t('office.intel.col.sector') }}</th>
                    <th scope="col">{{ t('office.intel.col.bar') }}</th>
                    <th scope="col">{{ t('office.intel.col.roadmaps') }}</th>
                    <th scope="col">{{ t('office.intel.col.share') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of sectors(); track s.id) {
                    <tr>
                      <th scope="row">{{ s.label }}</th>
                      <td class="w-full">
                        <span class="track" aria-hidden="true">
                          <span class="bar" [style.width.%]="s.width"></span>
                        </span>
                      </td>
                      <td class="text-end font-bold">{{ s.value | num: lang() }}</td>
                      <td class="text-end text-muted">
                        {{ s.share | num: lang() : { style: 'percent' } }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <!-- Origins -->
          <section class="card p-5" aria-labelledby="origin-title">
            <h2 id="origin-title" class="text-base font-bold">
              {{ t('office.intel.originTitle') }}
            </h2>
            <ol role="list" class="mt-3 flex flex-col divide-y divide-rule-soft text-sm">
              @for (o of origins(); track o.code; let i = $index) {
                <li class="flex items-center justify-between gap-3 py-2">
                  <span
                    ><span class="me-2 font-mono text-xs text-muted">{{ i + 1 }}</span
                    >{{ o.name }}</span
                  >
                  <span class="font-bold">{{ o.value | num: lang() }}</span>
                </li>
              }
            </ol>
            <p class="mt-3 text-xs text-muted">{{ t('office.intel.originNote') }}</p>
          </section>
        </div>

        <!-- Unanswered questions -> content tasks -->
        @if (seed.value(); as s) {
          <section class="card p-5" aria-labelledby="gaps-title">
            <h2 id="gaps-title" class="text-base font-bold">
              {{ t('office.intel.unansweredTitle') }}
            </h2>
            <p class="mt-1 text-sm text-muted">{{ t('office.intel.unansweredIntro') }}</p>
            <ul role="list" class="mt-3 flex flex-col divide-y divide-rule-soft">
              @for (u of s.intel.unanswered; track u.id) {
                <li class="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span class="min-w-0 text-sm">
                    <strong>{{ u.text | loc: lang() }}</strong>
                    <span class="block text-xs text-muted">
                      {{ t('topics.' + u.topic) }} · {{ t('office.intel.asked', { n: u.asked }) }}
                    </span>
                  </span>
                  @if (tasks().includes(u.id)) {
                    <span class="tag tag-ok">{{ t('office.intel.taskCreated') }}</span>
                  } @else {
                    <button
                      type="button"
                      class="btn btn-outline btn-sm no-print"
                      (click)="createTask(u.id)"
                    >
                      <svg imIcon="file-plus" [size]="16" aria-hidden="true"></svg
                      >{{ t('office.intel.createTask') }}
                    </button>
                  }
                </li>
              }
            </ul>
          </section>
        }
      }
      <p class="sr-only" aria-live="polite">{{ announce() }}</p>
    </div>
  `,
  styles: `
    .bars {
      width: 100%;
      min-width: 22rem;
      border-collapse: collapse;
      font-size: 0.84375rem;
    }
    .bars th,
    .bars td {
      padding: 0.3125rem 0.5rem;
      white-space: nowrap;
    }
    .bars th {
      text-align: start;
      font-weight: 500;
      padding-inline-start: 0;
    }
    .track {
      display: block;
      height: 1.125rem;
      min-width: 6rem;
      border-radius: 4px;
      background: var(--surface-alt);
    }
    .bar {
      display: block;
      height: 100%;
      border-radius: 4px;
      background: var(--brand);
    }
    @media (forced-colors: active) {
      .bar {
        background: CanvasText;
      }
    }
  `,
})
export class IntelligencePage {
  private readonly data = inject(OfficeData);
  private readonly refData = inject(ReferenceData);
  private readonly storage = inject(SafeStorage);
  private readonly document = inject(DOCUMENT);
  private readonly locale = inject(LocaleService);
  protected readonly lang = this.locale.lang;

  protected readonly periodId = signal('2026-Q4');
  protected readonly tasks = signal<string[]>(this.storage.get<string[]>(TASKS_KEY, []));
  protected readonly announce = signal('');

  protected readonly seed = resource({
    loader: async () => {
      const [intel, countries] = await Promise.all([
        this.data.intelligence(),
        this.refData.countries(),
      ]);
      return { intel, countries };
    },
  });

  protected readonly period = computed(() =>
    this.seed.value()?.intel.periods.find((p) => p.id === this.periodId()),
  );
  private readonly previous = computed(() => {
    const periods = this.seed.value()?.intel.periods ?? [];
    const i = periods.findIndex((p) => p.id === this.periodId());
    return i >= 0 ? periods[i + 1] : undefined;
  });

  protected readonly kpis = computed(() => {
    const p = this.period();
    if (!p) return [];
    const prev = this.previous();
    const n = (v: number) => new Intl.NumberFormat(this.locale.intl()).format(v);
    const pct = (v: number) =>
      new Intl.NumberFormat(this.locale.intl(), { style: 'percent' }).format(v);
    const delta = (a: number, b?: number) =>
      b
        ? new Intl.NumberFormat(this.locale.intl(), {
            style: 'percent',
            signDisplay: 'always',
          }).format(a / b - 1)
        : null;
    const prevLabel = prev ? this.periodLabel(prev) : '';
    return [
      {
        key: 'conversations',
        value: n(p.conversations),
        delta: delta(p.conversations, prev?.conversations),
        prev: prevLabel,
      },
      {
        key: 'investors',
        value: n(p.investors),
        delta: delta(p.investors, prev?.investors),
        prev: prevLabel,
      },
      {
        key: 'roadmaps',
        value: n(p.roadmaps),
        delta: delta(p.roadmaps, prev?.roadmaps),
        prev: prevLabel,
      },
      { key: 'origins', value: n(p.origins.length), delta: null, prev: prevLabel },
      { key: 'citation', value: pct(p.citationRate), delta: null, prev: prevLabel },
    ];
  });

  protected readonly sectors = computed(() => {
    const p = this.period();
    if (!p) return [];
    const total = p.sectors.reduce((s, x) => s + x.roadmaps, 0) || 1;
    const max = Math.max(...p.sectors.map((s) => s.roadmaps), 1);
    return [...p.sectors]
      .sort((a, b) => b.roadmaps - a.roadmaps)
      .map((s) => ({
        id: s.sector,
        label: pickText(
          RULE_SET.sectors.sectors.find((x) => x.id === s.sector)?.label,
          this.lang(),
        ),
        value: s.roadmaps,
        share: s.roadmaps / total,
        width: (s.roadmaps / max) * 100,
      }));
  });

  protected readonly origins = computed(() => {
    const v = this.seed.value();
    const p = this.period();
    if (!v || !p) return [];
    return [...p.origins]
      .sort((a, b) => b.investors - a.investors)
      .map((o) => ({
        code: o.country,
        name:
          pickText(v.countries.find((c) => c.code === o.country)?.name, this.lang()) || o.country,
        value: o.investors,
      }));
  });

  protected periodLabel(p: IntelPeriod): string {
    const [year, q] = p.id.split('-');
    return `${q} ${year}`;
  }

  protected createTask(id: string): void {
    this.tasks.update((t) => [...t, id]);
    this.storage.set(TASKS_KEY, this.tasks());
    this.announce.set(this.locale.t('office.intel.taskCreated'));
  }

  protected print(): void {
    this.document.defaultView?.print();
  }

  /** Downloads the period as CSV (the quarterly partner report, demo data). */
  protected exportCsv(): void {
    const p = this.period();
    const v = this.seed.value();
    if (!p || !v) return;
    const t = (k: string) => this.locale.t(k);
    const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    const lines: (string | number)[][] = [
      [t('office.intel.title'), this.periodLabel(p), t('office.intel.demoBanner')],
      [],
      [t('office.intel.kpi.conversations'), p.conversations],
      [t('office.intel.kpi.investors'), p.investors],
      [t('office.intel.kpi.roadmaps'), p.roadmaps],
      [t('office.intel.kpi.origins'), p.origins.length],
      [t('office.intel.kpi.citation'), p.citationRate],
      [],
      [t('office.intel.col.sector'), t('office.intel.col.roadmaps')],
      ...this.sectors().map((s) => [s.label, s.value]),
      [],
      [t('office.intel.originTitle'), t('office.intel.kpi.investors')],
      ...this.origins().map((o) => [o.name, o.value]),
      [],
      [t('office.intel.unansweredTitle'), t('office.intel.col.asked')],
      ...v.intel.unanswered.map((u) => [pickText(u.text, this.lang()), u.asked]),
    ];
    const csv = '﻿' + lines.map((l) => l.map(q).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = this.document.createElement('a');
    a.href = url;
    a.download = `tiva-intelligence-${p.id}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.announce.set(this.locale.t('office.intel.exported'));
  }
}
