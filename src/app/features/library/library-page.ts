import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  GUIDE_CHAPTERS,
  type GuideChapterBody,
  type GuideChapterMeta,
  type GuideIndex,
} from '@core/domain/guide';
import { normalize, pickText } from '@core/domain/text';
import { ImDatePipe, LocPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { GuideService } from '@core/ports';
import { Icon } from '@shared/ui/icon';
import { LIBRARY_AREAS, START_HERE } from './library-areas';

interface SearchHit {
  chapter: GuideChapterMeta;
  sections: { id: string; title: string }[];
}

/** Screen 11 · Knowledge library. Prerendered; search runs in the browser after hydration. */
@Component({
  selector: 'im-library-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, TranslocoDirective, LocPipe, ImDatePipe],
  template: `
    <ng-container *transloco="let t">
      <header class="border-b border-rule bg-paper">
        <div class="container-page py-6 sm:py-10">
          <p class="eyebrow">{{ t('library.eyebrow') }}</p>
          <h1 class="mt-1.5 text-[1.75rem] leading-tight sm:text-5xl">{{ t('library.title') }}</h1>
          <p class="mt-3 max-w-2xl text-muted sm:text-lg">{{ t('library.lead') }}</p>
          <form class="search mt-5 max-w-2xl" role="search" (submit)="$event.preventDefault()">
            <label for="libq" class="sr-only">{{ t('library.searchLabel') }}</label>
            <svg
              imIcon="search"
              [size]="18"
              class="search-icon text-muted"
              aria-hidden="true"
            ></svg>
            <input
              id="libq"
              class="input ps-10"
              type="search"
              autocomplete="off"
              [placeholder]="t('library.searchPlaceholder')"
              [value]="query()"
              (focus)="warmUp()"
              (input)="onQuery($event)"
              aria-describedby="libq-status"
            />
          </form>
          <p id="libq-status" class="sr-only" aria-live="polite">
            @if (searching()) {
              {{ t('library.resultsCount', { count: hits().length }) }}
            }
          </p>
        </div>
      </header>

      <div class="container-page py-6 sm:py-10">
        @if (searching()) {
          <section aria-labelledby="results-title">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="results-title" class="text-2xl">
                {{ t('library.resultsTitle', { query: query() }) }}
              </h2>
              <button type="button" class="btn btn-ghost btn-sm" (click)="clear()">
                <svg imIcon="x" [size]="16" aria-hidden="true"></svg>{{ t('library.clear') }}
              </button>
            </div>
            @if (hits().length) {
              <ul class="mt-4 grid gap-3 md:grid-cols-2" role="list">
                @for (h of hits(); track h.chapter.id) {
                  <li class="card p-4">
                    <a
                      class="font-bold text-ink hover:text-brand"
                      [routerLink]="link(h.chapter.id)"
                      >{{ h.chapter.title | loc: lang() }}</a
                    >
                    <p class="mt-1 text-sm text-muted">{{ h.chapter.summary | loc: lang() }}</p>
                    @if (h.sections.length) {
                      <ul class="mt-2 flex flex-wrap gap-2" role="list">
                        @for (s of h.sections; track s.id) {
                          <li>
                            <a class="pill" [routerLink]="link(h.chapter.id)" [fragment]="s.id">{{
                              s.title
                            }}</a>
                          </li>
                        }
                      </ul>
                    }
                  </li>
                }
              </ul>
            } @else {
              <div class="card mt-4 p-6 text-center">
                <p class="font-serif text-xl">{{ t('library.noResults') }}</p>
                <p class="mt-2 text-muted">{{ t('library.noResultsText') }}</p>
                <a
                  class="btn btn-primary mt-4"
                  [routerLink]="['/', lang(), 'chat']"
                  [queryParams]="{ q: query() }"
                  >{{ t('library.askTiva') }}</a
                >
              </div>
            }
          </section>
        } @else {
          <a
            class="banner surface-deep"
            [routerLink]="['/', lang(), 'alerts']"
            fragment="alert-dec-40-2026"
          >
            <span class="tag self-start bg-highlight text-highlight-ink">{{
              t('library.banner.tag')
            }}</span>
            <strong class="mt-1 block text-base sm:text-lg">{{ t('library.banner.title') }}</strong>
            <span class="block text-sm text-on-deep-subtle">{{ t('library.banner.text') }}</span>
            <span class="mt-2 inline-flex items-center gap-1 text-sm font-bold text-highlight"
              >{{ t('library.banner.cta') }}
              <svg imIcon="arrow-right" [size]="16" class="flip-rtl" aria-hidden="true"></svg
            ></span>
          </a>

          <section class="mt-8" aria-labelledby="areas-title">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="areas-title" class="text-2xl">{{ t('library.areasTitle') }}</h2>
              @if (guide(); as g) {
                <p class="text-sm text-muted">
                  {{ t('library.reviewed', { date: g.lastReviewed | imDate: lang() : 'long' }) }}
                </p>
              }
            </div>
            <ul class="areas mt-4" role="list">
              @for (a of areas(); track a.id) {
                <li>
                  <a class="card area" [routerLink]="link(a.chapter)" [fragment]="a.fragment">
                    <span class="area-icon" aria-hidden="true"
                      ><svg [imIcon]="a.icon" [size]="20"></svg
                    ></span>
                    <strong class="text-[0.9375rem] leading-snug">{{
                      t('library.areas.' + a.id + '.title')
                    }}</strong>
                    <span class="text-xs text-muted">{{
                      t('library.areas.' + a.id + '.tags')
                    }}</span>
                    <span class="mt-auto pt-1 text-xs text-muted">{{
                      a.count === 1
                        ? t('library.articleOne')
                        : t('library.articleMany', { count: a.count })
                    }}</span>
                  </a>
                </li>
              }
            </ul>
          </section>

          <div class="mt-10 grid gap-8 lg:grid-cols-12">
            <section class="lg:col-span-4" aria-labelledby="start-title">
              <h2 id="start-title" class="text-xl">{{ t('library.startHere') }}</h2>
              <ul class="mt-3 grid gap-3" role="list">
                @for (c of startHere(); track c.id) {
                  <li>
                    <a class="card block p-4 hover:border-brand" [routerLink]="link(c.id)">
                      <strong class="block">{{ c.title | loc: lang() }}</strong>
                      <span class="mt-1 block text-sm text-muted">{{
                        c.summary | loc: lang()
                      }}</span>
                    </a>
                  </li>
                }
              </ul>
            </section>
            <section class="lg:col-span-8" aria-labelledby="all-title">
              <h2 id="all-title" class="text-xl">{{ t('library.allArticles') }}</h2>
              <ol class="mt-3 border-t border-rule" role="list">
                @for (c of chapters(); track c.id; let i = $index) {
                  <li class="border-b border-rule">
                    <a class="article-row" [routerLink]="link(c.id)">
                      <span class="font-mono text-xs text-muted">{{ num(i) }}</span>
                      <span class="min-w-0">
                        <span class="block font-bold">{{ c.title | loc: lang() }}</span>
                        <span class="block text-sm text-muted">{{ c.summary | loc: lang() }}</span>
                      </span>
                      <svg
                        imIcon="chevron-right"
                        [size]="18"
                        class="flip-rtl text-muted"
                        aria-hidden="true"
                      ></svg>
                    </a>
                  </li>
                }
              </ol>
            </section>
          </div>
        }

        <p class="mt-8 flex gap-2 text-sm text-muted">
          <svg imIcon="shield-check" [size]="18" class="shrink-0" aria-hidden="true"></svg>
          {{ t('library.trust') }}
        </p>
      </div>
    </ng-container>
  `,
  styles: `
    .search {
      position: relative;
    }
    .search-icon {
      position: absolute;
      inset-inline-start: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
    }
    .banner {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 1rem 1.125rem;
      border-radius: var(--radius-lg);
      text-decoration: none;
    }
    .banner:hover strong {
      text-decoration: underline;
    }
    .areas {
      display: grid;
      gap: 0.625rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    @media (min-width: 768px) {
      .areas {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.875rem;
      }
    }
    @media (min-width: 1024px) {
      .areas {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
    }
    .area {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      height: 100%;
      min-height: 7.5rem;
      padding: 0.75rem;
      color: var(--ink);
      text-decoration: none;
      transition: border-color 0.15s;
    }
    .area:hover {
      border-color: var(--brand);
    }
    .area-icon {
      display: grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      margin-bottom: 0.25rem;
      border-radius: var(--radius);
      background: var(--brand-tint);
      color: var(--brand);
    }
    .article-row {
      display: grid;
      grid-template-columns: 1.75rem minmax(0, 1fr) auto;
      gap: 0.75rem;
      align-items: center;
      min-height: 3.5rem;
      padding: 0.75rem 0.25rem;
      color: var(--ink);
      text-decoration: none;
    }
    .article-row:hover .font-bold {
      color: var(--brand);
    }
    :host-context([dir='rtl']) .flip-rtl {
      transform: scaleX(-1);
    }
  `,
})
export class LibraryPage {
  /** Resolved by guideIndexResolver on the parent route (bound as an input). */
  readonly guide = input<GuideIndex>();
  private readonly guides = inject(GuideService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly lang = inject(LocaleService).lang;

  protected readonly query = signal('');
  private readonly bodies = signal<GuideChapterBody[]>([]);
  private loading = false;

  protected readonly chapters = computed(() => this.guide()?.chapters ?? []);
  protected readonly startHere = computed(() =>
    this.chapters().filter((c) => START_HERE.includes(c.id)),
  );
  protected readonly areas = computed(() =>
    LIBRARY_AREAS.map((a) => ({
      id: a.id,
      icon: a.icon,
      chapter: a.chapters[0],
      fragment: a.fragment,
      count: a.chapters.length,
    })),
  );

  private readonly words = computed(() =>
    normalize(this.query())
      .split(' ')
      .filter((w) => w.length > 1),
  );
  protected readonly searching = computed(() => this.words().length > 0);

  protected readonly hits = computed<SearchHit[]>(() => {
    const words = this.words();
    if (!words.length) return [];
    const lang = this.lang();
    const has = (text: string) => {
      const n = normalize(text);
      return words.every((w) => n.includes(w));
    };
    const bodies = new Map(this.bodies().map((b) => [b.id, b]));
    const out: SearchHit[] = [];
    for (const chapter of this.chapters()) {
      const sections = (bodies.get(chapter.id)?.sections ?? []).map((s) => ({
        id: s.id,
        title: pickText(s.title, lang),
        text: [
          pickText(s.title, lang),
          pickText(s.body, lang),
          ...(s.facts ?? []).map((f) => `${pickText(f.value, lang)} ${pickText(f.label, lang)}`),
          ...(s.steps ?? []).map((st) => `${pickText(st.title, lang)} ${pickText(st.text, lang)}`),
        ].join(' '),
      }));
      const matched = sections.filter((s) => has(s.text));
      const head = `${pickText(chapter.title, lang)} ${pickText(chapter.summary, lang)}`;
      if (has(head) || matched.length)
        out.push({
          chapter,
          sections: matched.slice(0, 4).map(({ id, title }) => ({ id, title })),
        });
    }
    return out;
  });

  protected link(chapter: string): string[] {
    return ['/', this.lang(), 'library', chapter];
  }

  protected num(i: number): string {
    return String(i + 1).padStart(2, '0');
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.warmUp();
  }

  protected clear(): void {
    this.query.set('');
  }

  /** Loads every chapter body (lazy chunks) the first time the visitor searches. */
  protected warmUp(): void {
    if (!this.browser || this.loading) return;
    this.loading = true;
    void Promise.all(GUIDE_CHAPTERS.map((id) => this.guides.chapter(id))).then((b) =>
      this.bodies.set(b),
    );
  }
}
