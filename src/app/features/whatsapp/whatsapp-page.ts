import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { renderTemplate } from '@core/domain/template';
import { pickText } from '@core/domain/text';
import type { QaAnswer } from '@core/domain/types';
import { INTL_LOCALE } from '@core/i18n/locales';
import { LocaleService } from '@core/i18n/locale.service';
import { BrandMark } from '@core/layout/brand-mark';
import { QaService } from '@core/ports';
import { Icon } from '@shared/ui/icon';
import { RefTag } from '@shared/ui/ref-tag';
import { RichText } from '@shared/ui/rich-text';

type Reply = 'steps' | 'cost' | 'expert';

interface Message {
  id: number;
  from: 'me' | 'tiva';
  kind: 'voice' | 'text' | 'typing';
  time: string;
  /** Plain or rich text (Markdown subset with [ref:id]). */
  text?: string;
  /** Static citation labels shown as chips (instruments not in the knowledge base). */
  labels?: string[];
  refs?: string[];
  /** Voice notes: transcript, length in seconds, playback state. */
  transcript?: string;
  seconds?: number;
  state?: 'idle' | 'playing' | 'done';
  progress?: number;
  replies?: Reply[];
  /** The screen-pack voice note, answered with the scripted e-BAU reply. */
  scripted?: boolean;
}

/** Bar heights of the voice-note waveform (as drawn in the screen pack). */
const WAVE = [6, 14, 20, 10, 16, 6, 12, 18, 8, 14, 6, 16, 10, 4, 12, 8, 4, 10, 4];

/**
 * Screen 17 · WhatsApp channel: the same concierge, shown as a WhatsApp-style
 * phone. Voice notes are "transcribed" and answered; answers after the first
 * come from the QaService answer bank with their legal references. Simulated:
 * nothing is sent anywhere.
 */
