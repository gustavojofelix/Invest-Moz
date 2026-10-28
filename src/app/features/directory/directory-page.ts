import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { normalize, pickText } from '@core/domain/text';
import { LocPipe } from '@core/i18n/format';
import { LOCALE_LABEL } from '@core/i18n/locales';
import { LocaleService } from '@core/i18n/locale.service';
import { Icon } from '@shared/ui/icon';
import { DirectoryService } from './directory.service';
import type { DirectoryListing, ListingType } from './directory.types';

type Filter = 'all' | 'public' | 'legal' | 'bank' | 'accounting' | 'logistics' | 'other';

const FILTERS: { id: Filter; types: ListingType[] }[] = [
  { id: 'all', types: [] },
  { id: 'public', types: ['public', 'association'] },
  { id: 'legal', types: ['law_firm', 'tax'] },
  { id: 'bank', types: ['bank'] },
  { id: 'accounting', types: ['accounting'] },
  { id: 'logistics', types: ['logistics'] },
  { id: 'other', types: ['consulting'] },
];

/** Screen 14 · Ecosystem directory: public bodies (always free) and verified providers. */
@Component({
  selector: 'im-directory-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, NgTemplateOutlet, RouterLink, TranslocoDirective, LocPipe],
  template: `
    <ng-container *transloco="let t">
      <header class="border-b border-rule bg-paper">
        <div class="container-page py-6 sm:py-8">
          <p class="eyebrow">{{ t('directory.eyebrow') }}</p>
          <h1 class="mt-1.5 text-[1.75rem] leading-tight sm:text-4xl">
            {{ t('directory.title') }}
          </h1>
          <p class="mt-2 max-w-2xl text-muted">{{ t('directory.lead') }}</p>
          <div class="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
            <div
              role="group"
              [attr.aria-label]="t('directory.filterLabel')"
              class="flex flex-wrap gap-1.5"
            >
              @for (f of filters; track f.id) {
                <button
                  type="button"
                  class="pill"
                  [attr.aria-pressed]="filter() === f.id"
                  (click)="filter.set(f.id)"
                >
                  {{ t('directory.filters.' + f.id) }}
                </button>
              }
            </div>
            <div class="relative">
              <label for="dirq" class="sr-only">{{ t('directory.searchLabel') }}</label>
              <svg
                imIcon="search"
                [size]="18"
                class="search-icon text-muted"
                aria-hidden="true"
              ></svg>
              <input
                id="dirq"
                type="search"
                class="input ps-10"
                autocomplete="off"
                [placeholder]="t('directory.searchPlaceholder')"
                [value]="query()"
                (input)="query.set($any($event.target).value)"
              />
            </div>
          </div>
        </div>
      </header>

      <div class="container-page py-6 sm:py-8">
        <p class="sr-only" aria-live="polite">
          {{ t('directory.count', { count: publicBodies().length + providers().length }) }}
        </p>

        @if (publicBodies().length) {
          <section aria-labelledby="public-title">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="public-title" class="text-xl">{{ t('directory.publicTitle') }}</h2>
              <p class="text-sm text-muted">{{ t('directory.publicNote') }}</p>
            </div>
            <ul class="grid-list mt-3" role="list">
              @for (l of publicBodies(); track l.id) {
                <ng-container *ngTemplateOutlet="card; context: { $implicit: l }" />
              }
            </ul>
          </section>
        }

        @if (providers().length) {
          <section class="mt-8" aria-labelledby="providers-title">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="providers-title" class="text-xl">{{ t('directory.providersTitle') }}</h2>
              <p class="text-sm text-muted">{{ t('directory.providersNote') }}</p>
            </div>
            <ul class="grid-list mt-3" role="list">
              @for (l of providers(); track l.id) {
                <ng-container *ngTemplateOutlet="card; context: { $implicit: l }" />
              }
            </ul>
          </section>
        }

        @if (!publicBodies().length && !providers().length && data.hasValue()) {
          <div class="card p-6 text-center" role="status">
            <p class="font-serif text-xl">{{ t('directory.empty') }}</p>
            <button type="button" class="btn btn-secondary mt-4" (click)="reset()">
              {{ t('directory.reset') }}
            </button>
          </div>
        }

        <p class="mt-8 max-w-3xl text-sm leading-relaxed text-muted">
          {{ t('directory.footnote') }}
        </p>
        @if (data.hasValue()) {
          <p class="mt-1 text-xs text-muted">{{ t('directory.illustrative') }}</p>
        }

        <ng-template #card let-l>
          <li class="card listing" [class.sponsored]="l.sponsored">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h3 class="font-sans text-[0.9375rem] font-bold leading-snug">{{ l.name }}</h3>
                @if (l.fullName) {
                  <p class="text-xs text-muted" lang="pt">{{ l.fullName }}</p>
                }
              </div>
              <span class="flex shrink-0 flex-wrap justify-end gap-1">
                @if (l.sponsored) {
                  <span class="tag tag-warn">{{ t('directory.sponsored') }}</span>
                }
                @if (l.type === 'public' || l.type === 'association') {
                  <span class="tag tag-neutral">{{ t('directory.types.' + l.type) }}</span>
                } @else if (l.verified) {
                  <span class="tag tag-ok"
                    ><svg imIcon="badge-check" [size]="12" aria-hidden="true"></svg
                    >{{ t('directory.verified') }}</span
                  >
                }
              </span>
            </div>
            <p class="text-sm">{{ l.description | loc: lang() }}</p>
            <p class="text-xs text-muted">
              @if (l.type !== 'public' && l.type !== 'association') {
                {{ t('directory.types.' + l.type) }} ·
              }
              {{ l.services | loc: lang() }}
            </p>
            <dl class="meta text-xs">
              <div>
                <dt class="text-muted">{{ t('directory.coverage') }}</dt>
                <dd>{{ coverage(l) }}</dd>
              </div>
              <div>
                <dt class="text-muted">{{ t('directory.languages') }}</dt>
                <dd>{{ languages(l) }}</dd>
              </div>
            </dl>
            <div class="mt-auto flex flex-wrap gap-2 pt-1">
              @if (l.partner) {
                <a
                  class="btn btn-primary btn-sm"
                  [routerLink]="['/', lang(), 'expert']"
                  [queryParams]="{ from: 'directory' }"
                  >{{ t('directory.talk') }}</a
                >
              }
              @if (l.website) {
                <a
                  class="btn btn-secondary btn-sm"
                  [href]="l.website"
                  target="_blank"
                  rel="noopener"
                  >{{ t('directory.website')
                  }}<svg imIcon="external-link" [size]="14" aria-hidden="true"></svg
                  ><span class="sr-only"> ({{ t('directory.newTab') }})</span></a
                >
              }
              @if (l.email) {
                <a class="btn btn-secondary btn-sm" [href]="'mailto:' + l.email"
                  ><svg imIcon="mail" [size]="14" aria-hidden="true"></svg
                  >{{ t('directory.email') }}</a
                >
              }
              @if (!l.website && !l.email && !l.partner) {
                <span class="text-xs text-muted">{{ t('directory.noContact') }}</span>
              }
            </div>
          </li>
        </ng-template>
      </div>
    </ng-container>
  `,
  styles: `
    .search-icon {
      position: absolute;
      inset-inline-start: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }
    .grid-list {
      display: grid;
      gap: 0.625rem;
    }
    @media (min-width: 768px) {
      .grid-list {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.875rem;
      }
    }
    @media (min-width: 1280px) {
      .grid-list {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    .listing {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.875rem;
    }
    .listing.sponsored {
      background: var(--highlight-tint);
      border-color: color-mix(in srgb, var(--highlight) 45%, var(--rule));
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1.25rem;
    }
    .meta div {
      display: flex;
      gap: 0.375rem;
    }
  `,
})
export class DirectoryPage {
  private readonly service = inject(DirectoryService);
  private readonly locale = inject(LocaleService);
  protected readonly lang = this.locale.lang;
  protected readonly filters = FILTERS;
  protected readonly filter = signal<Filter>('all');
  protected readonly query = signal('');
  protected readonly data = resource({ loader: () => this.service.load() });

