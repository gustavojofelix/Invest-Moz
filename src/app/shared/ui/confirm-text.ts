import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { parseInline, type Inline } from '@core/domain/richtext';
import { RefTag } from './ref-tag';

/** The visible "a confirmar" marker for an unconfirmed value. */
@Component({
  selector: 'im-confirm-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  template: `<span *transloco="let t" class="chip" [attr.title]="t('ui.toConfirmHint')" [attr.data-key]="key()">{{
    t('ui.toConfirm')
  }}</span>`,
  styles: `
    .chip {
      display: inline-block;
      padding: 0 0.375rem;
      border-radius: 2px;
      background: var(--highlight-tint);
      box-shadow: inset 0 -2px 0 var(--highlight);
      color: var(--ink);
      font-size: 0.85em;
      font-style: italic;
      font-weight: 700;
      line-height: 1.45;
      white-space: nowrap;
    }
  `,
})
export class ConfirmChip {
  readonly key = input('');
}

/**
 * Renders one run of text with inline markup: **bold**, [ref:id] tags and
 * {{TO_CONFIRM}} chips.
 */
@Component({
  selector: 'im-confirm-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmChip, RefTag],
  // Kept on one line: whitespace between inline items would show as stray spaces.
  template: `@for (item of inlines(); track $index) {@switch (item.t) {@case ('text') {@if (item.bold) {<strong>{{ item.v }}</strong>} @else {<ng-container>{{ item.v }}</ng-container>}}@case ('ref') {<im-ref-tag [refId]="item.id" />}@case ('confirm') {<im-confirm-chip [key]="item.key" />}}}`,
  host: { style: 'display: contents' },
})
export class ConfirmText {
  readonly text = input('');
  protected readonly inlines = computed<Inline[]>(() => parseInline(this.text()));
}