@Component({
  selector: 'im-whatsapp-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, TranslocoDirective, BrandMark, RefTag, RichText],
  template: `
    <ng-container *transloco="let t">
      <div class="page">
        <section class="phone" [attr.aria-label]="t('whatsapp.phoneLabel')">
          <header class="bar">
            <a class="back" [routerLink]="['/', lang()]" [attr.aria-label]="t('whatsapp.back')"
              ><svg imIcon="arrow-left" [size]="22" class="flip-rtl" aria-hidden="true"></svg
            ></a>
            <im-brand-mark variant="flag" size="sm" tone="dark" />
            <div class="min-w-0">
              <p class="flex items-center gap-1 text-base font-bold">
                Tiva
                <svg
                  imIcon="badge-check"
                  [size]="16"
                  class="text-highlight"
                  role="img"
                  [attr.aria-label]="t('whatsapp.verified')"
                ></svg>
              </p>
              <p class="text-xs text-on-deep-subtle">{{ t('whatsapp.verified') }}</p>
            </div>
          </header>

          <div
            class="log"
            #log
            role="log"
            aria-live="polite"
            [attr.aria-label]="t('whatsapp.logLabel')"
          >
            <p class="system">{{ t('whatsapp.today') }}</p>
            <p class="system note">
              <svg imIcon="wifi" [size]="14" aria-hidden="true"></svg>{{ t('whatsapp.lowData') }}
            </p>

            @for (m of messages(); track m.id) {
              @switch (m.kind) {
                @case ('voice') {
                  <div class="bubble me voice">
                    <button
                      type="button"
                      class="play"
                      (click)="play(m.id)"
                      [disabled]="m.state === 'playing'"
                      [attr.aria-label]="
                        m.state === 'playing'
                          ? t('whatsapp.playing')
                          : t('whatsapp.play', { seconds: m.seconds })
                      "
                    >
                      <svg
                        [imIcon]="m.state === 'playing' ? 'pause' : 'play'"
                        [size]="16"
                        aria-hidden="true"
                      ></svg>
                    </button>
                    <span class="wave" aria-hidden="true">
                      @for (h of wave; track $index) {
                        <span
                          [style.height.px]="h"
                          [class.on]="($index / wave.length) * 100 < (m.progress ?? 0)"
                        ></span>
                      }
                    </span>
                    <span class="text-xs text-ink-soft">{{ duration(m) }}</span>
                    <span class="time">{{ m.time }}</span>
                  </div>
                  @if (m.state === 'done') {
                    <p class="transcript">
                      {{ t('whatsapp.transcribed', { text: m.transcript }) }}
                    </p>
                  } @else if (m.state === 'idle') {
                    <p class="transcript">{{ t('whatsapp.tapToPlay') }}</p>
                  }
                }
                @case ('typing') {
                  <div class="bubble tiva typing" role="status">
                    <span class="sr-only">{{ t('whatsapp.typing') }}</span>
                    <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
                  </div>
                }
                @default {
                  <div class="bubble" [class.me]="m.from === 'me'" [class.tiva]="m.from === 'tiva'">
                    @if (m.from === 'tiva') {
                      <im-rich-text class="msg" [text]="m.text ?? ''" />
                    } @else {
                      <p>{{ m.text }}</p>
                    }
                    @if (m.labels?.length || m.refs?.length) {
                      <p class="mt-2 flex flex-wrap gap-1.5">
                        @for (l of m.labels; track l) {
                          <span class="chip">{{ l }}</span>
                        }
                        @for (r of m.refs; track r) {
                          <im-ref-tag [refId]="r" />
                        }
                      </p>
                    }
                    <span class="time">{{ m.time }}</span>
                  </div>
                  @if (m.replies?.length && $last) {
                    <div
                      class="replies"
                      role="group"
                      [attr.aria-label]="t('whatsapp.quickReplies')"
                    >
                      @for (r of m.replies; track r) {
                        @if (r === 'expert') {
                          <a
                            class="reply"
                            [routerLink]="['/', lang(), 'expert']"
                            [queryParams]="{ from: 'whatsapp' }"
                            >{{ t('whatsapp.replies.expert') }}</a
                          >
                        } @else {
                          <button
                            type="button"
                            class="reply"
                            (click)="quick(r)"
                            [disabled]="busy()"
                          >
                            {{ t('whatsapp.replies.' + r) }}
                          </button>
                        }
                      }
                    </div>
                  }
                }
              }
            }
          </div>

          <form class="composer" (submit)="send($event)">
            <label for="wa" class="sr-only">{{ t('whatsapp.message') }}</label>
            <input
              id="wa"
              type="text"
              autocomplete="off"
              [placeholder]="t('whatsapp.message')"
              [value]="draft()"
              (input)="draft.set($any($event.target).value)"
            />
            @if (draft().trim()) {
              <button
                type="submit"
                class="round"
                [attr.aria-label]="t('whatsapp.send')"
                [disabled]="busy()"
              >
                <svg imIcon="send" [size]="20" class="flip-rtl" aria-hidden="true"></svg>
              </button>
            } @else {
              <button
                type="button"
                class="round"
                (click)="recordVoice()"
                [attr.aria-label]="t('whatsapp.record')"
                [disabled]="busy()"
              >
                <svg imIcon="mic" [size]="20" aria-hidden="true"></svg>
              </button>
            }
          </form>
        </section>

        <section class="explainer" aria-labelledby="wa-title">
          <p class="eyebrow">{{ t('whatsapp.eyebrow') }}</p>
          <h1 id="wa-title" class="mt-1.5 text-3xl leading-tight sm:text-4xl">
            {{ t('whatsapp.title') }}
          </h1>
          <p class="mt-3 text-muted">{{ t('whatsapp.lead') }}</p>
          <ul class="mt-5 grid gap-3" role="list">
            @for (p of points; track p.key) {
              <li class="flex gap-3">
                <span class="point-icon" aria-hidden="true"
                  ><svg [imIcon]="p.icon" [size]="18"></svg
                ></span>
                <span class="text-sm">{{ t('whatsapp.points.' + p.key) }}</span>
              </li>
            }
          </ul>
          <div class="card mt-6 flex items-center gap-4 p-4">
            <div class="qr" role="img" [attr.aria-label]="t('whatsapp.qrLabel')">
              <svg imIcon="smartphone" [size]="28" aria-hidden="true"></svg>
              <span class="text-[0.625rem] font-bold">QR</span>
            </div>
            <div class="min-w-0">
              <p class="font-bold">{{ t('whatsapp.scan') }}</p>
              <p class="font-mono text-sm" dir="ltr">+258 [number]</p>
              <p class="mt-1 text-xs text-muted">{{ t('whatsapp.numberNote') }}</p>
            </div>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <a class="btn btn-primary" [routerLink]="['/', lang(), 'chat']">{{
              t('whatsapp.webChat')
            }}</a>
            <button type="button" class="btn btn-secondary" (click)="restart()">
              <svg imIcon="rotate-ccw" [size]="18" aria-hidden="true"></svg
              >{{ t('whatsapp.restart') }}
            </button>
          </div>
          <p class="mt-4 text-xs text-muted">{{ t('whatsapp.disclaimer') }}</p>
        </section>
      </div>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      background: var(--surface-alt);
    }
    .page {
      display: grid;
      gap: 2rem;
      justify-content: center;
      grid-template-columns: minmax(0, 30rem);
    }
    @media (min-width: 1024px) {
      .page {
        grid-template-columns: 26rem minmax(0, 30rem);
        align-items: center;
        gap: 4rem;
        min-height: 100dvh;
        padding: 2rem;
      }
    }
    .phone {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      min-height: 32rem;
      background: var(--panel);
      overflow: hidden;
    }
    @media (min-width: 1024px) {
      .phone {
        height: min(52.75rem, calc(100dvh - 4rem));
        border: 10px solid var(--ink);
        border-radius: 2.5rem;
        box-shadow: var(--shadow-overlay);
      }
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 1rem 0.75rem 0.75rem;
      background: var(--brand-deep);
      color: var(--on-deep);
    }
    .back {
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      color: inherit;
      border-radius: 999px;
    }
    .log {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      padding: 0.875rem 0.75rem;
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    .system {
      align-self: center;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.3125rem 0.625rem;
      border-radius: 0.5rem;
      background: var(--paper);
      color: var(--muted);
      font-size: 0.75rem;
      text-align: center;
    }
    .system.note {
      background: var(--highlight-tint);
      color: var(--warn-ink);
    }
    .bubble {
      position: relative;
      max-width: 88%;
      padding: 0.625rem 0.75rem 1.25rem;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .bubble.me {
      align-self: flex-end;
      border-radius: 12px 12px 4px 12px;
      background: var(--brand-tint);
    }
    .bubble.tiva {
      align-self: flex-start;
      border-radius: 12px 12px 12px 4px;
      background: var(--paper);
    }
    :host-context([dir='rtl']) .bubble.me {
      border-radius: 12px 12px 12px 4px;
    }
    :host-context([dir='rtl']) .bubble.tiva {
      border-radius: 12px 12px 4px 12px;
    }
    .time {
      position: absolute;
      inset-inline-end: 0.625rem;
      bottom: 0.25rem;
      color: var(--muted);
      font-size: 0.6875rem;
    }
    .voice {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      width: 15rem;
    }
    .play {
      flex: none;
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 999px;
      background: var(--brand);
      color: var(--brand-ink);
    }
    .wave {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 3px;
      height: 1.5rem;
    }
    .wave span {
      width: 3px;
      border-radius: 2px;
      background: var(--brand-line);
      opacity: 0.45;
    }
    .wave span.on {
      opacity: 1;
    }
    .transcript {
      align-self: flex-end;
      max-width: 88%;
      margin-top: -0.25rem;
      color: var(--muted);
      font-size: 0.75rem;
      text-align: end;
    }
    .replies {
      align-self: flex-start;
      display: grid;
      gap: 0.375rem;
      width: 88%;
    }
    .reply {
      display: grid;
      place-items: center;
      min-height: 2.75rem;
      padding: 0.5rem;
      border-radius: 10px;
      background: var(--paper);
      color: var(--brand);
      font: inherit;
      font-size: 0.875rem;
      font-weight: 700;
      text-decoration: none;
    }
    .reply:disabled {
      opacity: 0.6;
    }
    .dots {
      display: inline-flex;
      gap: 4px;
    }
    .dots i {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: var(--muted);
      animation: blink 1.2s infinite ease-in-out;
    }
    .dots i:nth-child(2) {
      animation-delay: 0.2s;
    }
    .dots i:nth-child(3) {
      animation-delay: 0.4s;
    }
    @keyframes blink {
      0%,
      80%,
      100% {
        opacity: 0.3;
      }
      40% {
        opacity: 1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .dots i {
        animation: none;
      }
    }
    .composer {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 0.625rem calc(1rem + env(safe-area-inset-bottom));
    }
    .composer input {
      flex: 1;
      min-width: 0;
      min-height: 3rem;
      padding: 0.75rem 1rem;
      border: 1px solid transparent;
      border-radius: 999px;
      background: var(--paper);
      color: var(--ink);
      font: inherit;
    }
    .composer input:focus-visible {
      outline: 2px solid var(--focus);
    }
    .round {
      flex: none;
      display: grid;
      place-items: center;
      width: 3rem;
      height: 3rem;
      border-radius: 999px;
      background: var(--brand);
      color: var(--brand-ink);
    }
    .round:disabled {
      opacity: 0.6;
    }
    .explainer {
      padding: 0 1rem 3rem;
    }
    @media (min-width: 1024px) {
      .explainer {
        padding: 0;
      }
    }
    .point-icon {
      flex: none;
      display: grid;
      place-items: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: var(--radius);
      background: var(--brand-tint);
      color: var(--brand);
    }
    .qr {
      flex: none;
      display: grid;
      place-items: center;
      width: 5.5rem;
      height: 5.5rem;
      border: 2px dashed var(--rule-strong);
      border-radius: var(--radius);
      color: var(--muted);
    }
    :host-context([dir='rtl']) .flip-rtl {
      transform: scaleX(-1);
    }
  `,
})
export class WhatsappPage {
  private readonly qa = inject(QaService);
  private readonly locale = inject(LocaleService);
  private readonly injector = inject(Injector);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly lang = this.locale.lang;
  protected readonly wave = WAVE;
  protected readonly points = [
    { key: 'voice', icon: 'mic' },
    { key: 'replies', icon: 'list-checks' },
    { key: 'cited', icon: 'scale' },
    { key: 'lowEnd', icon: 'wifi-off' },
    { key: 'expert', icon: 'handshake' },
  ];

