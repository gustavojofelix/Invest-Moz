import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { RefTag } from './ref-tag';
import { RichText } from './rich-text';

/**
 * One assistant answer, always in the same structure: direct answer and key
 * conditions (rich text with inline references), the list of references,
 * the disclaimer and a closing "Quando falar connosco" block.
 */
@Component({
  selector: 'im-answer-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, RichText, RefTag],
  template: `
    <article *transloco="let t" class="answer" [attr.aria-busy]="streaming()">
      @if (question()) {
        <p class="label-caps text-muted">{{ t('ui.answer.question') }}</p>
        <h3 class="mt-1 font-serif text-xl leading-snug">{{ question() }}</h3>
      }

      <div class="mt-4 text-[1.0625rem] leading-relaxed" [class.streaming]="streaming()">
        @if (thinking()) {
          <p class="thinking text-muted" role="status">{{ t('ui.answer.analysing') }}</p>
        } @else {
          <im-rich-text [text]="text()" />
        }
      </div>

      @if (complete()) {
        @if (refs().length) {
          <div class="mt-5 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
            <span class="label-caps mr-1 text-muted">{{ t('ui.answer.sources') }}</span>
            @for (r of refs(); track r) {
              <im-ref-tag [refId]="r" />
            }
          </div>
        }
        <p class="mt-3 text-xs text-muted">{{ t('disclaimer') }}</p>

        @if (whenToTalk()) {
          <div class="talk mt-5">
            <div>
              <p class="label-caps text-accent">{{ t('ui.answer.whenToTalk') }}</p>
              <p class="mt-1">{{ whenToTalk() }}</p>
            </div>
            <button type="button" class="btn btn-primary shrink-0" (click)="contact.emit()">
              {{ t('ui.answer.talkCta') }}
            </button>
          </div>
        }
      }
    </article>
  `,
  styles: `
    .answer {
      padding: 1.25rem 0;
    }
    .talk {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem 1.125rem;
      background: var(--panel);
      border-left: 3px solid var(--accent);
    }
    @media (min-width: 640px) {
      .talk {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .streaming ::ng-deep im-rich-text > :last-child::after {
      content: '';
      display: inline-block;
      width: 0.5rem;
      height: 1em;
      margin-left: 2px;
      vertical-align: -0.12em;
      background: var(--brand);
      animation: blink 900ms steps(2, start) infinite;
    }
    .thinking::after {
      content: '…';
      animation: blink 900ms steps(2, start) infinite;
    }
    @keyframes blink {
      to {
        visibility: hidden;
      }
    }
  `,
})
export class AnswerBlock {
  readonly question = input('');
  readonly text = input('');
  readonly refs = input<string[]>([]);
  readonly whenToTalk = input('');
  readonly streaming = input(false);
  readonly thinking = input(false);
  readonly complete = input(true);
  readonly contact = output<void>();
}
