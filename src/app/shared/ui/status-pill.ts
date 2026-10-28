import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import type { EnquiryStatus } from '@core/domain/types';

/** Lead status (Tiva status tags): New → In review → Proposal sent → Won. */
@Component({
  selector: 'im-status-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  template: `<span *transloco="let t" class="tag" [attr.data-status]="status()"
    ><span class="dot" aria-hidden="true"></span>{{ t('ui.status.' + status()) }}</span
  >`,
  styles: `
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.1875rem 0.625rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1.4;
      white-space: nowrap;
      background: var(--neutral-bg);
      color: var(--neutral-ink);
    }
    .dot {
      width: 0.4375rem;
      height: 0.4375rem;
      border-radius: 9999px;
      background: currentColor;
    }
    [data-status='new'] {
      background: var(--bad-bg);
      color: var(--bad-ink);
    }
    [data-status='in_review'] {
      background: var(--warn-bg);
      color: var(--warn-ink);
    }
    [data-status='won'] {
      background: var(--ok-bg);
      color: var(--ok-ink);
    }
  `,
})
export class StatusPill {
  readonly status = input.required<EnquiryStatus>();
}
