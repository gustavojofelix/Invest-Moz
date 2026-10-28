import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { SafeStorage } from '@core/adapters/safe-storage';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import {
  PROVINCES,
  type CapitalOrigin,
  type Locale,
  type Project,
  type ProjectInput,
  type ProvinceCode,
  type SectorId,
} from '@core/domain/types';
import { formatMoney, LocPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { INTL_LOCALE } from '@core/i18n/locales';
import { ProjectRepository, ReferenceData } from '@core/ports';
import { Icon } from '@shared/ui/icon';
import { SpeechInput } from '@features/landing/speech-input';
import { composeIdea } from './compose-idea';
import { CountryCombobox } from './country-combobox';

export const QUESTIONS = ['sector', 'province', 'size', 'origin', 'jobs', 'timing'] as const;
export type Question = (typeof QUESTIONS)[number];

const SECTORS: SectorId[] = [
  'agro_industry',
  'energy',
  'tourism',
  'logistics',
  'mining',
  'oil_gas',
  'services',
  'general',
];

/** Investment bands (USD) and the value used for the rules when no exact amount is given. */
const BANDS = [
  { id: 'xs', value: 50_000, max: 100_000 },
  { id: 's', value: 250_000, max: 500_000 },
  { id: 'm', value: 1_000_000, max: 2_000_000 },
  { id: 'l', value: 5_000_000, max: 10_000_000 },
  { id: 'xl', value: 25_000_000, max: 50_000_000 },
  { id: 'xxl', value: 100_000_000, max: Infinity },
] as const;
type BandId = (typeof BANDS)[number]['id'];

const TIMINGS = ['now', 'months3', 'months12', 'exploring'] as const;
type Timing = (typeof TIMINGS)[number];

const FACTS = [
  'needsLand',
  'importsGoods',
  'temporaryImport',
  'exports',
  'shareholderLoan',
  'feesAbroad',
] as const;
type Fact = (typeof FACTS)[number];

interface Answers {
  idea: string;
  sector: SectorId | null;
  province: ProvinceCode | 'unsure' | null;
  band: BandId | null;
  amount: number | null;
  capital: CapitalOrigin;
  country: string;
  workers: number | null;
  foreignWorkers: number | null;
  timing: Timing | null;
  facts: Record<Fact, boolean>;
  /** Set when an example was loaded and not changed since. */
  exampleRef: string | null;
}

interface Draft {
  step: number;
  answers: Answers;
}

const DRAFT_KEY = 'pathfinder-draft';
const NO_FACTS: Record<Fact, boolean> = {
  needsLand: false,
  importsGoods: false,
  temporaryImport: false,
  exports: false,
  shareholderLoan: false,
  feesAbroad: false,
};

function emptyAnswers(idea = ''): Answers {
  return {
    idea,
    sector: null,
    province: null,
    band: null,
    amount: null,
    capital: 'foreign',
    country: '',
    workers: null,
    foreignWorkers: 0,
    timing: null,
    facts: { ...NO_FACTS },
    exampleRef: null,
  };
}

function bandFor(usd: number): BandId {
  return (BANDS.find((b) => usd < b.max) ?? BANDS[BANDS.length - 1]).id;
}

/** Screen 4 · Investment Pathfinder: six short questions, then the roadmap. */
@Component({
  selector: 'im-pathfinder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, ReactiveFormsModule, TranslocoDirective, LocPipe, CountryCombobox],
  templateUrl: './pathfinder-page.html',
  styles: `
    .bar {
      height: 0.375rem;
      border-radius: 999px;
      background: var(--rule);
      overflow: hidden;
    }
    .bar > span {
      display: block;
      height: 100%;
      background: var(--brand);
      transition: width 240ms var(--ease-out-soft);
    }
    .opt {
      min-height: 2.75rem;
      border-radius: var(--radius);
      justify-content: center;
      text-align: center;
      font-size: 0.875rem;
    }
    .opt-wide {
      justify-content: flex-start;
      text-align: start;
    }
    .so-far {
      background: var(--panel);
      border-radius: var(--radius-md);
    }
    .so-far button {
      min-height: 2.75rem;
    }
    :host-context([dir='rtl']) .flip {
      transform: scaleX(-1);
    }
  `,
})
export class PathfinderPage {
  /** `?idea=` from the landing idea box or the chat. */
  readonly idea = input<string>();
  private readonly router = inject(Router);
  private readonly repo = inject(ProjectRepository);
  private readonly reference = inject(ReferenceData);
  private readonly storage = inject(SafeStorage);
  protected readonly speech = inject(SpeechInput);
  protected readonly locale = inject(LocaleService);
  protected readonly lang = this.locale.lang;

  protected readonly questions = QUESTIONS;
  protected readonly sectors = SECTORS;
  protected readonly provinces = PROVINCES;
  protected readonly provinceNames = PROVINCE_NAMES;
  protected readonly bands = BANDS;
  protected readonly timings = TIMINGS;
  protected readonly facts = FACTS;
  protected readonly capitals: CapitalOrigin[] = ['foreign', 'mixed', 'mozambican'];

  protected readonly examples = resource({ loader: () => this.repo.examples() });
  protected readonly countries = resource({ loader: () => this.reference.countries() });

  protected readonly step = signal(0);
  protected readonly answers = signal<Answers>(emptyAnswers());
  protected readonly attempted = signal(false);
  protected readonly building = signal(false);
  protected readonly examplesOpen = signal(false);
  protected readonly country = new FormControl('', { nonNullable: true });
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private focusOnChange = false;

  protected readonly question = computed<Question>(() => QUESTIONS[this.step()]);
  protected readonly isLast = computed(() => this.step() === QUESTIONS.length - 1);

  protected readonly answered = computed<Record<Question, boolean>>(() => {
    const a = this.answers();
    const workers = a.workers ?? -1;
    const foreign = a.foreignWorkers ?? 0;
    return {
      sector: !!a.sector,
      province: !!a.province,
      size: !!a.band || (a.amount ?? 0) >= 1000,
      origin: a.capital === 'mozambican' || !!a.country,
      jobs:
        workers >= 0 &&
        Number.isInteger(workers) &&
        foreign >= 0 &&
        Number.isInteger(foreign) &&
        foreign <= workers,
      timing: !!a.timing,
    };
  });

  /** Investment used for the rules: the exact amount, else the band's value. */
  protected readonly investment = computed(() => {
    const a = this.answers();
    if (a.amount && a.amount >= 1000) return a.amount;
    return BANDS.find((b) => b.id === a.band)?.value ?? null;
  });

  protected readonly countryName = computed(() => {
    const code = this.answers().country;
    const c = (this.countries.value() ?? []).find((x) => x.code === code);
    return c ? this.locale.text(c.name) : code;
  });

  constructor() {
    const draft = this.storage.get<Draft | null>(DRAFT_KEY, null);
    if (draft?.answers) {
      this.answers.set({ ...emptyAnswers(), ...draft.answers });
      this.step.set(Math.min(Math.max(draft.step ?? 0, 0), QUESTIONS.length - 1));
      this.country.setValue(draft.answers.country ?? '');
    }

    // A new idea from the landing or the chat starts a fresh Pathfinder.
    effect(() => {
      const idea = this.idea()?.trim();
      if (!idea) return;
      untracked(() => {
        if (idea === this.answers().idea) return;
        this.answers.set(emptyAnswers(idea));
        this.country.setValue('');
        this.step.set(0);
        void this.guessSector(idea);
      });
    });

    effect(() => {
      const draftValue: Draft = { step: this.step(), answers: this.answers() };
      untracked(() => this.storage.set(DRAFT_KEY, draftValue));
    });

    this.country.valueChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((code) => this.patch({ country: code }));

    // Move focus to the new question so screen readers announce it.
    effect(() => {
      this.step();
      if (!this.focusOnChange) return;
      untracked(() => queueMicrotask(() => this.heading()?.nativeElement.focus()));
    });

    afterNextRender(() => this.speech.detect());
  }

  protected patch(p: Partial<Answers>): void {
    this.answers.update((a) => ({ ...a, ...p, exampleRef: null }));
  }

  protected setFact(f: Fact, on: boolean): void {
    this.answers.update((a) => ({ ...a, facts: { ...a.facts, [f]: on }, exampleRef: null }));
  }

  protected setCapital(c: CapitalOrigin): void {
    this.patch({ capital: c });
    if (c === 'mozambican') this.country.setValue('', { emitEvent: false });
  }

  protected numberValue(raw: string): number | null {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  protected bandLabel(id: BandId): string {
    const i = BANDS.findIndex((b) => b.id === id);
    const lang = this.lang();
    const lo = i === 0 ? 0 : BANDS[i - 1].max;
    const hi = BANDS[i].max;
    if (i === 0) return this.locale.t('pathfinder.size.under', { v: formatUsd(hi, lang) });
    if (hi === Infinity) return this.locale.t('pathfinder.size.over', { v: formatUsd(lo, lang) });
    return `${formatUsd(lo, lang)} – ${formatUsd(hi, lang)}`;
  }

  protected money(v: number): string {
    return formatMoney(v, 'USD', this.lang());
  }

  protected go(i: number): void {
    this.focusOnChange = true;
    this.attempted.set(false);
    this.step.set(i);
  }

  protected back(): void {
    if (this.step() > 0) this.go(this.step() - 1);
  }

  protected async next(): Promise<void> {
    this.attempted.set(true);
    if (!this.answered()[this.question()]) return;
    if (!this.isLast()) {
      // Skip ahead to the first unanswered question (useful after an example or an edit).
      const nextOpen = QUESTIONS.findIndex((q, i) => i > this.step() && !this.answered()[q]);
      this.go(nextOpen === -1 ? QUESTIONS.length - 1 : nextOpen);
      return;
    }
    const firstOpen = QUESTIONS.findIndex((q) => !this.answered()[q]);
    if (firstOpen !== -1) {
      this.go(firstOpen);
      return;
    }
    await this.build();
  }

  protected loadExample(p: Project): void {
    void this.guessSector(p.input.idea).then(() => {
      const i = p.input;
      this.answers.update((a) => ({
        ...a,
        idea: i.idea,
        province: i.province,
        band: bandFor(i.investmentUsd),
        amount: i.investmentUsd,
        capital: i.capital,
        country: i.capital === 'mozambican' ? '' : i.investorCountry,
        workers: i.workers,
        foreignWorkers: i.foreignWorkers,
        facts: {
          needsLand: i.needsLand,
          importsGoods: i.importsGoods,
          temporaryImport: i.temporaryImport,
          exports: i.exports,
          shareholderLoan: i.shareholderLoan,
          feesAbroad: i.feesAbroad,
        },
        exampleRef: p.ref,
      }));
      this.country.setValue(i.capital === 'mozambican' ? '' : i.investorCountry, {
        emitEvent: false,
      });
      this.examplesOpen.set(false);
      this.go(QUESTIONS.indexOf('timing'));
    });
  }

  protected startOver(): void {
    this.answers.set(emptyAnswers());
    this.country.setValue('', { emitEvent: false });
    this.go(0);
  }

  /** After typing an idea, pre-select its sector if none is chosen yet. */
  protected ideaDone(): void {
    const idea = this.answers().idea.trim();
    if (idea && !this.answers().sector) void this.guessSector(idea);
  }

  protected voice(): void {
    if (this.speech.listening()) {
      this.speech.stop();
      return;
    }
    this.speech.start(this.lang(), (text, final) => {
      this.patch({ idea: text });
      if (final) this.ideaDone();
    });
  }

  /** Pre-selects the sector the rules engine reads in the idea text. */
  private async guessSector(idea: string): Promise<void> {
    const [{ RULE_SET }, { classifySector }] = await Promise.all([
      import('@core/domain/rule-set.data'),
      import('@core/domain/rules-engine'),
    ]);
    const s = classifySector(idea, RULE_SET.sectors).id as SectorId;
    this.answers.update((a) => ({ ...a, sector: s }));
  }

  private async build(): Promise<void> {
    this.building.set(true);
    try {
      const a = this.answers();
      const example = a.exampleRef ? await this.repo.get(a.exampleRef) : null;
      const project = example ?? (await this.repo.create(await this.toInput(a)));
      this.repo.setCurrent(project.ref);
      this.storage.remove(DRAFT_KEY);
      await this.router.navigate(['/', this.lang(), 'roadmap', project.ref]);
    } finally {
      this.building.set(false);
    }
  }

  /** Maps the six answers onto a full ProjectInput for the rules engine. */
  private async toInput(a: Answers): Promise<ProjectInput> {
    const [{ RULE_SET }, { classifySector }] = await Promise.all([
      import('@core/domain/rule-set.data'),
      import('@core/domain/rules-engine'),
    ]);
    const province: ProvinceCode =
      a.province && a.province !== 'unsure' ? a.province : 'maputo_cidade';
    const idea = composeIdea(
      a.idea,
      a.sector ?? 'general',
      province,
      (text) => classifySector(text, RULE_SET.sectors).id,
    );
    return {
      idea,
      province,
      capital: a.capital,
      investorCountry: a.capital === 'mozambican' ? 'MZ' : a.country,
      investmentUsd: this.investment() ?? 0,
      workers: a.workers ?? 0,
      foreignWorkers: a.foreignWorkers ?? 0,
      ...a.facts,
    };
  }
}

function formatUsd(v: number, lang: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[lang], {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(v);
}
