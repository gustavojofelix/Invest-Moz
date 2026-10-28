import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { RULE_SET } from '@core/domain/rule-set.data';
import { pickText } from '@core/domain/text';
import type { EnquiryStatus } from '@core/domain/types';
import { ImDatePipe, LocPipe, MoneyPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { EnquiryRepository, ReferenceData } from '@core/ports';
import { STATUSES } from './lead-statuses';
import { EmptyState } from '@shared/ui/empty-state';
import { Icon } from '@shared/ui/icon';
import { Skeleton } from '@shared/ui/skeleton';
import { StatusPill } from '@shared/ui/status-pill';
import { expertName } from './experts';
import { fitScore, leadExpert, leadSector } from './lead-metrics';

/** 21 · Lead detail: status, attached project and roadmap, handoff, internal notes. */
@Component({
  selector: 'im-lead-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslocoDirective,
    ImDatePipe,
    LocPipe,
    MoneyPipe,
    EmptyState,
    Icon,
    Skeleton,
    StatusPill,
  ],
  styleUrl: './office.css',
  template: `
    <div *transloco="let t" class="office-page">
      <a
        class="btn btn-ghost btn-sm -ms-3 self-start"
        [routerLink]="['/', lang(), 'office', 'leads']"
      >
        <svg imIcon="arrow-left" [size]="16" class="flip-rtl" aria-hidden="true"></svg
        >{{ t('office.lead.back') }}
      </a>

      @if (!loaded()) {
        <im-skeleton [lines]="6" class="max-w-2xl" />
      } @else if (enquiry(); as e) {
        <header class="flex flex-col gap-2">
          <p class="flex flex-wrap items-center gap-3">
            <span class="font-mono text-sm">{{ e.ref }}</span>
            <im-status-pill [status]="e.status" />
            @if (e.submittedInDemo) {
              <span class="tag tag-warn">{{ t('office.leads.new') }}</span>
            }
          </p>
          <h1 class="font-serif text-3xl font-medium">{{ e.company }}</h1>
          <p class="text-muted">
            {{ e.name }} · {{ e.createdAt | imDate: lang() : 'datetime' }} ·
            <span class="font-mono uppercase">{{ e.locale }}</span>
          </p>
        </header>

        <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div class="flex flex-col gap-6">
            <!-- Status -->
            <section class="card p-5" aria-labelledby="status-title">
              <h2 id="status-title" class="label-caps text-muted">{{ t('office.lead.stage') }}</h2>
              <div class="steps mt-3" role="group" [attr.aria-label]="t('office.lead.stage')">
                @for (s of statuses; track s; let i = $index) {
                  <button
                    type="button"
                    [attr.aria-pressed]="e.status === s"
                    [class.reached]="i <= statusIndex()"
                    (click)="setStatus(s)"
                  >
                    {{ t('office.leads.stage.' + s) }}
                  </button>
                }
              </div>
            </section>

            <!-- Message -->
            <section class="card p-5" aria-labelledby="msg-title">
              <h2 id="msg-title" class="label-caps text-muted">{{ t('office.lead.message') }}</h2>
              <p
                class="mt-3 font-serif text-lg leading-relaxed whitespace-pre-line"
                [attr.lang]="e.locale"
              >
                {{ e.message }}
              </p>
            </section>

            <!-- Project and roadmap -->
            <section class="card p-5" aria-labelledby="proj-title">
              <h2 id="proj-title" class="label-caps text-muted">{{ t('office.lead.project') }}</h2>
              @if (e.projectSnapshot; as s) {
                <p class="mt-3 font-mono text-xs text-muted">{{ s.projectRef }}</p>
                <p class="mt-1">{{ s.summary | loc: lang() }}</p>
                <dl class="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div>
                    <dt class="inline text-muted">{{ t('office.lead.province') }}:</dt>
                    <dd class="inline">{{ provinces[s.input.province] | loc: lang() }}</dd>
                  </div>
                  <div>
                    <dt class="inline text-muted">{{ t('office.lead.investment') }}:</dt>
                    <dd class="inline">{{ s.input.investmentUsd | money: 'USD' : lang() }}</dd>
                  </div>
                  <div>
                    <dt class="inline text-muted">{{ t('office.lead.workers') }}:</dt>
                    <dd class="inline">{{ s.input.workers }} ({{ s.input.foreignWorkers }})</dd>
                  </div>
                  <div>
                    <dt class="inline text-muted">{{ t('office.lead.vehicle') }}:</dt>
                    <dd class="inline">{{ vehicleName() | loc: lang() }}</dd>
                  </div>
                  <div>
                    <dt class="inline text-muted">{{ t('office.lead.sector') }}:</dt>
                    <dd class="inline">{{ sectorName() }}</dd>
                  </div>
                  <div>
                    <dt class="inline text-muted">{{ t('office.lead.origin') }}:</dt>
                    <dd class="inline">{{ country(s.input.investorCountry) }}</dd>
                  </div>
                </dl>
                <a
                  class="btn btn-outline btn-sm mt-4"
                  [routerLink]="['/', lang(), 'roadmap', s.projectRef]"
                >
                  <svg imIcon="route" [size]="16" aria-hidden="true"></svg
                  >{{ t('office.lead.openRoadmap') }}
                </a>
              } @else {
                <p class="mt-3 text-muted">{{ t('office.lead.noProject') }}</p>
              }
            </section>

            <!-- Notes -->
            <section class="card p-5" aria-labelledby="notes-title">
              <h2 id="notes-title" class="label-caps text-muted">{{ t('office.lead.notes') }}</h2>
              <ol class="mt-2" role="list">
                @for (n of e.notes; track n.at) {
                  <li class="border-b border-rule-soft py-3">
                    <p class="text-xs text-muted">{{ n.at | imDate: lang() : 'datetime' }}</p>
                    <p class="mt-0.5">{{ n.text }}</p>
                  </li>
                } @empty {
                  <li class="py-3 text-sm text-muted">{{ t('office.lead.noNotes') }}</li>
                }
              </ol>
              <form class="mt-4" (submit)="addNote($event)">
                <label for="note" class="field-label">{{ t('office.lead.addNote') }}</label>
                <textarea
                  id="note"
                  rows="3"
                  class="input"
                  name="note"
                  [ngModel]="note()"
                  (ngModelChange)="note.set($event)"
                  maxlength="1000"
                ></textarea>
                <button
                  type="submit"
                  class="btn btn-primary btn-sm mt-3"
                  [disabled]="!note().trim()"
                >
                  {{ t('office.lead.saveNote') }}
                </button>
              </form>
            </section>
          </div>

          <aside class="flex flex-col gap-6 lg:sticky lg:top-6">
            <!-- Fit -->
            <section class="card p-5" aria-labelledby="fit-title">
              <h2 id="fit-title" class="label-caps text-muted">{{ t('office.lead.fit') }}</h2>
              <p class="stat-value mt-2">
                {{ fit().score }}<span class="text-base text-muted">/100</span>
              </p>
              <dl class="mt-3 flex flex-col gap-1 text-sm">
                @for (p of fitParts(); track p.key) {
                  <div class="flex justify-between gap-3">
                    <dt class="text-muted">{{ t('office.lead.fitPart.' + p.key) }}</dt>
                    <dd class="font-mono">{{ p.value }}/{{ p.max }}</dd>
                  </div>
                }
              </dl>
              <p class="mt-3 text-xs text-muted">{{ t('office.leads.fitNote') }}</p>
            </section>

            <!-- Handoff -->
            <section class="card p-5" aria-labelledby="handoff-title">
              <h2 id="handoff-title" class="label-caps text-muted">
                {{ t('office.lead.handoff') }}
              </h2>
              <dl class="mt-3 flex flex-col gap-2 text-sm">
                <div>
                  <dt class="text-muted">{{ t('office.lead.expert') }}</dt>
                  <dd class="font-bold">{{ expert() }}</dd>
                </div>
                <div>
                  <dt class="text-muted">{{ t('office.leads.consent') }}</dt>
                  <dd>
                    @if (e.consent?.shareSummary) {
                      <span class="tag tag-ok"
                        >✓ {{ e.consent!.at | imDate: lang() : 'datetime' }}</span
                      >
                    } @else {
                      <span class="tag tag-neutral">{{ t('office.lead.consentLegacy') }}</span>
                    }
                  </dd>
                </div>
                <div>
                  <dt class="text-muted">{{ t('office.lead.callSlot') }}</dt>
                  <dd>{{ e.callSlot ? (e.callSlot | imDate: lang() : 'datetime') : '—' }}</dd>
                </div>
                <div>
                  <dt class="text-muted">{{ t('office.lead.channel') }}</dt>
                  <dd>{{ e.channel ? t('office.channel.' + e.channel) : '—' }}</dd>
                </div>
              </dl>
            </section>

            <!-- Contact -->
            <section class="card p-5" aria-labelledby="contact-title">
              <h2 id="contact-title" class="label-caps text-muted">
                {{ t('office.lead.contact') }}
              </h2>
              <p class="mt-3 font-bold">{{ e.name }}</p>
              <p class="text-muted">{{ e.company }}</p>
              <p class="mt-3">
                <a
                  class="link inline-flex min-h-11 items-center gap-2 break-all"
                  [href]="'mailto:' + e.email"
                  ><svg imIcon="mail" [size]="16" aria-hidden="true"></svg>{{ e.email }}</a
                >
              </p>
              @if (e.phone) {
                <p>
                  <a class="link inline-flex min-h-11 items-center gap-2" [href]="'tel:' + e.phone"
                    ><svg imIcon="phone" [size]="16" aria-hidden="true"></svg>{{ e.phone }}</a
                  >
                </p>
              }
              <h3 class="label-caps mt-4 text-muted">{{ t('office.leads.needs') }}</h3>
              <ul class="mt-2 flex flex-wrap gap-1.5" role="list">
                @for (a of e.areas; track a) {
                  <li class="chip">{{ t('topics.' + a) }}</li>
                }
              </ul>
            </section>
          </aside>
        </div>

        <p class="sr-only" aria-live="polite">{{ saved() ? t('office.lead.saved') : '' }}</p>
        @if (saved()) {
          <p
            class="im-rise fixed end-4 bottom-4 z-50 flex items-center gap-2 rounded bg-ink px-4 py-3 text-sm font-bold text-surface shadow-[var(--shadow-overlay)]"
            aria-hidden="true"
          >
            <svg imIcon="check" [size]="16"></svg>{{ t('office.lead.saved') }}
          </p>
        }
      } @else {
        <im-empty-state [eyebrow]="t('office.nav.leads')" [heading]="t('office.lead.missing')">
          <a class="btn btn-secondary btn-sm" [routerLink]="['/', lang(), 'office', 'leads']">{{
            t('office.lead.back')
          }}</a>
        </im-empty-state>
      }
    </div>
  `,
  styles: `
    .steps {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1px;
      border: 1px solid var(--rule);
      border-radius: var(--radius);
      overflow: hidden;
      background: var(--rule);
    }
    @media (min-width: 640px) {
      .steps {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }
    .steps button {
      min-height: 2.75rem;
      padding: 0.375rem 0.5rem;
      background: var(--paper);
      border: 0;
      font-size: 0.875rem;
      color: var(--muted);
      line-height: 1.2;
    }
    .steps button.reached {
      color: var(--ink);
      background: var(--brand-tint);
    }
    .steps button[aria-pressed='true'] {
      background: var(--brand);
      color: var(--brand-ink);
      font-weight: 700;
    }
  `,
})
export class LeadDetailPage {
  readonly ref = input.required<string>();
  private readonly repo = inject(EnquiryRepository);
  private readonly refData = inject(ReferenceData);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly statuses = STATUSES;
  protected readonly provinces = PROVINCE_NAMES;
  protected readonly note = signal('');
  protected readonly saved = signal(false);
  protected readonly loaded = this.repo.loaded;

