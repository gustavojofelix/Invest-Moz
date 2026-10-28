import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import type { Obligation, RoadmapStep, TriggerResult } from '@core/domain/types';
import { LocaleService } from '@core/i18n/locale.service';
import { BrandMark } from '@core/layout/brand-mark';
import { FlagStripe } from '@core/layout/flag-stripe';
import { LanguageSwitcher } from '@core/layout/language-switcher';
import { AnswerBlock } from '@shared/ui/answer-block';
import { CheckboxChip } from '@shared/ui/checkbox-chip';
import { ConfirmChip } from '@shared/ui/confirm-text';
import { Disclaimer } from '@shared/ui/disclaimer';
import { EmptyState } from '@shared/ui/empty-state';
import { FactTriggerRow } from '@shared/ui/fact-trigger-row';
import { MemoSection } from '@shared/ui/memo-section';
import { ObligationCalendar } from '@shared/ui/obligation-calendar';
import { RefTag } from '@shared/ui/ref-tag';
import { RoadmapTimeline } from '@shared/ui/roadmap-timeline';
import { RuledTable } from '@shared/ui/ruled-table';
import { SectionLabel } from '@shared/ui/section-label';
import { Sheet, SheetService } from '@shared/ui/sheet';
import { Skeleton } from '@shared/ui/skeleton';
import { StatusPill } from '@shared/ui/status-pill';
import { Stepper } from '@shared/ui/stepper';
import { fillText } from '@core/domain/text';

const lt = (pt: string, en = pt, fr = pt) => fillText({ pt, en, fr });

/** Sample content for the sheet demo. */
@Component({
  selector: 'im-style-guide-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sheet],
  template: `<im-sheet heading="Sheet" eyebrow="Overlay"
    ><p>
      Side panel from 768px, bottom sheet on mobile. Focus is trapped and restored; Esc closes.
    </p></im-sheet
  >`,
})
export class StyleGuideSheet {}

/** Living style guide: tokens, type and every shared component. */
@Component({
  selector: 'im-style-guide',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    BrandMark,
    FlagStripe,
    LanguageSwitcher,
    AnswerBlock,
    CheckboxChip,
    ConfirmChip,
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
    StatusPill,
    Stepper,
  ],
  templateUrl: './style-guide.html',
  styles: `
    .swatch {
      height: 3.5rem;
      border: 1px solid var(--rule);
      border-radius: var(--radius);
    }
    .demo {
      border: 1px solid var(--rule);
      padding: 1.25rem;
      background: var(--paper);
    }
  `,
})
export class StyleGuide {
  private readonly sheet = inject(SheetService);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly chipA = signal(true);
  protected readonly chipB = signal(false);
  protected readonly stepDone = signal(2);

  protected readonly tokens = [
    'brand',
    'brand-deep',
    'brand-deep-2',
    'brand-tint',
    'highlight',
    'accent',
    'ink',
    'ink-soft',
    'muted',
    'surface',
    'surface-alt',
    'panel',
    'paper',
    'rule',
    'warn-bg',
    'bad-bg',
  ];
  protected readonly scale = [
    { size: 48, cls: 'text-4xl font-serif' },
    { size: 36, cls: 'text-3xl font-serif' },
    { size: 28, cls: 'text-2xl font-serif' },
    { size: 22, cls: 'text-xl font-serif' },
    { size: 18, cls: 'text-lg' },
    { size: 16, cls: 'text-base' },
    { size: 14, cls: 'text-sm' },
  ];

  protected readonly steps: RoadmapStep[] = [
    {
      id: 'a',
      number: 1,
      phase: 'explore',
      title: lt('Reunião com a APIEX'),
      authority: lt('APIEX'),
      duration: lt('1–4 semanas'),
      note: lt('Apresentar o projecto.'),
      critical: false,
      refs: ['apiex-guide-2026'],
    },
    {
      id: 'b',
      number: 2,
      phase: 'establish',
      title: lt('Constituição da Lda e NUIT'),
      authority: lt('Conservatória'),
      duration: lt('3–10 dias'),
      note: lt('Pacto social e NUIT.'),
      critical: false,
      refs: ['dl-1-2022'],
    },
    {
      id: 'c',
      number: 3,
      phase: 'operate',
      title: lt('Licença ambiental (categoria B)'),
      authority: lt('Autoridade ambiental'),
      duration: lt('2–4 meses'),
      note: lt('Caminho crítico.'),
      critical: true,
      refs: ['aia-regulation'],
    },
  ];

  protected readonly obligations: Obligation[] = [
    {
      id: 'w',
      title: lt('Retenções na fonte e imposto do selo'),
      frequency: lt('Mensal · até ao dia 20'),
      schedule: { kind: 'monthly', day: 20 },
      next: [
        { date: '2026-12-18', nominal: '2026-12-20', shifted: true },
        { date: '2027-01-20', nominal: '2027-01-20', shifted: false },
      ],
      refs: ['cirpc'],
    },
    {
      id: 'r',
      title: lt('Relatório de progresso à APIEX'),
      frequency: lt('Semestral'),
      schedule: { kind: 'text' },
      next: [],
      note: lt('Datas {{APIEX_REPORT_DATES}}.'),
      refs: ['lei-8-2023'],
    },
  ];

  protected readonly trigger: TriggerResult = {
    id: 'fees',
    trigger: 'fees_abroad',
    severity: 'attention',
    fact: lt('Serviços pagos ao exterior'),
    text: lt('Retenção na fonte de 20% e autoliquidação do IVA.'),
    refs: ['cirpc', 'civa'],
  };

  protected readonly tableColumns = [
    { key: 'row', label: 'Aspecto' },
    { key: 'company', label: 'Sociedade', emphasis: true },
    { key: 'branch', label: 'Sucursal' },
  ];
  protected readonly tableRows = [
    {
      row: 'Responsabilidade',
      company: 'Limitada ao capital social',
      branch: 'A sociedade-mãe responde',
    },
    {
      row: 'Auditoria',
      company: 'Conforme a dimensão ({{AUDIT_REQUIREMENT_THRESHOLD}})',
      branch: 'Contas próprias',
    },
  ];

  protected readonly answer =
    '**Sim, desde que cumpridas as condições.** O IDE deve estar registado [ref:lei-11-2009].\n\nCondições:\n- IDE mínimo de **MZN 6,5 milhões** [ref:lei-8-2023]\n- Taxa a confirmar: {{INSS_CONTRIBUTION_RATES}}';

  protected openSheet(): void {
    this.sheet.open(StyleGuideSheet, { label: 'Sheet' });
  }
}
