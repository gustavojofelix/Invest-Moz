import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Subscription } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { SafeStorage } from '@core/adapters/safe-storage';
import { RULE_SET } from '@core/domain/rule-set.data';
import { classifySector } from '@core/domain/rules-engine';
import { normalize, pickText } from '@core/domain/text';
import {
  REVIEWED_LOCALES,
  type Locale,
  type Project,
  type QaAnswer,
  type SectorId,
} from '@core/domain/types';
import { QaService } from '@core/ports';
import { QaConversation } from '@features/qa/qa-conversation';

export type ReplyStatus = 'thinking' | 'streaming' | 'done' | 'stopped';

export type ChatMessage =
  | { id: number; role: 'user'; text: string; answerId?: string }
  | {
      id: number;
      role: 'tiva';
      kind: 'answer';
      answerId: string;
      status: ReplyStatus;
      partial: string;
    }
  | {
      id: number;
      role: 'tiva';
      kind: 'outline';
      sector: SectorId;
      status: ReplyStatus;
      partial: string;
    }
  | { id: number; role: 'tiva'; kind: 'fallback'; suggestions: string[] };

export type TivaReply = Extract<ChatMessage, { role: 'tiva' }>;

interface Stored {
  messages: ChatMessage[];
  idea: string;
}

const KEY = 'chat.thread';
/** Above this keyword score a first message is a question, not a project idea. */
const QUESTION_SCORE = 4;
/** Minimum character-bigram similarity with a localized question (any script). */
const SIMILAR = 0.42;
const DEFAULT_SUGGESTIONS = ['investment-1', 'companies-1', 'incentives-4'];
const OUTLINE_REFS = ['lei-8-2023', 'dec-8-2024', 'dec-41-2026', 'lei-11-2009'];

