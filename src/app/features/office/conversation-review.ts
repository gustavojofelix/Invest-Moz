import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { pickText } from '@core/domain/text';
import { ImDatePipe, LocPipe, NumberPipe } from '@core/i18n/format';
import { LOCALE_DIR, LOCALE_LABEL, isLocale } from '@core/i18n/locales';
import { LocaleService } from '@core/i18n/locale.service';
import { KnowledgeBase } from '@core/ports';
import { Icon } from '@shared/ui/icon';
import type { ReviewConversation } from './office-data';
import { ReviewStore, type ReviewAction } from './review-store';

const OTHER = '__other';

/** 20 · Conversation review: low-confidence answers corrected by a reviewer. */
@Component({
  selector: 'im-conversation-review-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslocoDirective, ImDatePipe, LocPipe, NumberPipe, Icon],
  styleUrl: './office.css',
  template: `
    <div *transloco="let t" class="office-page">
      <header class="flex flex-col gap-1.5">
        <h1 class="font-serif text-3xl font-medium sm:text-[2rem]">
          {{ t('office.review.title') }}
        </h1>
        <p class="text-[0.9375rem] text-muted">{{ t('office.review.intro') }}</p>
      </header>

      @if (selected(); as c) {
        <div class="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
          <!-- Conversation -->
          <section class="card flex flex-col gap-3.5 p-5 sm:p-6" aria-labelledby="conv-title">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 id="conv-title" class="text-[0.9375rem] font-bold">
                {{ t('office.review.chat', { id: c.chat }) }} · {{ language(c.locale) }} ·
                {{ t('office.channel.' + c.channel) }}
              </h2>
              <span class="flex flex-wrap gap-1.5">
                <span class="tag" [class]="reasonClass(c)">{{
                  t('office.review.reason.' + c.reason)
                }}</span>
                <span class="tag tag-neutral">
                  {{ t('office.review.confidence') }}
                  {{ c.confidence | num: lang() : { style: 'percent' } }}
                </span>
              </span>
            </div>

            <div class="bubble bubble--investor">
              <p [attr.lang]="c.locale" [attr.dir]="dir(c.locale)">{{ c.question }}</p>
              @if (c.locale !== lang()) {
                <p class="translation">
                  {{ t('office.review.translation', { lang: lang().toUpperCase() }) }}:
                  {{ c.questionTranslation | loc: lang() }}
                </p>
              }
            </div>
            <div class="bubble bubble--tiva">
              <p [attr.lang]="c.locale" [attr.dir]="dir(c.locale)">{{ c.answer }}</p>
              @if (c.locale !== lang()) {
                <p class="translation">
                  {{ t('office.review.translation', { lang: lang().toUpperCase() }) }}:
                  {{ c.answerTranslation | loc: lang() }}
                </p>
              }
              <p class="translation">{{ t('office.review.tivaAnswer') }}</p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span class="label-caps text-muted">{{ t('office.review.sources') }}</span>
              @for (r of c.refs; track r) {
                <span class="chip">{{ refLabel(r) }}</span>
              }
              @if (c.gap) {
                <span class="tag tag-warn"
                  >{{ t('office.review.gapTag') }}: {{ c.gap | loc: lang() }}</span
                >
              }
            </div>
            <p class="text-xs text-muted">
              {{ c.receivedAt | imDate: lang() : 'datetime' }} · {{ t('office.demoData') }}
            </p>
          </section>

          <!-- Reviewer action -->
          <section class="card flex flex-col gap-4 p-5 sm:p-6" aria-labelledby="action-title">
            <h2 id="action-title" class="text-lg font-bold">
              {{ t('office.review.actionTitle') }}
            </h2>
            @if (decisions()[c.id]; as d) {
              <div class="rounded-md bg-ok-bg p-4 text-sm text-ok-ink" role="status">
                <p class="font-bold">{{ t('office.review.done.' + d.action) }}</p>
                <p class="mt-1">{{ d.reviewer }} · {{ d.at | imDate: lang() : 'datetime' }}</p>
                @if (d.correction) {
                  <p class="mt-2 whitespace-pre-line">{{ d.correction }}</p>
                }
                @if (d.notify) {
                  <p class="mt-2">{{ t('office.review.notified') }}</p>
                }
              </div>
              <button
                type="button"
                class="btn btn-secondary btn-sm self-start"
                (click)="store.reopen(c.id)"
              >
                <svg imIcon="rotate-ccw" [size]="16" aria-hidden="true"></svg
                >{{ t('office.review.reopen') }}
              </button>
            } @else {
              <div>
                <label class="field-label" for="correction">{{
                  t('office.review.corrected')
                }}</label>
                <textarea
                  id="correction"
                  class="input"
                  rows="5"
                  [placeholder]="t('office.review.correctedPlaceholder')"
                  [ngModel]="correction()"
                  (ngModelChange)="correction.set($event)"
                ></textarea>
              </div>
              <div>
                <label class="field-label" for="gap">{{ t('office.review.gap') }}</label>
                <select
                  id="gap"
                  class="input"
                  [ngModel]="gapChoice()"
                  (ngModelChange)="gapChoice.set($event)"
                >
                  @if (c.gap) {
                    <option [value]="suggestedGap()">{{ suggestedGap() }}</option>
                  }
                  <option [value]="other">{{ t('office.review.gapOther') }}</option>
                  <option value="">{{ t('office.review.gapNone') }}</option>
                </select>
                @if (gapChoice() === other) {
                  <label class="sr-only" for="gap-other">{{ t('office.review.gapOther') }}</label>
                  <input
                    id="gap-other"
                    class="input mt-2"
                    [placeholder]="t('office.review.gapOtherPlaceholder')"
                    [ngModel]="gapOther()"
                    (ngModelChange)="gapOther.set($event)"
                  />
                }
              </div>
              <label class="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  class="size-5 accent-[var(--brand)]"
                  [ngModel]="notify()"
                  (ngModelChange)="notify.set($event)"
                />
                {{ t('office.review.notify') }}
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  [disabled]="!correction().trim()"
                  (click)="act(c, 'corrected')"
                >
                  {{ t('office.review.correct') }}
                </button>
                <button type="button" class="btn btn-outline btn-sm" (click)="act(c, 'approved')">
                  {{ t('office.review.approve') }}
                </button>
                <button type="button" class="btn btn-danger btn-sm" (click)="act(c, 'escalated')">
                  {{ t('office.review.escalate') }}
                </button>
              </div>
            }
            <p class="text-[0.78125rem] text-muted">{{ t('office.review.notifyNote') }}</p>
          </section>
        </div>
      }

      <p class="sr-only" aria-live="polite">{{ announce() }}</p>

      <!-- Queue -->
      <div class="card overflow-hidden">
        <div
          class="table-wrap"
          tabindex="0"
          role="region"
          [attr.aria-label]="t('office.review.queueTitle')"
        >
          <table class="office-table panel-table">
            <caption class="text-start">
              <span class="text-sm font-bold">{{ t('office.review.queueTitle') }}</span>
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t('office.review.col.chat') }}</th>
                <th scope="col">{{ t('office.review.col.language') }}</th>
                <th scope="col">{{ t('office.review.col.topic') }}</th>
                <th scope="col">{{ t('office.review.col.reason') }}</th>
                <th scope="col">{{ t('office.review.col.received') }}</th>
                <th scope="col">{{ t('office.review.col.status') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (c of store.conversations(); track c.id) {
                <tr [class.bg-brand-tint]="selected()?.id === c.id">
                  <th scope="row">
                    <button
                      type="button"
                      class="link min-h-11 font-bold"
                      [attr.aria-pressed]="selected()?.id === c.id"
                      (click)="select(c.id)"
                    >
                      {{ t('office.review.chat', { id: c.chat }) }}
                    </button>
                  </th>
                  <td [attr.lang]="c.locale">{{ language(c.locale) }}</td>
                  <td>{{ t('topics.' + c.topic) }}</td>
                  <td>
                    <span class="tag" [class]="reasonClass(c)">{{
                      t('office.review.reason.' + c.reason)
                    }}</span>
                  </td>
                  <td class="whitespace-nowrap">
                    {{ c.receivedAt | imDate: lang() : 'datetime' }}
                  </td>
                  <td>
                    @if (decisions()[c.id]; as d) {
                      <span class="tag tag-ok">{{ t('office.review.done.' + d.action) }}</span>
                    } @else {
                      <span class="tag tag-neutral">{{ t('office.review.open') }}</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Knowledge-base gaps -->
      <section class="card flex flex-col gap-3 p-5" aria-labelledby="gaps-title">
        <h2 id="gaps-title" class="text-lg font-bold">{{ t('office.review.gapsTitle') }}</h2>
        <p class="text-sm text-muted">{{ t('office.review.gapsIntro') }}</p>
        <ul role="list" class="flex flex-col divide-y divide-rule-soft">
          @for (g of store.gaps(); track g.at) {
            <li class="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span
                ><strong>{{ g.text }}</strong> · {{ t('topics.' + g.topic) }}</span
              >
              <span class="text-xs text-muted">{{ g.at | imDate: lang() : 'datetime' }}</span>
            </li>
          } @empty {
            <li class="py-2.5 text-sm text-muted">{{ t('office.review.gapsEmpty') }}</li>
          }
        </ul>
      </section>
    </div>
  `,
  styles: `
    .bubble {
      max-width: 86%;
      padding: 0.75rem 0.875rem;
      font-size: 0.90625rem;
      line-height: 1.5;
    }
    .bubble--investor {
      align-self: flex-end;
      background: var(--brand);
      color: var(--brand-ink);
      border-radius: 14px 14px 4px 14px;
    }
    .bubble--tiva {
      align-self: flex-start;
      background: var(--surface-alt);
      border: 1px solid var(--rule);
      border-radius: 14px 14px 14px 4px;
    }
    .translation {
      margin-top: 0.375rem;
      font-size: 0.78125rem;
      opacity: 0.85;
    }
  `,
})
export class ConversationReviewPage {
  protected readonly store = inject(ReviewStore);
  private readonly kb = inject(KnowledgeBase);
  private readonly locale = inject(LocaleService);
  protected readonly lang = this.locale.lang;
  protected readonly other = OTHER;

