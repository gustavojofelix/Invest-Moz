import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Calm empty state: hairline box, title, one line of text and an action. */
@Component({
  selector: 'im-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border border-dashed border-rule-strong px-6 py-10 text-center" role="status">
      <p class="label-caps text-muted">{{ eyebrow() }}</p>
      <p class="mt-2 font-serif text-xl">{{ heading() }}</p>
      @if (text()) {
        <p class="mx-auto mt-2 max-w-md text-muted">{{ text() }}</p>
      }
      <div class="mt-5 flex flex-wrap justify-center gap-3">
        <ng-content />
      </div>
    </div>
  `,
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly text = input('');
  readonly eyebrow = input('');
}
