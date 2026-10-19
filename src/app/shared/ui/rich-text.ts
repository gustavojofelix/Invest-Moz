import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { parseRich, type Block } from '@core/domain/richtext';
import { ConfirmChip } from './confirm-text';
import { RefTag } from './ref-tag';

/** Block-level renderer for the Markdown subset (paragraphs and bullets). */
@Component({
  selector: 'im-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, RefTag, ConfirmChip],
  template: `
    <ng-template #inlines let-items>
      @for (item of items; track $index) {
        @switch (item.t) {
          @case ('text') {
            @if (item.bold) {
              <strong>{{ item.v }}</strong>
            } @else {
              <ng-container>{{ item.v }}</ng-container>
            }
          }
          @case ('ref') {
            <im-ref-tag [refId]="item.id" />
          }
          @case ('confirm') {
            <im-confirm-chip [key]="item.key" />
          }
        }
      }
    </ng-template>

    @for (block of blocks(); track $index) {
      @if (block.type === 'p') {
        <p><ng-container *ngTemplateOutlet="inlines; context: { $implicit: block.inlines }" /></p>
      } @else {
        <ul>
          @for (item of block.items; track $index) {
            <li><ng-container *ngTemplateOutlet="inlines; context: { $implicit: item }" /></li>
          }
        </ul>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    p + p,
    p + ul,
    ul + p {
      margin-top: 0.75rem;
    }
    ul {
      margin-top: 0.5rem;
      padding-left: 0;
      list-style: none;
    }
    li {
      position: relative;
      padding-left: 1.25rem;
    }
    li + li {
      margin-top: 0.375rem;
    }
    li::before {
      content: '';
      position: absolute;
      left: 0.25rem;
      top: 0.7em;
      width: 0.4rem;
      height: 1px;
      background: var(--ink);
    }
  `,
})
export class RichText {
  readonly text = input('');
  protected readonly blocks = computed<Block[]>(() => parseRich(this.text()));
}
