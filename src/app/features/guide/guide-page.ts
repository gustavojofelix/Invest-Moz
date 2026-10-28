import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import type { GuideChapterId, GuideChapterMeta, GuideIndex } from '@core/domain/guide';
import { ImDatePipe, LocPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { Icon } from '@shared/ui/icon';
import { SectionLabel } from '@shared/ui/section-label';

/** Chapters grouped by where the investor is in the journey. */
export const GUIDE_PARTS: { key: string; chapters: GuideChapterId[] }[] = [
  { key: 'understand', chapters: ['at-a-glance', 'why-mozambique', 'sectors'] },
  { key: 'establish', chapters: ['investment-law', 'company-setup', 'roadmap', 'zones'] },
  { key: 'operate', chapters: ['tax', 'people', 'exchange', 'land-esg', 'protection'] },
];

@Component({
  selector: 'im-guide-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, TranslocoDirective, LocPipe, ImDatePipe, SectionLabel],
  template: `
    <ng-container *transloco="let t">
      <div class="container-page py-10 sm:py-14">
        <header class="max-w-3xl">
          <im-section-label tone="brand">{{ t('guide.eyebrow') }}</im-section-label>
          <h1 class="mt-2 text-3xl sm:text-5xl">{{ t('guide.title') }}</h1>
          <p class="mt-4 text-lg text-muted">{{ t('guide.lead') }}</p>
          @if (guide(); as g) {
            <p class="mt-4 text-sm text-muted">
              {{ t('guide.lastReviewed', { date: g.lastReviewed | imDate: lang() : 'long' }) }}
            </p>
          }
        </header>

        @for (part of parts(); track part.key; let p = $index) {
          <section class="part" [attr.aria-labelledby]="'part-' + part.key">
            <div class="lg:col-span-3">
              <p class="label-caps text-muted">{{ t('guide.part') }} {{ p + 1 }}</p>
              <h2 [id]="'part-' + part.key" class="mt-1 text-2xl">
                {{ t('guide.parts.' + part.key + '.title') }}
              </h2>
              <p class="mt-2 text-[0.9375rem] text-muted">
                {{ t('guide.parts.' + part.key + '.text') }}
              </p>
            </div>
            <ol class="cards lg:col-span-9" role="list">
              @for (c of part.items; track c.chapter.id) {
                <li>
                  <a class="card" [routerLink]="['/', lang(), 'guide', c.chapter.id]">
                    <span class="font-mono text-xs text-muted">{{ c.number }}</span>
                    <span class="mt-1 block font-serif text-xl font-semibold leading-snug">{{
                      c.chapter.title | loc: lang()
                    }}</span>
                    <span class="mt-2 block text-[0.9375rem] text-muted">{{
                      c.chapter.summary | loc: lang()
                    }}</span>
                    <span class="go" aria-hidden="true"
                      ><svg imIcon="arrow-right" [size]="18"></svg
                    ></span>
                  </a>
                </li>
              }
            </ol>
          </section>
        }

        <section class="apply mt-14" aria-labelledby="apply-title">
          <div>
            <h2 id="apply-title" class="text-2xl">{{ t('guide.apply.title') }}</h2>
            <p class="mt-2 max-w-2xl text-muted">{{ t('guide.apply.text') }}</p>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row">
            <a [routerLink]="['/', lang(), 'project']" class="btn btn-primary">
              {{ t('guide.apply.project') }}
              <svg imIcon="arrow-right" [size]="18" aria-hidden="true"></svg>
            </a>
            <a [routerLink]="['/', lang(), 'questions']" class="btn btn-secondary">{{
              t('guide.apply.questions')
            }}</a>
          </div>
        </section>

        @if (guide(); as g) {
          <section class="mt-14 border-t border-rule pt-8" aria-labelledby="sources-title">
            <h2 id="sources-title" class="label-caps text-muted">{{ t('guide.sources') }}</h2>
            <ul class="mt-4 grid gap-4 sm:grid-cols-2" role="list">
              @for (s of g.sources; track s.id) {
                <li class="text-[0.9375rem]">
                  <span class="font-bold">{{ s.title }}</span>
                  <span class="block text-muted"
                    >{{ s.publisher | loc: lang() }} · {{ s.date }}</span
                  >
                </li>
              }
            </ul>
            <p class="mt-6 max-w-3xl text-sm text-muted">{{ t('guide.note') }}</p>
          </section>
        }
      </div>
    </ng-container>
  `,
  styles: `
    .part {
      display: grid;
      gap: 1.5rem;
      margin-top: 3.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--ink);
    }
    @media (min-width: 1024px) {
      .part {
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 2rem;
      }
    }
    .cards {
      display: grid;
      gap: 1rem;
    }
    @media (min-width: 640px) {
      .cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    .card {
      position: relative;
      display: block;
      height: 100%;
      padding: 1.25rem 3rem 1.25rem 1.25rem;
      border: 1px solid var(--rule);
      border-radius: var(--radius);
      background: var(--surface);
      color: var(--ink);
      text-decoration: none;
      transition: border-color 0.15s;
    }
    .card:hover {
      border-color: var(--brand);
    }
    .card:hover .go {
      color: var(--brand);
    }
    .go {
      position: absolute;
      right: 1.25rem;
      top: 1.25rem;
      color: var(--muted);
    }
    .apply {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.75rem;
      background: var(--panel);
    }
    @media (min-width: 1024px) {
      .apply {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
  `,
})
export class GuidePage {
  /** Resolved by guideIndexResolver (bound through withComponentInputBinding). */
  readonly guide = input<GuideIndex>();
  protected readonly lang = inject(LocaleService).lang;

  protected readonly parts = computed(() => {
    const chapters = this.guide()?.chapters ?? [];
    const numberOf = (c: GuideChapterMeta) => String(chapters.indexOf(c) + 1).padStart(2, '0');
    return GUIDE_PARTS.map((part) => ({
      key: part.key,
      items: part.chapters
        .map((id) => chapters.find((c) => c.id === id))
        .filter((c): c is GuideChapterMeta => !!c)
        .map((chapter) => ({ chapter, number: numberOf(chapter) })),
    }));
  });
}
