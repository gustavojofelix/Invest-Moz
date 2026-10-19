import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import type { Locale, Obligation } from '@core/domain/types';
import { ImDatePipe, LocPipe } from '@core/i18n/format';
import { ConfirmText } from './confirm-text';
import { RefTag } from './ref-tag';
import { Icon } from '@shared/ui/icon';

/** Recurring obligations with the next actual due date; shifted dates flagged. */
@Component({
  selector: 'im-obligation-calendar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TranslocoDirective, LocPipe, ImDatePipe, ConfirmText, RefTag],
  template: `
    <ul *transloco="let t" role="list" class="border-t border-rule">
      @for (o of obligations(); track o.id) {
        <li class="row avoid-break">
          <div class="date">
            @if (o.next.length) {
              @let first = o.next[0];
              <p class="font-serif text-3xl leading-none font-semibold">
                {{ first.date | imDate: lang() : 'day' }}
              </p>
              <p class="mt-1 text-xs font-bold uppercase tracking-wider">
                {{ first.date | imDate: lang() : 'monthYear' }}
              </p>
              <p class="text-xs text-muted">{{ first.date | imDate: lang() : 'weekday' }}</p>
              @if (first.shifted) {
                <p
                  class="shifted mt-1"
                  [attr.title]="
                    t('ui.calendar.shiftedHint', {
                      date: (first.nominal | imDate: lang() : 'long'),
                    })
                  "
                >
                  <svg imIcon="flag" [size]="12" aria-hidden="true"></svg
                  >{{ t('ui.calendar.shifted') }}
                </p>
              }
            } @else {
              <p class="text-sm font-bold text-muted">—</p>
            }
          </div>
          <div class="min-w-0">
            <p class="font-bold leading-snug">{{ o.title | loc: lang() }}</p>
            <p class="text-sm text-muted">{{ o.frequency | loc: lang() }}</p>
            @if (o.note) {
              <p class="mt-1 text-sm"><im-confirm-text [text]="o.note | loc: lang()" /></p>
            }
            @if (o.next.length > 1) {
              <p class="mt-1.5 text-xs text-muted">
                {{ t('ui.calendar.then') }}
                @for (d of o.next.slice(1); track d.date; let last = $last) {
                  <span
                    [class.font-bold]="d.shifted"
                    [attr.title]="
                      d.shifted
                        ? t('ui.calendar.shiftedHint', {
                            date: (d.nominal | imDate: lang() : 'long'),
                          })
                        : null
                    "
                    >{{ d.date | imDate: lang() : 'medium' }}
                    @if (d.shifted) {
                      <span aria-hidden="true"> ⚑</span
                      ><span class="sr-only"> ({{ t('ui.calendar.shifted') }})</span>
                    }
                  </span>
                  @if (!last) {
                    <span>, </span>
                  }
                }
              </p>
            }
            <p class="mt-1.5 flex flex-wrap gap-1.5">
              @for (r of o.refs; track r) {
                <im-ref-tag [refId]="r" />
              }
            </p>
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    .row {
      display: grid;
      grid-template-columns: 6.5rem 1fr;
      gap: 1rem;
      padding: 1rem 0;
      border-bottom: 1px solid var(--rule);
    }
    .shifted {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0 0.375rem;
      border-radius: 2px;
      background: var(--highlight-tint);
      box-shadow: inset 0 -2px 0 var(--highlight);
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
  `,
})
export class ObligationCalendar {
  readonly obligations = input.required<Obligation[]>();
  readonly lang = input.required<Locale>();
}
