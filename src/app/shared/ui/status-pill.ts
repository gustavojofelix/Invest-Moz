import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import type { EnquiryStatus } from '@core/domain/types';

/** Enquiry status: Novo → Em análise → Proposta enviada → Ganho. */
@Component({
  selector: 'im-status-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  template: `<span *transloco="let t" class="pill" [attr.data-status]="status()"><span class="dot" aria-hidden="true"></span>{{
    t('ui.status.' + status())
  }}</span>`,
  styles: `
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.0625rem 0.5rem;
      border: 1px solid var(--rule-strong);
      border-radius: 2px;
      font-size: 0.8125rem;
      font-weight: 700;
      white-space: nowrap;
      background: var(--paper);
    }
    .dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 9999px;
      background: var(--muted);
    }
    [data-status='new'] .dot {
      background: var(--accent);
    }
    [data-status='in_review'] .dot {
      background: var(--highlight);
      box-shadow: 0 0 0 1px #b39f00;
    }
    [data-status='quoted'] .dot {
      background: var(--ink);
    }
    [data-status='won'] {
      border-color: var(--brand);
      color: var(--brand);
    }
    [data-status='won'] .dot {
      background: var(--brand);
    }
  `,
})
export class StatusPill {
  readonly status = input.required<EnquiryStatus>();
}
