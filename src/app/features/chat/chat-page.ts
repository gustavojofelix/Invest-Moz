import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { BrandMark } from '@core/layout/brand-mark';
import { FlagStripe } from '@core/layout/flag-stripe';
import { LanguageSwitcher } from '@core/layout/language-switcher';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { ROADMAP_STEP_IDS } from '@core/domain/roadmap-steps';
import { pickText } from '@core/domain/text';
import type { QaAnswer, TopicId } from '@core/domain/types';
import { LocPipe } from '@core/i18n/format';
import { INTL_LOCALE } from '@core/i18n/locales';
import { LocaleService } from '@core/i18n/locale.service';
import { ProjectRepository } from '@core/ports';
import type { QaData } from '@features/qa/qa-data.resolver';
import { Icon } from '@shared/ui/icon';
import { RefTag } from '@shared/ui/ref-tag';
import { RichText } from '@shared/ui/rich-text';
import { ChatSession, type ChatMessage } from './chat-session';

/** Minimal typing for the Web Speech API (not in the TypeScript DOM lib everywhere). */
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

/** 5 · Chat with Tiva: reviewed answers with legal sources, roadmap card and expert handoff. */
@Component({
  selector: 'im-chat-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Icon,
    RouterLink,
    TranslocoDirective,
    LocPipe,
    BrandMark,
    FlagStripe,
    LanguageSwitcher,
    RefTag,
    RichText,
  ],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css',
})
export class ChatPage {
  /** Resolved by qaDataResolver (bound through withComponentInputBinding). */
  readonly qaData = input<QaData>();
  /** `?q=`: the visitor's first message (from the landing idea box or "Ask Tiva" links). */
  readonly q = input<string>();
  private readonly projects = inject(ProjectRepository);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly session = inject(ChatSession);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly draft = signal('');
  protected readonly topic = signal<TopicId | null>(null);
  protected readonly listening = signal(false);
  protected readonly voiceError = signal(false);
  protected readonly stepCount = ROADMAP_STEP_IDS.length;
  protected readonly starters = ['investment-1', 'companies-1', 'incentives-4', 'immigration-1'];
  protected readonly outlineRefs = this.session.outlineRefs();
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');
  private recognition: Recognition | null = null;

  protected readonly speech: RecognitionCtor | null = (() => {
    if (!this.browser) return null;
    const w = window as unknown as {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  })();

  protected readonly project = resource({
    params: () => this.projects.currentRef(),
    loader: async ({ params: ref }) => {
      const p = ref ? await this.projects.get(ref) : null;
      // Answers re-render with the project (country, province, vehicle) in context.
      await this.session.setProject(p);
      return p;
    },
  });

  protected readonly answers = computed(() => this.qaData()?.answers ?? []);
  protected readonly topics = computed(() => this.qaData()?.topics ?? []);
  protected readonly topicQuestions = computed(() => {
    const id = this.topic();
    return id ? this.answers().filter((a) => a.topic === id) : [];
  });

  /** Index of the first finished Tiva reply: the roadmap card goes right after it. */
  protected readonly firstReplyId = computed(() => {
    const m = this.session
      .messages()
      .find((x) => x.role === 'tiva' && (x.kind === 'fallback' || x.status === 'done'));
    return m?.id ?? null;
  });
  protected readonly lastReply = computed(() => {
    const last = this.session.messages().at(-1);
    return last?.role === 'tiva' ? last : null;
  });
  /** Next-question shortcuts: other questions on the topic of the last answer. */
  protected readonly related = computed(() => {
    const last = this.lastReply();
    if (!last || last.kind !== 'answer' || last.status !== 'done') return [];
    const asked = new Set(
      this.session
        .messages()
        .flatMap((m) => (m.role === 'tiva' && m.kind === 'answer' ? [m.answerId] : [])),
    );
    const current = this.answers().find((a) => a.id === last.answerId);
    return this.answers()
      .filter((a) => a.topic === current?.topic && !asked.has(a.id))
      .slice(0, 2);
  });

  protected readonly pathfinderIdea = computed(() => this.session.idea() || null);

  constructor() {
    // `?q=` starts a new conversation once, then leaves the address clean.
    effect(() => {
      const q = this.q()?.trim();
      if (!q || !this.qaData()) return;
      untracked(() => {
        void this.session.start(q.slice(0, 500), this.lang());
        void this.router.navigate([], {
          queryParams: { q: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      });
    });
    // Keep the newest message in view while it streams.
    effect(() => {
      const list = this.session.messages();
      if (!this.browser || !list.length) return;
      queueMicrotask(() => {
        const el = this.host.nativeElement.querySelector<HTMLElement>('.thread > :last-child');
        el?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.recognition?.stop();
      this.session.stop();
    });
  }

  protected answerOf(id: string): QaAnswer | undefined {
    return this.session.answer(id, this.answers());
  }

  /** Finished answers follow the current language; streaming ones show progress. */
  protected replyText(m: ChatMessage, outline: string): string {
    if (m.role !== 'tiva' || m.kind === 'fallback') return '';
    if (m.status !== 'done') return m.partial;
    if (m.kind === 'outline') return outline;
    const a = this.answerOf(m.answerId);
    return a ? this.session.render(a, this.lang()) : '';
  }

  protected userText(m: ChatMessage): string {
    if (m.role !== 'user') return '';
    const a = m.answerId ? this.answerOf(m.answerId) : undefined;
    return a ? pickText(a.question, this.lang()) : m.text;
  }

  protected provinceName(code: keyof typeof PROVINCE_NAMES): string {
    return pickText(PROVINCE_NAMES[code], this.lang());
  }

  protected askAnswer(a: QaAnswer | string): void {
    if (this.session.busy()) return;
    this.topic.set(null);
    void this.session.ask({ answerId: typeof a === 'string' ? a : a.id }, this.lang());
  }

  protected toggleTopic(id: TopicId): void {
    this.topic.set(this.topic() === id ? null : id);
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    const text = this.draft().trim();
    if (!text || this.session.busy()) return;
    this.recognition?.stop();
    this.draft.set('');
    this.topic.set(null);
    void this.session.ask({ text: text.slice(0, 500) }, this.lang());
  }

  protected newConversation(): void {
    this.session.clear();
    this.topic.set(null);
    this.field()?.nativeElement.focus();
  }

  protected toggleVoice(): void {
    if (!this.speech) {
      this.voiceError.set(true);
      return;
    }
    if (this.listening()) {
      this.recognition?.stop();
      return;
    }
    const rec = new this.speech();
    rec.lang = INTL_LOCALE[this.lang()];
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      this.draft.set(Array.from(e.results, (r) => r[0].transcript).join(''));
    };
    rec.onend = () => {
      this.listening.set(false);
      this.field()?.nativeElement.focus();
    };
    rec.onerror = () => {
      this.listening.set(false);
      this.voiceError.set(true);
    };
    this.recognition = rec;
    this.voiceError.set(false);
    this.listening.set(true);
    try {
      rec.start();
    } catch {
      this.listening.set(false);
      this.voiceError.set(true);
    }
  }
}
