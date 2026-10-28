import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { pickText } from '@core/domain/text';
import type { Enquiry, EnquiryStatus } from '@core/domain/types';
import { ImDatePipe, LocPipe, MoneyPipe, NumberPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { EnquiryRepository, ReferenceData } from '@core/ports';
import { STATUSES } from './lead-statuses';
import { Skeleton } from '@shared/ui/skeleton';
import { expertName, isPublicExpert } from './experts';
import { fitScore, leadExpert, leadMetrics, type FitScore } from './lead-metrics';

type ExpertFilter = 'all' | 'tax-advisory' | 'public';

interface LeadCard {
  e: Enquiry;
  fit: FitScore;
  fresh: boolean;
}

/** 21 · Leads: consented handoffs from first contact to mandate. */
@Component({
  selector: 'im-leads-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, ImDatePipe, LocPipe, MoneyPipe, NumberPipe, Skeleton],
  styleUrl: './office.css',
  template: `
    <div *transloco="let t" class="office-page">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <h1 class="font-serif text-3xl font-medium sm:text-[2rem]">
            {{ t('office.leads.title') }}
          </h1>
          <p class="text-[0.9375rem] text-muted">{{ t('office.leads.intro') }}</p>
        </div>
        <div
          class="flex flex-wrap gap-2"
          role="group"
          [attr.aria-label]="t('office.leads.filterExpert')"
        >
          @for (f of filters; track f) {
            <button
              type="button"
              class="pill"
              [attr.aria-pressed]="filter() === f"
              (click)="filter.set(f)"
            >
              {{ t('office.leads.filter.' + f) }}
            </button>
          }
        </div>
      </header>

      <!-- Metrics -->
      <dl class="card grid grid-cols-2 gap-x-6 gap-y-4 p-5 md:grid-cols-4">
        <div class="flex flex-col gap-1">
          <dt class="label-caps text-muted">{{ t('office.leads.metrics.month') }}</dt>
          <dd class="stat-value">{{ metrics().thisMonth }}</dd>
        </div>
        <div class="flex flex-col gap-1">
          <dt class="label-caps text-muted">{{ t('office.leads.metrics.conversion') }}</dt>
          <dd class="stat-value">
            {{ metrics().conversion | num: lang() : { style: 'percent' } }}
          </dd>
        </div>
        <div class="flex flex-col gap-1">
          <dt class="label-caps text-muted">{{ t('office.leads.metrics.reply') }}</dt>
          <dd class="stat-value">
            @if (metrics().medianReplyHours !== null) {
              {{ t('office.leads.hours', { n: metrics().medianReplyHours }) }}
            } @else {
              —
            }
          </dd>
        </div>
        <div class="flex flex-col gap-1">
          <dt class="label-caps text-muted">{{ t('office.leads.metrics.response') }}</dt>
          <dd class="stat-value">
            {{ metrics().responseRate | num: lang() : { style: 'percent' } }}
          </dd>
        </div>
        <p class="col-span-2 text-xs text-muted md:col-span-4">
          {{ t('office.leads.metrics.note', { n: metrics().total }) }}
        </p>
      </dl>

      <!-- Pipeline -->
      @if (!loaded()) {
        <im-skeleton [lines]="6" />
      } @else {
        <div class="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          @for (s of statuses; track s) {
            <section class="flex flex-col gap-2.5" [attr.aria-labelledby]="'col-' + s">
              <h2 [id]="'col-' + s" class="label-caps text-muted">
                {{ t('office.leads.stage.' + s) }} · {{ columns()[s].length }}
              </h2>
              <ul role="list" class="flex flex-col gap-2.5">
                @for (c of columns()[s]; track c.e.ref) {
                  <li>
                    <a
                      class="lead card"
                      [class.lead--fresh]="c.fresh"
                      [class.lead--won]="s === 'won'"
                      [routerLink]="['/', lang(), 'office', 'leads', c.e.ref]"
                    >
                      <span class="flex items-start justify-between gap-2">
                        <strong class="text-[0.90625rem]">{{ c.e.company }}</strong>
                        <span class="tag" [class]="fitClass(c)">{{ fitLabel(c) }}</span>
                      </span>
                      @if (c.fresh) {
                        <span class="tag tag-warn self-start">{{ t('office.leads.new') }}</span>
                      }
                      @if (c.e.projectSnapshot; as p) {
                        <span class="text-[0.8125rem] text-muted">
                          {{ provinces[p.input.province] | loc: lang() }} ·
                          {{ p.input.investmentUsd | money: 'USD' : lang() }} ·
                          {{ country(p.input.investorCountry) }}
                        </span>
                      } @else {
                        <span class="text-[0.8125rem] text-muted"
                          >{{ c.e.name }} · {{ c.e.createdAt | imDate: lang() : 'medium' }}</span
                        >
                      }
                      <span class="text-[0.78125rem]">
                        {{ t('office.leads.needs') }}:
                        @for (a of c.e.areas; track a; let last = $last) {
                          {{ t('topics.' + a) }}{{ last ? '' : ', ' }}
                        }
                      </span>
                      <span class="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted">
                        <span>{{ expert(c.e) }}</span>
                        @if (c.e.consent?.shareSummary) {
                          <span>· {{ t('office.leads.consent') }} ✓</span>
                        }
                        @if (c.e.projectSnapshot) {
                          <span>· {{ t('office.leads.roadmapAttached') }}</span>
                        }
                        @if (c.e.callSlot) {
                          <span
                            >·
                            {{
                              t('office.leads.call', {
                                date: c.e.callSlot | imDate: lang() : 'datetime',
                              })
                            }}</span
                          >
                        }
                        @if (c.e.channel) {
                          <span>· {{ t('office.channel.' + c.e.channel) }}</span>
                        }
                      </span>
                    </a>
                  </li>
                } @empty {
                  <li class="rounded-lg border border-dashed border-rule p-4 text-sm text-muted">
                    {{ t('office.leads.emptyStage') }}
                  </li>
                }
              </ul>
            </section>
          }
        </div>
      }
      <p class="text-xs text-muted">{{ t('office.leads.fitNote') }}</p>
    </div>
  `,
  styles: `
    .lead {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.875rem;
      color: var(--ink);
      text-decoration: none;
      box-shadow: none;
    }
    .lead:hover {
      border-color: var(--brand);
    }
    .lead--fresh {
      border: 2px solid var(--brand);
    }
    .lead--won {
      background: var(--ok-bg);
    }
  `,
})
export class LeadsPage {
  private readonly repo = inject(EnquiryRepository);
  private readonly refData = inject(ReferenceData);
  private readonly locale = inject(LocaleService);
  protected readonly lang = this.locale.lang;
  protected readonly statuses = STATUSES;
  protected readonly provinces = PROVINCE_NAMES;
  protected readonly filters: ExpertFilter[] = ['all', 'tax-advisory', 'public'];
  protected readonly filter = signal<ExpertFilter>('all');
  protected readonly loaded = this.repo.loaded;

  private readonly countries = resource({ loader: () => this.refData.countries() });

  private readonly visible = computed(() => {
    const f = this.filter();
    return this.repo.enquiries().filter((e) => {
      if (f === 'all') return true;
      const pub = isPublicExpert(leadExpert(e));
      return f === 'public' ? pub : !pub;
    });
  });

  protected readonly metrics = computed(() => leadMetrics(this.visible()));

  protected readonly columns = computed(() => {
    const cols = Object.fromEntries(STATUSES.map((s) => [s, [] as LeadCard[]])) as Record<
      EnquiryStatus,
      LeadCard[]
    >;
    for (const e of this.visible()) {
      cols[e.status].push({ e, fit: fitScore(e), fresh: this.repo.isUnseen(e.ref) });
    }
    return cols;
  });

  constructor() {
    void this.repo.load();
  }

  protected country(code: string): string {
    return (
      pickText(this.countries.value()?.find((c) => c.code === code)?.name, this.lang()) || code
    );
  }

  protected expert(e: Enquiry): string {
    return expertName(leadExpert(e));
  }

  protected fitClass(c: LeadCard): string {
    if (c.e.projectSnapshot?.input.capital === 'mozambican') return 'tag tag-neutral';
    return { high: 'tag tag-ok', medium: 'tag tag-warn', low: 'tag tag-neutral' }[c.fit.band];
  }

  protected fitLabel(c: LeadCard): string {
    this.lang();
    if (c.e.projectSnapshot?.input.capital === 'mozambican')
      return this.locale.t('office.leads.local');
    return this.locale.t('office.leads.fit.' + c.fit.band, { n: c.fit.score });
  }
}
