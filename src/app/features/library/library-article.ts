import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
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
import { pickText } from '@core/domain/text';
import type { Locale } from '@core/domain/types';
import { ImDatePipe, LocPipe } from '@core/i18n/format';
import { HTML_LANG, LOCALE_DIR, LOCALE_LABEL } from '@core/i18n/locales';
import { LocaleService } from '@core/i18n/locale.service';
import { SeoService } from '@core/layout/seo.service';
import { KnowledgeBase } from '@core/ports';
import { CitationService } from '@shared/ui/citation.service';
import { ConfirmText } from '@shared/ui/confirm-text';
import { Disclaimer } from '@shared/ui/disclaimer';
import { Icon } from '@shared/ui/icon';
import { RefTag } from '@shared/ui/ref-tag';
import { RichText } from '@shared/ui/rich-text';
import { RuledTable, type RuledColumn } from '@shared/ui/ruled-table';
import { CHAPTER_DIPLOMAS, areaOf } from './library-areas';

/**
 * Screen 12 · Library article: one guide chapter, readable in English or
 * Portuguese whatever the interface language, with its source diplomas, the
 * review date and "Ask Tiva about this article". Prerendered in every locale.
 */
@Component({
  selector: 'im-library-article-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Icon,
    RouterLink,
    TranslocoDirective,
    LocPipe,
    ImDatePipe,
    ConfirmText,
    Disclaimer,
    RefTag,
    RichText,
    RuledTable,
  ],
  templateUrl: './library-article.html',
  styleUrl: './library-article.css',
})
export class LibraryArticlePage {
  readonly chapter = input<string>();
  /** Resolved by guideIndexResolver and guideChapterResolver (bound as inputs). */
  readonly guide = input<GuideIndex>();
  readonly body = input<GuideChapterBody | null>();
  private readonly seo = inject(SeoService);
  private readonly locale = inject(LocaleService);
  private readonly kb = inject(KnowledgeBase);
  private readonly citations = inject(CitationService);
  protected readonly lang = this.locale.lang;

  /** The article version the reader picked; null follows the interface language. */
  protected readonly choice = signal<Locale | null>(null);
  protected readonly contentLang = computed<Locale>(() => this.choice() ?? this.lang());
  /** English and Portuguese always; the interface language too when it is another one. */
  protected readonly versions = computed<Locale[]>(() => {
    const ui = this.lang();
    return ui === 'en' || ui === 'pt' ? ['en', 'pt'] : [ui, 'en', 'pt'];
  });
  protected readonly contentHtmlLang = computed(() => HTML_LANG[this.contentLang()]);
  protected readonly contentDir = computed(() => LOCALE_DIR[this.contentLang()]);
  protected readonly uiHtmlLang = computed(() => HTML_LANG[this.lang()]);
  protected readonly uiDir = computed(() => LOCALE_DIR[this.lang()]);

  protected readonly chapters = computed(() => this.guide()?.chapters ?? []);
  protected readonly index = computed(() => {
    const id = this.chapter();
    return isGuideChapter(id) ? this.chapters().findIndex((c) => c.id === id) : -1;
  });
  protected readonly current = computed(() => this.chapters()[this.index()]);
  protected readonly area = computed(() => {
    const c = this.current();
    return c ? areaOf(c.id) : 'start';
  });
  protected readonly sections = computed(() => this.body()?.sections ?? []);
  protected readonly prev = computed(() => this.chapters()[this.index() - 1]);
  protected readonly next = computed(() =>
    this.index() >= 0 ? this.chapters()[this.index() + 1] : undefined,
  );
  protected readonly sources = computed(() => {
    const ids = this.current()?.sources ?? [];
    return (this.guide()?.sources ?? []).filter((s) => ids.includes(s.id));
  });
  protected readonly diplomas = computed(() => {
    const c = this.current();
    if (!c) return [];
    this.kb.loaded();
    const lang = this.lang();
    return CHAPTER_DIPLOMAS[c.id].map((id) => {
      const ref = this.kb.lookup(id);
      return {
        id,
        instrument: ref?.instrument ?? id,
        title: ref ? pickText(ref.title, lang) : '',
        reviewed: ref?.lastReviewed ?? '',
      };
    });
  });
  /** The question pre-filled in the chat, in the interface language. */
  protected readonly askQuestion = computed(() => {
    const c = this.current();
    return c
      ? this.locale.t('library.article.askQuestion', { topic: pickText(c.title, this.lang()) })
      : '';
  });

  constructor() {
    effect(() => {
      const c = this.current();
      const l = this.lang();
      if (c) untracked(() => this.seo.setTitle(pickText(c.title, l)));
    });
  }

  protected htmlLang(l: Locale): string {
    return HTML_LANG[l];
  }

  protected endonym(l: Locale): string {
    return LOCALE_LABEL[l];
  }

  protected versionLabel(l: Locale): string {
    return l.toUpperCase();
  }

  protected openOfficial(refId: string): void {
    void this.citations.open(refId);
  }

  protected tableColumns(table: GuideTable, lang: Locale): RuledColumn[] {
    return table.columns.map((c, i) => ({ key: `c${i}`, label: pickText(c, lang) }));
  }

  protected tableRows(table: GuideTable, lang: Locale): Record<string, string>[] {
    return table.rows.map((row) =>
      Object.fromEntries(row.map((cell, i) => [`c${i}`, pickText(cell, lang)])),
    );
  }
}
