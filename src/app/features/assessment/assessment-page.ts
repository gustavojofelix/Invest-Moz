import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import {
  LucideArrowRight,
  LucideMessageSquareText,
  LucidePrinter,
  LucideSend,
  LucideTriangleAlert,
} from '@lucide/angular';
import type { Assessment, LocalizedText } from '@core/domain/types';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { ImDatePipe, LocPipe, MoneyPipe, NumberPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { BrandMark } from '@core/layout/brand-mark';
import { FlagStripe } from '@core/layout/flag-stripe';
import { SeoService } from '@core/layout/seo.service';
import { maputoToday } from '@core/adapters/json/json-assessment-service';
import { ConfirmText } from '@shared/ui/confirm-text';
import { Disclaimer } from '@shared/ui/disclaimer';
import { EmptyState } from '@shared/ui/empty-state';
import { FactTriggerRow } from '@shared/ui/fact-trigger-row';
import { MemoSection } from '@shared/ui/memo-section';
import { ObligationCalendar } from '@shared/ui/obligation-calendar';
import { RefTag } from '@shared/ui/ref-tag';
import { RoadmapTimeline } from '@shared/ui/roadmap-timeline';
import { RuledTable, type RuledColumn } from '@shared/ui/ruled-table';
import { SectionLabel } from '@shared/ui/section-label';
import { Skeleton } from '@shared/ui/skeleton';
import { AssessmentFacade } from './assessment.facade';

type SectionId =
  | 'vehicle'
  | 'comparison'
  | 'regime'
  | 'roadmap'
  | 'licences'
  | 'facts'
  | 'incentives'
  | 'obligations'
  | 'location'
  | 'watch';

@Component({
  selector: 'im-assessment-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AssessmentFacade],
  imports: [
    RouterLink,
    TranslocoDirective,
    LocPipe,
    MoneyPipe,
    NumberPipe,
    ImDatePipe,
    BrandMark,
    FlagStripe,
    ConfirmText,
    Disclaimer,
    EmptyState,
    FactTriggerRow,
    MemoSection,
    ObligationCalendar,
    RefTag,
    RoadmapTimeline,
    RuledTable,
    SectionLabel,
    Skeleton,
    LucidePrinter,
    LucideMessageSquareText,
    LucideSend,
    LucideArrowRight,
    LucideTriangleAlert,
  ],
  templateUrl: './assessment-page.html',
  styleUrl: './assessment-page.css',
})
export class AssessmentPage {
  readonly ref = input.required<string>();
  private readonly facade = inject(AssessmentFacade);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly transloco = inject(TranslocoService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly locale = inject(LocaleService);
  protected readonly lang = this.locale.lang;
  protected readonly state = this.facade.state;
  protected readonly provinceNames = PROVINCE_NAMES;
  protected readonly today = maputoToday();
  protected readonly activeSection = signal<SectionId>('vehicle');

  protected readonly ready = computed(() => {
    const s = this.state();
    return s.status === 'ready' ? s : null;
  });

  protected readonly sections = computed<SectionId[]>(() => {
    const a = this.ready()?.assessment;
    if (!a) return [];
    const ids: SectionId[] = ['vehicle'];
    if (a.companyVsBranch) ids.push('comparison');
    ids.push('regime', 'roadmap', 'licences', 'facts', 'incentives', 'obligations', 'location');
    if (a.watchPoints.length) ids.push('watch');
    return ids;
  });

  protected readonly comparisonColumns = computed<RuledColumn[]>(() => {
    this.lang();
    const a = this.ready()?.assessment;
    const recommendBranch = a?.vehicle.recommended === 'branch';
    return [
      { key: 'label', label: this.transloco.translate('assessment.comparison.aspect') },
      { key: 'company', label: this.transloco.translate('assessment.comparison.company'), emphasis: !recommendBranch },
      { key: 'branch', label: this.transloco.translate('assessment.comparison.branch'), emphasis: recommendBranch },
    ];
  });

  protected readonly comparisonRows = computed(() => {
    const l = this.lang();
    return (this.ready()?.assessment.companyVsBranch ?? []).map((r) => ({
      label: r.label[l],
      company: r.company[l],
      branch: r.branch[l],
    }));
  });

  constructor() {
    effect(() => {
      const ref = this.ref();
      untracked(() => void this.facade.load(ref));
    });
    effect(() => {
      const r = this.ready();
      const l = this.lang();
      if (r) untracked(() => this.seo.setTitle(r.project.title[l]));
    });
  }

  protected n(id: SectionId): string {
    return String(this.sections().indexOf(id) + 1).padStart(2, '0');
  }

  protected text(v: LocalizedText | undefined): string {
    return this.locale.text(v);
  }

  protected print(): void {
    if (this.browser) window.print();
  }

  protected ask(): void {
    void this.router.navigate(['/', this.lang(), 'questions']);
  }

  protected contact(): void {
    void this.router.navigate(['/', this.lang(), 'contact']);
  }

  protected viewExample(): void {
    void this.router.navigate(['/', this.lang(), 'assessment', 'TA-IM-EX01']);
  }

  protected jump(id: SectionId, event: Event): void {
    event.preventDefault();
    this.activeSection.set(id);
    if (!this.browser) return;
    const el = document.getElementById(`sec-${id}`);
    el?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    el?.querySelector<HTMLElement>('h2')?.focus?.();
    history.replaceState(history.state, '', `${location.pathname}#sec-${id}`);
  }

  protected vehicleIs(a: Assessment, v: string): boolean {
    return a.vehicle.recommended === v;
  }
}
