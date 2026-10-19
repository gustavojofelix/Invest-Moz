import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ConfirmText } from './confirm-text';

export interface RuledColumn {
  key: string;
  label: string;
  /** Visually emphasise this column (e.g. the recommended option). */
  emphasis?: boolean;
}

/**
 * Hairline-ruled table. Rows stack into labelled blocks below 640px so the page
 * never scrolls horizontally. Cell text supports inline markup.
 */
@Component({
  selector: 'im-ruled-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmText],
  template: `
    <table class="w-full border-collapse text-left text-[0.9375rem]">
      @if (caption()) {
        <caption class="sr-only">{{ caption() }}</caption>
      }
      <thead>
        <tr>
          @for (col of columns(); track col.key) {
            <th scope="col" class="label-caps" [class.emph]="col.emphasis">{{ col.label }}</th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track $index) {
          <tr>
            @for (col of columns(); track col.key; let first = $first) {
              @if (first) {
                <th scope="row" [attr.data-label]="col.label">{{ row[col.key] }}</th>
              } @else {
                <td [attr.data-label]="col.label" [class.emph]="col.emphasis">
                  <im-confirm-text [text]="row[col.key]" />
                </td>
              }
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    :host {
      display: block;
    }
    th,
    td {
      padding: 0.75rem 0.75rem 0.75rem 0;
      vertical-align: top;
      border-bottom: 1px solid var(--rule);
    }
    thead th {
      border-bottom: 1px solid var(--ink);
      color: var(--muted);
      padding-top: 0;
    }
    tbody th {
      font-weight: 700;
      width: 26%;
    }
    .emph {
      background: color-mix(in srgb, var(--brand) 5%, transparent);
      padding-left: 0.75rem;
    }
    thead th.emph {
      color: var(--brand);
    }
    @media (max-width: 639px) {
      thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
      }
      tr {
        display: block;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--rule);
      }
      th,
      td {
        display: block;
        border: 0;
        padding: 0.125rem 0;
        width: auto;
      }
      tbody th {
        width: auto;
        margin-bottom: 0.25rem;
      }
      td::before {
        content: attr(data-label);
        display: block;
        font-size: 0.6875rem;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--muted);
        margin-top: 0.375rem;
      }
      .emph {
        padding-left: 0.5rem;
      }
    }
  `,
})
export class RuledTable {
  readonly columns = input.required<RuledColumn[]>();
  readonly rows = input.required<Record<string, string>[]>();
  readonly caption = input('');
}