  private readonly log = viewChild<ElementRef<HTMLElement>>('log');
  protected readonly messages = signal<Message[]>([]);
  protected readonly draft = signal('');
  protected readonly busy = signal(false);
  private readonly used = signal<Reply[]>([]);
  private seq = 0;
  private voiceCount = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private readonly reduced = computed(
    () => this.browser && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  constructor() {
    this.restart();
    inject(DestroyRef).onDestroy(() => this.clearTimers());
    effect(() => {
      this.messages();
      afterNextRender(
        () => {
          const el = this.log()?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        },
        { injector: this.injector },
      );
    });
  }

  protected restart(): void {
    this.clearTimers();
    this.busy.set(false);
    this.used.set([]);
    this.voiceCount = 0;
    this.messages.set([this.voiceNote(0)]);
  }

  protected duration(m: Message): string {
    const total = m.seconds ?? 0;
    const s = m.state === 'playing' ? Math.round((total * (m.progress ?? 0)) / 100) : total;
    return `0:${String(s).padStart(2, '0')}`;
  }

  /** Simulated playback, then the transcript, then Tiva's answer. */
  protected play(id: number): void {
    const m = this.messages().find((x) => x.id === id);
    if (!m || m.state === 'playing') return;
    const first = m.state === 'idle';
    this.patch(id, { state: 'playing', progress: 0 });
    const steps = this.reduced() ? 1 : 12;
    for (let i = 1; i <= steps; i++) {
      this.later(i * 180, () => this.patch(id, { progress: (i / steps) * 100 }));
    }
    this.later(steps * 180 + 100, () => {
      this.patch(id, { state: 'done', progress: 0 });
      if (first) void this.answerVoice(m);
    });
  }

  protected recordVoice(): void {
    if (this.busy()) return;
    const note = this.voiceNote(1 + (this.voiceCount % 2));
    this.messages.update((list) => [...list, note]);
    this.play(note.id);
  }

  protected send(event: Event): void {
    event.preventDefault();
    const text = this.draft().trim();
    if (!text || this.busy()) return;
    this.draft.set('');
    this.push({ from: 'me', kind: 'text', text });
    void this.answerQuestion(text);
  }

  protected quick(r: Reply): void {
    if (this.busy()) return;
    this.used.update((u) => [...u, r]);
    this.push({ from: 'me', kind: 'text', text: this.locale.t(`whatsapp.replies.${r}`) });
    if (r === 'steps') void this.answerQuestion('', 'companies-4');
    else this.respond({ text: this.locale.t('whatsapp.costAnswer') });
  }

  private voiceNote(n: number): Message {
    this.voiceCount++;
    return {
      id: ++this.seq,
      from: 'me',
      kind: 'voice',
      time: this.now(),
      transcript: this.locale.t(`whatsapp.voice${n}`),
      seconds: n === 0 ? 18 : 12,
      state: 'idle',
      progress: 0,
      scripted: n === 0,
    };
  }

  /** The first voice note gets the screen-pack answer; later ones go to the answer bank. */
  private async answerVoice(m: Message): Promise<void> {
    if (m.scripted) {
      this.respond({
        text: this.locale.t('whatsapp.voiceAnswer'),
        labels: ['Decreto n.º 40/2026'],
        refs: ['dec-41-2026'],
      });
      return;
    }
    await this.answerQuestion(m.transcript ?? '');
  }

  private async answerQuestion(text: string, answerId?: string): Promise<void> {
    this.busy.set(true);
    const lang = this.lang();
    let answer: QaAnswer | null = null;
    if (answerId) answer = (await this.qa.answers()).find((a) => a.id === answerId) ?? null;
    else answer = (await this.qa.match(text, lang)).answer;
    if (!answer) {
      this.respond({ text: this.locale.t('whatsapp.noAnswer') });
      return;
    }
    const body = renderTemplate(pickText(answer.body, lang), {}, { ctx: false });
    this.respond({ text: body, refs: answer.refs.slice(0, 3) });
  }

  /** Shows "typing…", then the answer with the quick replies not used yet. */
  private respond(msg: Pick<Message, 'text' | 'labels' | 'refs'>): void {
    this.busy.set(true);
    const typing = this.push({ from: 'tiva', kind: 'typing' });
    this.later(this.reduced() ? 0 : 900, () => {
      this.messages.update((list) => list.filter((x) => x.id !== typing.id));
      const replies = (['steps', 'cost', 'expert'] as Reply[]).filter(
        (r) => r === 'expert' || !this.used().includes(r),
      );
      this.push({ from: 'tiva', kind: 'text', ...msg, replies });
      this.busy.set(false);
    });
  }

  private push(m: Omit<Message, 'id' | 'time'>): Message {
    const full: Message = { ...m, id: ++this.seq, time: this.now() };
    this.messages.update((list) => [...list, full]);
    return full;
  }

  private patch(id: number, p: Partial<Message>): void {
    this.messages.update((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x)));
  }

  private later(ms: number, fn: () => void): void {
    if (!this.browser) return fn();
    this.timers.push(setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }

  private now(): string {
    return new Intl.DateTimeFormat(INTL_LOCALE[this.lang()], {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Maputo',
    }).format(new Date());
  }
}
