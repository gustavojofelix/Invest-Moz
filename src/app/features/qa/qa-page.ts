import {
  ChangeDetectionStrategy,
  Component,
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
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LucideArrowUp, LucideFolderOpen, LucideRotateCcw, LucideSquare } from '@lucide/angular';
import { TOPICS, type QaAnswer, type TopicId } from '@core/domain/types';
import { LocPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { SeoService } from '@core/layout/seo.service';
import { ProjectRepository, QaService } from '@core/ports';
import { AnswerBlock } from '@shared/ui/answer-block';
import { RefTag } from '@shared/ui/ref-tag';
import { SectionLabel } from '@shared/ui/section-label';
import { Skeleton } from '@shared/ui/skeleton';
import { QaConversation, type QaEntry } from './qa-conversation';

@Component({
  selector: 'im-qa-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TranslocoDirective,
    LocPipe,
    AnswerBlock,
    RefTag,
    SectionLabel,
    Skeleton,
    LucideArrowUp,
    LucideSquare,
    LucideRotateCcw,
    LucideFolderOpen,
  ],
  templateUrl: './qa-page.html',
  styleUrl: './qa-page.css',
})
export class QaPage {
  readonly topic = input<string>();
  private readonly qa = inject(QaService);
  private readonly projects = inject(ProjectRepository);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly conversation = inject(QaConversation);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly locale = inject(LocaleService);
  protected readonly draft = signal('');
  private readonly thread = viewChild<ElementRef<HTMLElement>>('thread');
  private readonly field = viewChild<ElementRef<HTMLTextAreaElement>>('field');

  protected readonly topics = resource({ loader: () => this.qa.topics() });
  protected readonly answers = resource({ loader: () => this.qa.answers() });
  protected readonly project = resource({
    params: () => this.projects.currentRef(),
    loader: async ({ params: ref }) => {
      const p = ref ? await this.projects.get(ref) : null;
      await this.conversation.setProject(p);
      return p;
    },
  });

  protected readonly activeTopic = computed<TopicId>(() => {
    const t = this.topic();
    return (TOPICS as readonly string[]).includes(t ?? '') ? (t as TopicId) : 'companies';
  });
  protected readonly topicDef = computed(() => this.topics.value()?.find((t) => t.id === this.activeTopic()));
  protected readonly suggestions = computed(() =>
    (this.answers.value() ?? []).filter((a) => a.topic === this.activeTopic()),
  );

  constructor() {
    effect(() => {
      const def = this.topicDef();
      const l = this.lang();
      if (def && this.topic()) untracked(() => this.seo.setTitle(def.label[l]));
    });
    // Keep the newest answer in view while it streams.
    effect(() => {
      const entries = this.conversation.entries();
      if (!this.browser || !entries.length) return;
      queueMicrotask(() => {
        const el = this.thread()?.nativeElement.lastElementChild as HTMLElement | null;
        el?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      });
    });
  }

  protected askSuggested(a: QaAnswer): void {
    void this.conversation.ask({ answerId: a.id }, this.lang());
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    const text = this.draft().trim();
    if (!text || this.conversation.busy()) return;
    this.draft.set('');
    void this.conversation.ask({ text }, this.lang());
  }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) this.submit(e);
  }

  protected newConversation(): void {
    this.conversation.clear();
    this.field()?.nativeElement.focus();
  }

  protected contact(): void {
    void this.router.navigate(['/', this.lang(), 'contact']);
  }

  protected entryText(e: QaEntry): string {
    if (!e.answer) return '';
    // Finished answers follow the current language; streaming ones show progress.
    return e.status === 'done' ? this.conversation.render(e.answer, this.lang()) : e.partial;
  }

  protected entryQuestion(e: QaEntry): string {
    return e.asked || (e.answer ? e.answer.question[this.lang()] : '');
  }
}