  private readonly countries = resource({ loader: () => this.refData.countries() });

  protected readonly enquiry = computed(
    () => this.repo.enquiries().find((e) => e.ref === this.ref()) ?? null,
  );
  protected readonly statusIndex = computed(() =>
    STATUSES.indexOf(this.enquiry()?.status ?? 'new'),
  );
  protected readonly vehicleName = computed(() => {
    const v = this.enquiry()?.projectSnapshot?.vehicle;
    return RULE_SET.vehicles.options.find((o) => o.vehicle === v)?.name;
  });
  protected readonly sectorName = computed(() => {
    const e = this.enquiry();
    const id = e ? leadSector(e) : null;
    return pickText(RULE_SET.sectors.sectors.find((s) => s.id === id)?.label, this.lang());
  });
  protected readonly fit = computed(() => {
    const e = this.enquiry();
    return e
      ? fitScore(e)
      : {
          score: 0,
          band: 'low' as const,
          parts: { size: 0, sector: 0, origin: 0, completeness: 0 },
        };
  });
  protected readonly fitParts = computed(() => {
    const p = this.fit().parts;
    return [
      { key: 'size', value: p.size, max: 30 },
      { key: 'sector', value: p.sector, max: 25 },
      { key: 'origin', value: p.origin, max: 20 },
      { key: 'completeness', value: p.completeness, max: 25 },
    ];
  });
  protected readonly expert = computed(() => {
    const e = this.enquiry();
    return e ? expertName(leadExpert(e)) : '';
  });

  constructor() {
    void this.repo.load();
    // Opening a lead clears its "New" highlight.
    effect(() => {
      const ref = this.ref();
      if (this.enquiry()) untracked(() => this.repo.markSeen(ref));
    });
  }

  protected country(code: string): string {
    return (
      pickText(this.countries.value()?.find((c) => c.code === code)?.name, this.lang()) || code
    );
  }

  protected async setStatus(status: EnquiryStatus): Promise<void> {
    await this.repo.updateStatus(this.ref(), status);
    this.flash();
  }

  protected async addNote(event: Event): Promise<void> {
    event.preventDefault();
    const text = this.note().trim();
    if (!text) return;
    await this.repo.addNote(this.ref(), text);
    this.note.set('');
    this.flash();
  }

  private flash(): void {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1800);
  }
}
