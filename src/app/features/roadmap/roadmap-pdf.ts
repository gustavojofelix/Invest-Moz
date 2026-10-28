import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  resource,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { maputoToday } from '@core/adapters/json/json-assessment-service';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { ImDatePipe, LocPipe, MoneyPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { BrandMark } from '@core/layout/brand-mark';
import { FlagStripe } from '@core/layout/flag-stripe';
import { SeoService } from '@core/layout/seo.service';
import { KnowledgeBase, ReferenceData } from '@core/ports';
import { ConfirmText } from '@shared/ui/confirm-text';
import { Icon } from '@shared/ui/icon';
import { Skeleton } from '@shared/ui/skeleton';
import { RoadmapFacade, RoadmapProgress } from './roadmap-data';

/** Screen 2 · Roadmap PDF export: the nine steps on one cited A4 page. */
@Component({
  selector: 'im-roadmap-pdf-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RoadmapFacade, RoadmapProgress],
  imports: [
    Icon,
    RouterLink,
    TranslocoDirective,
    LocPipe,
    MoneyPipe,
    ImDatePipe,
    BrandMark,
    FlagStripe,
    ConfirmText,
    Skeleton,
  ],
  template: `
    <ng-container *transloco="let t">
      <div class="min-h-dvh bg-surface-alt pb-10 print:bg-white print:pb-0">
        <!-- Screen toolbar -->
        <div class="no-print sticky top-0 z-10 border-b border-rule bg-paper">
          <div class="mx-auto flex max-w-[210mm] items-center gap-2 px-4 py-2">
            <a class="btn btn-ghost btn-sm -ms-2" [routerLink]="['/', lang(), 'roadmap', ref()]">
              <svg imIcon="arrow-left" [size]="18" class="flip" aria-hidden="true"></svg>
              {{ t('roadmap.pdf.back') }}
            </a>
            <p class="ms-auto hidden text-xs text-muted sm:block">{{ t('roadmap.pdf.hint') }}</p>
            <button
              type="button"
              class="btn btn-primary btn-sm"
              (click)="print()"
              [disabled]="!ready()"
            >
              <svg imIcon="printer" [size]="18" aria-hidden="true"></svg>
              {{ t('roadmap.pdf.print') }}
            </button>
          </div>
        </div>

        @if (ready(); as r) {
          <article
            class="sheet mx-auto mt-4 flex max-w-[210mm] flex-col gap-5 bg-paper px-5 py-8 shadow-sm sm:mt-6 sm:px-14 sm:py-12"
            aria-labelledby="pdf-title"
          >
            <header class="flex items-start justify-between gap-4">
              <im-brand-mark variant="wordmark" size="sm" />
              <p class="text-end text-[0.71875rem] leading-normal text-muted">
                {{ t('roadmap.pdf.ref', { ref: r.project.ref }) }}<br />
                {{ t('roadmap.pdf.generated', { date: today | imDate: lang() : 'medium' }) }}
              </p>
            </header>
            <im-flag-stripe [height]="14" />

            <div class="flex flex-col gap-1.5">
              <p class="eyebrow">{{ t('roadmap.eyebrow') }}</p>
              <h1 id="pdf-title" class="font-serif text-2xl font-semibold sm:text-[1.875rem]">
                {{ r.project.title | loc: lang() }}
              </h1>
            </div>

            <dl class="profile grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div>
                <dt>{{ t('roadmap.profile.investor') }}</dt>
                <dd>
                  {{ t('roadmap.capital.' + r.project.input.capital) }}
                  @if (r.project.input.capital !== 'mozambican') {
                    · {{ countryName() }}
                  }
                </dd>
              </div>
              <div>
                <dt>{{ t('roadmap.profile.investment') }}</dt>
                <dd>{{ r.project.input.investmentUsd | money: 'USD' : lang() }}</dd>
              </div>
              <div>
                <dt>{{ t('roadmap.profile.jobs') }}</dt>
                <dd>
                  {{ t('roadmap.jobs', { n: r.project.input.workers }) }}
                  @if (r.project.input.foreignWorkers) {
                    · {{ t('roadmap.foreign', { n: r.project.input.foreignWorkers }) }}
                  }
                </dd>
              </div>
              <div>
                <dt>{{ t('roadmap.profile.sector') }}</dt>
                <dd>
                  {{ r.project.sector | loc: lang() }}
                  <span class="block font-normal text-muted">{{
                    provinces[r.project.input.province] | loc: lang()
                  }}</span>
                </dd>
              </div>
            </dl>

            <div class="-mx-1 overflow-x-auto px-1">
              <table class="steps w-full text-[0.78125rem]">
                <caption class="sr-only">
                  {{
                    t('roadmap.stepsTitle')
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col" class="w-7">#</th>
                    <th scope="col">{{ t('roadmap.pdf.step') }}</th>
                    <th scope="col">{{ t('roadmap.who') }}</th>
                    <th scope="col">{{ t('roadmap.legalBasis') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of r.steps; track s.id) {
                    <tr>
                      <td>{{ s.n }}</td>
                      <td>
                        <strong>{{ s.title | loc: lang() }}</strong>
                        @if (progress.done().has(s.id)) {
                          <span class="ms-1 text-brand">✓ {{ t('roadmap.done') }}</span>
                        }
                      </td>
                      <td>{{ s.who | loc: lang() }}</td>
                      <td>{{ basis(s.refs) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <section
              class="avoid-break flex flex-col gap-1 rounded-md bg-brand-tint px-4 py-3.5 text-ok-ink"
              aria-labelledby="pdf-inc"
            >
              <h2 id="pdf-inc" class="text-[0.84375rem] font-bold">
                {{ t('roadmap.pdf.incentives') }}
              </h2>
              @if (r.assessment.incentives.length) {
                <ul class="list-disc ps-5 text-[0.78125rem] leading-normal" role="list">
                  @for (i of r.assessment.incentives; track i.id) {
                    <li>
                      <strong>{{ i.title | loc: lang() }}</strong> —
                      <im-confirm-text [text]="i.conditions | loc: lang()" />
                    </li>
                  }
                </ul>
              }
              <p class="text-[0.78125rem] leading-normal">{{ t('roadmap.pdf.incentivesNote') }}</p>
            </section>

            <div class="avoid-break grid gap-3 sm:grid-cols-2">
              <section
                class="flex flex-col gap-1.5 rounded-md border border-rule px-4 py-3.5"
                aria-labelledby="pdf-next"
              >
                <h2 id="pdf-next" class="text-[0.84375rem] font-bold">
                  {{ t('roadmap.pdf.next') }}
                </h2>
                @if (nextActions().length) {
                  <ol class="list-decimal ps-5 text-[0.78125rem] leading-normal">
                    @for (s of nextActions(); track s.id) {
                      <li>{{ s.action | loc: lang() }}</li>
                    }
                  </ol>
                } @else {
                  <p class="text-[0.78125rem]">{{ t('roadmap.allDone') }}</p>
                }
              </section>
              <section
                class="flex flex-col gap-1.5 rounded-md border border-rule px-4 py-3.5"
                aria-labelledby="pdf-contacts"
              >
                <h2 id="pdf-contacts" class="text-[0.84375rem] font-bold">
                  {{ t('roadmap.pdf.contacts') }}
                </h2>
                <ul class="text-[0.78125rem] leading-normal" role="list">
                  <li>{{ t('roadmap.pdf.contactApiex') }}</li>
                  <li>
                    {{
                      t('roadmap.pdf.contactBau', {
                        province: provinces[r.project.input.province] | loc: lang(),
                      })
                    }}
                  </li>
                  @if (r.project.input.capital !== 'mozambican') {
                    <li>{{ t('roadmap.pdf.contactBdm') }}</li>
                  }
                  <li>{{ t('roadmap.pdf.contactTa') }}</li>
                </ul>
              </section>
            </div>

            <footer
              class="mt-auto flex flex-col gap-2 border-t border-rule pt-3 text-[0.65625rem] leading-normal text-muted"
            >
              <p>{{ t('roadmap.pdf.disclaimer') }}</p>
              <p class="font-mono">{{ t('roadmap.pdf.ref', { ref: r.project.ref }) }}</p>
              <im-brand-mark
                variant="partners"
                size="sm"
                [technologyLabel]="t('footer.technology')"
                [expertLabel]="t('footer.expert')"
              />
            </footer>
          </article>
        } @else {
          @switch (state().status) {
            @case ('missing') {
              <p class="container-page py-16 text-center" role="alert">
                {{ t('roadmap.missing.title') }}
              </p>
            }
            @case ('error') {
              <p class="container-page py-16 text-center" role="alert">{{ t('roadmap.error') }}</p>
            }
            @default {
              <div class="mx-auto mt-6 max-w-[210mm] bg-paper p-10" role="status">
                <span class="sr-only">{{ t('roadmap.loading') }}</span>
                <im-skeleton [lines]="10" />
              </div>
            }
          }
        }
      </div>
    </ng-container>
  `,
  styles: `
    .profile > div {
      padding: 0.625rem 0.75rem;
      border-radius: var(--radius);
      background: var(--panel);
    }
    .profile dt {
      font-size: 0.65625rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .profile dd {
      margin-top: 0.125rem;
      font-size: 0.84375rem;
      font-weight: 700;
    }
    .steps {
      border-collapse: collapse;
    }
    .steps th {
      padding: 0.5rem;
      border-bottom: 1px solid var(--rule);
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-align: start;
      text-transform: uppercase;
      color: var(--muted);
    }
    .steps td {
      padding: 0.5625rem 0.5rem;
      border-bottom: 1px solid var(--rule-soft);
      vertical-align: top;
    }
    :host-context([dir='rtl']) .flip {
      transform: scaleX(-1);
    }
    @media print {
      .sheet {
        max-width: none;
        margin: 0;
        padding: 0;
        gap: 4mm;
        box-shadow: none;
      }
      .steps td {
        padding: 1.6mm 1.5mm;
      }
      .profile {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .sheet .grid.sm\\:grid-cols-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class RoadmapPdfPage {
  readonly ref = input.required<string>();
  private readonly facade = inject(RoadmapFacade);
  protected readonly progress = inject(RoadmapProgress);
  private readonly kb = inject(KnowledgeBase);
  private readonly reference = inject(ReferenceData);
  private readonly seo = inject(SeoService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly locale = inject(LocaleService);
  protected readonly lang = this.locale.lang;
  protected readonly provinces = PROVINCE_NAMES;
  protected readonly today = maputoToday();
  protected readonly state = this.facade.state;
  protected readonly countries = resource({ loader: () => this.reference.countries() });

  protected readonly ready = computed(() => {
    const s = this.state();
    return s.status === 'ready' ? s : null;
  });

  protected readonly nextActions = computed(() => {
    const done = this.progress.done();
    return (this.ready()?.steps ?? []).filter((s) => !done.has(s.id)).slice(0, 3);
  });

  protected readonly countryName = computed(() => {
    const p = this.ready()?.project;
    if (!p) return '';
    const c = (this.countries.value() ?? []).find((x) => x.code === p.input.investorCountry);
    return c ? this.locale.text(c.name) : p.input.investorCountry;
  });

  constructor() {
    effect(() => {
      const ref = this.ref();
      untracked(() => {
        this.progress.load(ref);
        void this.facade.load(ref);
      });
    });
    effect(() => {
      const r = this.ready();
      this.lang();
      if (r) untracked(() => this.seo.setTitle(`${this.locale.text(r.project.title)} · PDF`));
    });
  }

  protected basis(refs: string[]): string {
    this.kb.loaded();
    return refs.map((id) => this.kb.lookup(id)?.instrument ?? id).join(' · ');
  }

  protected print(): void {
    if (this.browser) window.print();
  }
}
