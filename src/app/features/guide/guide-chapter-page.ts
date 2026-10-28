import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  isGuideChapter,
  type GuideChapterBody,
  type GuideIndex,
  type GuideTable,
} from '@core/domain/guide';
import type { Locale } from '@core/domain/types';
import { LocPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { SeoService } from '@core/layout/seo.service';
import { ConfirmText } from '@shared/ui/confirm-text';
import { Disclaimer } from '@shared/ui/disclaimer';
import { Icon } from '@shared/ui/icon';
import { RichText } from '@shared/ui/rich-text';
import { RuledTable, type RuledColumn } from '@shared/ui/ruled-table';
import { SectionLabel } from '@shared/ui/section-label';

@Component({
  selector: 'im-guide-chapter-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Icon,
    RouterLink,
    TranslocoDirective,
    LocPipe,
    ConfirmText,
    Disclaimer,
    RichText,
    RuledTable,
    SectionLabel,
  ],
  templateUrl: './guide-chapter-page.html',
  styleUrl: './guide-chapter-page.css',
})
export class GuideChapterPage {
  readonly chapter = input<string>();
  /** Resolved by guideIndexResolver and guideChapterResolver (bound as inputs). */
  readonly guide = input<GuideIndex>();
  readonly body = input<GuideChapterBody | null>();
  private readonly seo = inject(SeoService);
  protected readonly lang = inject(LocaleService).lang;

  protected readonly chapters = computed(() => this.guide()?.chapters ?? []);
  protected readonly index = computed(() => {
    const id = this.chapter();
    return isGuideChapter(id) ? this.chapters().findIndex((c) => c.id === id) : -1;
  });
  protected readonly current = computed(() => this.chapters()[this.index()]);
  protected readonly sections = computed(() => this.body()?.sections ?? []);
  protected readonly number = computed(() => String(this.index() + 1).padStart(2, '0'));
  protected readonly prev = computed(() => this.chapters()[this.index() - 1]);
  protected readonly next = computed(() =>
    this.index() >= 0 ? this.chapters()[this.index() + 1] : undefined,
  );
  protected readonly sources = computed(() => {
    const ids = this.current()?.sources ?? [];
    return (this.guide()?.sources ?? []).filter((s) => ids.includes(s.id));
  });

  constructor() {
    effect(() => {
      const c = this.current();
      const l = this.lang();
      if (c) untracked(() => this.seo.setTitle(c.title[l]));
    });
  }

  protected tableColumns(table: GuideTable, lang: Locale): RuledColumn[] {
    return table.columns.map((c, i) => ({ key: `c${i}`, label: c[lang] }));
  }

  protected tableRows(table: GuideTable, lang: Locale): Record<string, string>[] {
    return table.rows.map((row) => Object.fromEntries(row.map((cell, i) => [`c${i}`, cell[lang]])));
  }
}
