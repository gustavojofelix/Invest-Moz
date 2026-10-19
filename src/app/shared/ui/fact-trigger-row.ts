import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { LucideArrowRight } from '@lucide/angular';
import type { Locale, TriggerResult } from '@core/domain/types';
import { LocPipe } from '@core/i18n/format';
import { ConfirmText } from './confirm-text';
import { RefTag } from './ref-tag';

/** "Fact of the project → what changes", with the supporting references. */
@Component({
  selector: 'im-fact-trigger-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, LocPipe, ConfirmText, RefTag, LucideArrowRight],
  template: `
    <div *transloco="let t" class="row avoid-break" [class.attention]="trigger().severity === 'attention'">
      <div class="fact">
        <p class="label-caps text-[0.6875rem] text-muted">{{ t('ui.trigger.fact') }}</p>
        <p class="mt-1 font-bold leading-snug">{{ trigger().fact | loc: lang() }}</p>
      </div>
      <svg lucideArrowRight [size]="18" class="arrow hidden text-muted sm:block" aria-hidden="true"></svg>
      <div class="min-w-0">
        <p class="label-caps text-[0.6875rem]" [class.text-accent]="trigger().severity === 'attention'" [class.text-brand]="trigger().severity === 'info'">
          {{ t(trigger().severity === 'attention' ? 'ui.trigger.attention' : 'ui.trigger.info') }}
        </p>
        <p class="mt-1"><im-confirm-text [text]="trigger().text | loc: lang()" /></p>
        <p class="mt-2 flex flex-wrap gap-1.5">
          @for (r of trigger().refs; track r) {
            <im-ref-tag [refId]="r" />
          }
        </p>
      </div>
    </div>
  `,
  styles: `
    .row {
      display: grid;
      gap: 0.75rem;
      padding: 1rem 0 1rem 1rem;
      border-bottom: 1px solid var(--rule);
      border-left: 3px solid var(--brand);
    }
    .row.attention {
      border-left-color: var(--accent);
    }
    @media (min-width: 640px) {
      .row {
        grid-template-columns: minmax(10rem, 0.8fr) auto 2fr;
        align-items: start;
        gap: 1.25rem;
      }
      .arrow {
        margin-top: 1.4rem;
      }
    }
  `,
})
export class FactTriggerRow {
  readonly trigger = input.required<TriggerResult>();
  readonly lang = input.required<Locale>();
}