  private readonly visible = computed(() => {
    const listings = this.data.value()?.listings ?? [];
    const types = FILTERS.find((f) => f.id === this.filter())?.types ?? [];
    const words = normalize(this.query()).split(' ').filter(Boolean);
    const lang = this.lang();
    return listings
      .filter((l) => l.type === 'public' || l.type === 'association' || l.verified)
      .filter((l) => !types.length || types.includes(l.type))
      .filter((l) => {
        if (!words.length) return true;
        const hay = normalize(
          [
            l.name,
            l.fullName ?? '',
            pickText(l.description, lang),
            pickText(l.services, lang),
            this.coverage(l),
          ].join(' '),
        );
        return words.every((w) => hay.includes(w));
      });
  });
  /** Public bodies and associations: always listed, free, first. */
  protected readonly publicBodies = computed(() =>
    this.visible().filter((l) => l.type === 'public' || l.type === 'association'),
  );
  /** Providers: sponsored first (labelled), then by name. */
  protected readonly providers = computed(() =>
    this.visible()
      .filter((l) => l.type !== 'public' && l.type !== 'association')
      .sort((a, b) => Number(b.sponsored) - Number(a.sponsored) || a.name.localeCompare(b.name)),
  );

  protected coverage(l: DirectoryListing): string {
    const lang = this.lang();
    return l.coverage === 'national'
      ? this.locale.t('directory.national')
      : l.coverage.map((p) => pickText(PROVINCE_NAMES[p], lang)).join(', ');
  }

  protected languages(l: DirectoryListing): string {
    return l.languages.map((x) => LOCALE_LABEL[x]).join(', ');
  }

  protected reset(): void {
    this.filter.set('all');
    this.query.set('');
  }
}