function bigrams(text: string): Set<string> {
  const s = normalize(text).replace(/\s+/g, '');
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

/** Dice coefficient on character bigrams: works for scripts without spaces too. */
export function similarity(a: string, b: string): number {
  const x = bigrams(a);
  const y = bigrams(b);
  if (!x.size || !y.size) return 0;
  let shared = 0;
  for (const g of x) if (y.has(g)) shared++;
  return (2 * shared) / (x.size + y.size);
}

/**
 * The Tiva chat thread: user messages and Tiva replies (reviewed answers from
 * the Q&A bank, a project outline for a first idea, or an honest fallback).
 * Kept in SafeStorage so a reload keeps the conversation.
 */
@Injectable({ providedIn: 'root' })
export class ChatSession {
  private readonly qa = inject(QaService);
  private readonly conversation = inject(QaConversation);
  private readonly storage = inject(SafeStorage);
  private readonly transloco = inject(TranslocoService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly messages = signal<ChatMessage[]>([]);
  readonly busy = signal(false);
  /** The first thing the investor wrote (feeds "Build my roadmap"). */
  readonly idea = signal('');
  private seq = 0;
  private stream?: Subscription;

  constructor() {
    const stored = this.storage.get<Stored | null>(KEY, null);
    if (stored?.messages?.length) {
      this.messages.set(
        stored.messages.map((m) =>
          m.role === 'tiva' && m.kind !== 'fallback' && m.status !== 'done'
            ? { ...m, status: 'done', partial: '' }
            : m,
        ),
      );
      this.idea.set(stored.idea ?? '');
      this.seq = Math.max(0, ...stored.messages.map((m) => m.id));
    }
  }

  setProject(project: Project | null): Promise<unknown> {
    return this.conversation.setProject(project);
  }

  /** Answer for a reply, from the loaded bank (undefined while loading). */
  answer(id: string, answers: readonly QaAnswer[]): QaAnswer | undefined {
    return answers.find((a) => a.id === id);
  }

  render(answer: QaAnswer, lang: Locale): string {
    return this.conversation.render(answer, lang);
  }

  outlineRefs(): string[] {
    return OUTLINE_REFS;
  }

  /** A first message from the landing idea box: a question gets an answer, an idea an outline. */
  async start(text: string, lang: Locale): Promise<void> {
    this.clear();
    const asked = text.trim();
    if (!asked) return;
    this.idea.set(asked);
    this.push({ id: ++this.seq, role: 'user', text: asked });
    const match = await this.find(asked, lang);
    if (match && match.score >= QUESTION_SCORE) return this.reply(match.answer, lang);
    const sector = classifySector(asked, RULE_SET.sectors).id;
    const body = this.transloco.translate('chat.outline.body');
    this.streamReply(
      { id: ++this.seq, role: 'tiva', kind: 'outline', sector, status: 'thinking', partial: '' },
      body,
    );
  }

  async ask(input: { text?: string; answerId?: string }, lang: Locale): Promise<void> {
    this.stop();
    const answers = await this.qa.answers();
    let answer: QaAnswer | null = null;
    if (input.answerId) answer = answers.find((a) => a.id === input.answerId) ?? null;
    const text = input.text?.trim() ?? '';
    if (!answer && !text) return;
    if (!this.idea() && text) this.idea.set(text);
    this.push({
      id: ++this.seq,
      role: 'user',
      text: answer && !text ? pickText(answer.question, lang) : text,
      answerId: input.answerId,
    });
    if (!answer) answer = (await this.find(text, lang))?.answer ?? null;
    if (answer) return this.reply(answer, lang);
    this.push({
      id: ++this.seq,
      role: 'tiva',
      kind: 'fallback',
      suggestions: this.suggest(text, answers, lang),
    });
    this.save();
  }

  stop(): void {
    if (!this.stream || this.stream.closed) return;
    this.stream.unsubscribe();
    const last = this.messages().at(-1);
    if (last?.role === 'tiva' && last.kind !== 'fallback' && last.status !== 'done')
      this.patch(last.id, { status: 'stopped' });
    this.busy.set(false);
    this.save();
  }

  clear(): void {
    this.stop();
    this.messages.set([]);
    this.idea.set('');
    this.storage.remove(KEY);
  }

  /** Keyword match (PT/EN/FR keywords) then similarity with the localized and English questions. */
  private async find(
    text: string,
    lang: Locale,
  ): Promise<{ answer: QaAnswer; score: number } | null> {
    const m = await this.qa.match(text, lang);
    if (m.answer) return { answer: m.answer, score: m.score };
    // Character bigrams stand in for the missing keywords in ZH/AR/HI/SW/AF only: on long
    // PT/EN/FR sentences they over-match (a cashew-plant idea "resembled" an LNG supplier question).
    if (REVIEWED_LOCALES.includes(lang)) return null;
    let best: QaAnswer | null = null;
    let bestScore = 0;
    for (const a of await this.qa.answers()) {
      const s = Math.max(
        similarity(text, pickText(a.question, lang)),
        similarity(text, a.question.en),
      );
      if (s > bestScore) {
        best = a;
        bestScore = s;
      }
    }
    // Similarity is scaled to the keyword score range so a near-verbatim question counts as a question.
    return best && bestScore >= SIMILAR ? { answer: best, score: bestScore * 10 } : null;
  }

  private suggest(text: string, answers: readonly QaAnswer[], lang: Locale): string[] {
    const ranked = answers
      .map((a) => ({ id: a.id, s: similarity(text, pickText(a.question, lang)) }))
      .filter((r) => r.s > 0.18)
      .sort((x, y) => y.s - x.s)
      .slice(0, 3)
      .map((r) => r.id);
    return ranked.length ? ranked : DEFAULT_SUGGESTIONS;
  }

  private reply(answer: QaAnswer, lang: Locale): void {
    this.streamReply(
      {
        id: ++this.seq,
        role: 'tiva',
        kind: 'answer',
        answerId: answer.id,
        status: 'thinking',
        partial: '',
      },
      this.render(answer, lang),
    );
  }

  private streamReply(msg: Extract<TivaReply, { kind: 'answer' | 'outline' }>, full: string): void {
    this.stop();
    this.push(msg);
    this.busy.set(true);
    const instant = !this.browser || matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.stream = this.qa.stream(full, { instant }).subscribe({
      next: (chunk) => {
        const current = this.messages().find((m) => m.id === msg.id);
        const partial = current && 'partial' in current ? current.partial : '';
        this.patch(msg.id, { status: 'streaming', partial: partial + chunk });
      },
      complete: () => {
        this.patch(msg.id, { status: 'done', partial: '' });
        this.busy.set(false);
        this.save();
      },
    });
  }

  private push(m: ChatMessage): void {
    this.messages.update((list) => [...list, m]);
    this.save();
  }

  private patch(id: number, patch: { status?: ReplyStatus; partial?: string }): void {
    this.messages.update((list) =>
      list.map((m) =>
        m.id === id && m.role === 'tiva' && m.kind !== 'fallback' ? { ...m, ...patch } : m,
      ),
    );
  }

  private save(): void {
    const messages = this.messages().map((m) =>
      m.role === 'tiva' && m.kind !== 'fallback' ? { ...m, partial: '' } : m,
    );
    this.storage.set(KEY, { messages, idea: this.idea() } satisfies Stored);
  }
}