  private readonly selectedId = signal<string | null>(
    inject(ActivatedRoute).snapshot.queryParamMap.get('c'),
  );
  protected readonly correction = signal('');
  protected readonly gapChoice = signal('');
  protected readonly gapOther = signal('');
  protected readonly notify = signal(true);
  protected readonly announce = signal('');
  protected readonly decisions = this.store.decisions;

  protected readonly selected = computed<ReviewConversation | null>(() => {
    const all = this.store.conversations();
    return all.find((c) => c.id === this.selectedId()) ?? this.store.open()[0] ?? all[0] ?? null;
  });
  protected readonly suggestedGap = computed(() => pickText(this.selected()?.gap, this.lang()));

  constructor() {
    this.store.reload();
    void this.kb.all();
    // Reset the form when another conversation is selected.
    effect(() => {
      const c = this.selected();
      const gap = this.suggestedGap();
      untracked(() => {
        this.correction.set('');
        this.gapOther.set('');
        this.notify.set(true);
        this.gapChoice.set(c?.gap ? gap : '');
      });
    });
  }

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected act(c: ReviewConversation, action: ReviewAction): void {
    const gap = this.gapChoice() === OTHER ? this.gapOther() : this.gapChoice();
    if (gap.trim()) this.store.logGap(c, gap);
    this.store.decide(c, action, this.correction(), this.notify());
    this.announce.set(this.locale.t('office.review.done.' + action));
  }

  protected language(code: string): string {
    return isLocale(code) ? LOCALE_LABEL[code] : code;
  }

  protected dir(code: string): 'ltr' | 'rtl' {
    return isLocale(code) ? LOCALE_DIR[code] : 'ltr';
  }

  protected refLabel(id: string): string {
    return (this.kb.loaded() && this.kb.lookup(id)?.instrument) || id;
  }

  protected reasonClass(c: ReviewConversation): string {
    return c.reason === 'low_confidence' ? 'tag tag-bad' : 'tag tag-warn';
  }
}
