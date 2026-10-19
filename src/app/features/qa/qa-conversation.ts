import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Subscription } from 'rxjs';
import { treatyRate } from '@core/domain/rules-engine';
import { RULE_SET } from '@core/domain/rule-set.data';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { renderTemplate, type TemplateVars } from '@core/domain/template';
import type { Locale, Project, QaAnswer, Vehicle } from '@core/domain/types';
import { formatMoney, formatNumber } from '@core/i18n/format';
import { AssessmentService, QaService, ReferenceData } from '@core/ports';

export interface QaEntry {
  id: number;
  /** Free text typed by the visitor (empty when asked from a suggestion). */
  asked: string;
  answer: QaAnswer | null;
  status: 'thinking' | 'streaming' | 'done' | 'stopped';
  /** Streamed text so far (in the language it was asked). */
  partial: string;
  lang: Locale;
}

export interface QaContext {
  project: Project;
  vehicle: Vehicle;
}

/**
 * The Q&A conversation, kept for the whole session (root service, memory only).
 * Matches questions, fills project placeholders and streams answers.
 */
@Injectable({ providedIn: 'root' })
export class QaConversation {
  private readonly qa = inject(QaService);
  private readonly reference = inject(ReferenceData);
  private readonly engine = inject(AssessmentService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly entries = signal<QaEntry[]>([]);
  readonly busy = signal(false);
  private seq = 0;
  private stream?: Subscription;
  private context: QaContext | null = null;
  private countries: Awaited<ReturnType<ReferenceData['countries']>> = [];

  async setProject(project: Project | null): Promise<QaContext | null> {
    if (!project) {
      this.context = null;
      return null;
    }
    const [assessment, countries] = await Promise.all([
      this.engine.assess(project),
      this.reference.countries(),
    ]);
    this.countries = countries;
    this.context = { project, vehicle: assessment.vehicle.recommended };
    return this.context;
  }

  /** Answer body rendered for a locale, with project context when available. */
  render(answer: QaAnswer, lang: Locale): string {
    const ctx = this.context;
    const vars: TemplateVars = ctx ? this.vars(ctx, lang) : {};
    return renderTemplate(answer.body[lang], vars, { ctx: !!ctx });
  }

  async ask(input: { text?: string; answerId?: string }, lang: Locale): Promise<void> {
    this.stop();
    const entry: QaEntry = {
      id: ++this.seq,
      asked: input.text?.trim() ?? '',
      answer: null,
      status: 'thinking',
      partial: '',
      lang,
    };
    this.entries.update((list) => [...list, entry]);
    this.busy.set(true);

    let answer: QaAnswer | null = null;
    if (input.answerId)
      answer = (await this.qa.answers()).find((a) => a.id === input.answerId) ?? null;
    else if (entry.asked) answer = (await this.qa.match(entry.asked, lang)).answer;

    if (!answer) {
      this.patch(entry.id, { status: 'done' });
      this.busy.set(false);
      return;
    }
    this.patch(entry.id, { answer });
    const full = this.render(answer, lang);
    const instant = !this.browser || matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.patch(entry.id, { status: 'streaming' });
    this.stream = this.qa.stream(full, { instant }).subscribe({
      next: (chunk) => this.patch(entry.id, { partial: this.get(entry.id).partial + chunk }),
      complete: () => {
        this.patch(entry.id, { status: 'done' });
        this.busy.set(false);
      },
    });
  }

  stop(): void {
    if (!this.stream || this.stream.closed) return;
    this.stream.unsubscribe();
    const last = this.entries().at(-1);
    if (last && (last.status === 'streaming' || last.status === 'thinking'))
      this.patch(last.id, { status: 'stopped' });
    this.busy.set(false);
  }

  clear(): void {
    this.stop();
    this.entries.set([]);
  }

  private vars(ctx: QaContext, lang: Locale): TemplateVars {
    const input = ctx.project.input;
    const country = this.countries.find((c) => c.code === input.investorCountry);
    return {
      'ctx.projectTitle': ctx.project.title[lang],
      'ctx.investorCountry': country?.name[lang] ?? input.investorCountry,
      'ctx.treatyRate': treatyRate(input.investorCountry, this.countries, RULE_SET)[lang],
      'ctx.province': PROVINCE_NAMES[input.province][lang],
      'ctx.vehicle':
        RULE_SET.vehicles.options.find((o) => o.vehicle === ctx.vehicle)?.name[lang] ?? ctx.vehicle,
      'ctx.workers': formatNumber(input.workers, lang),
      'ctx.foreignWorkers': formatNumber(input.foreignWorkers, lang),
      'ctx.investment': formatMoney(input.investmentUsd, 'USD', lang),
    };
  }

  private get(id: number): QaEntry {
    return this.entries().find((e) => e.id === id)!;
  }

  private patch(id: number, patch: Partial<QaEntry>): void {
    this.entries.update((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
}
