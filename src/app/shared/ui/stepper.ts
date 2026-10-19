import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideCheck } from '@lucide/angular';

/**
 * Vertical checklist with ticks appearing in sequence. `done` is the number of
 * completed steps; the next one is shown as in progress.
 */
@Component({
  selector: 'im-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideCheck],
  template: `
    <ol role="list" class="space-y-1">
      @for (s of steps(); track s; let i = $index) {
        <li class="item" [class.done]="i < done()" [class.active]="i === done()" [attr.aria-current]="i === done() ? 'step' : null">
          <span class="mark" aria-hidden="true">
            @if (i < done()) {
              <svg lucideCheck [size]="14" [strokeWidth]="2.5"></svg>
            }
          </span>
          <span>{{ s }}</span>
          @if (i < done()) {
            <span class="sr-only"> — {{ doneLabel() }}</span>
          }
        </li>
      }
    </ol>
  `,
  styles: `
    .item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-height: 2.5rem;
      color: var(--muted);
      transition: color 180ms;
    }
    .item.done,
    .item.active {
      color: var(--ink);
    }
    .mark {
      display: grid;
      place-items: center;
      width: 1.375rem;
      height: 1.375rem;
      border: 1px solid var(--rule-strong);
      border-radius: 9999px;
      flex-shrink: 0;
      transition:
        background-color 180ms,
        border-color 180ms;
    }
    .active .mark {
      border-color: var(--brand);
      border-top-color: transparent;
      animation: spin 800ms linear infinite;
    }
    .done .mark {
      background: var(--brand);
      border-color: var(--brand);
      color: var(--brand-ink);
      animation: pop 180ms var(--ease-out-soft);
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @keyframes pop {
      from {
        transform: scale(0.6);
      }
    }
  `,
})
export class Stepper {
  readonly steps = input.required<string[]>();
  readonly done = input(0);
  readonly doneLabel = input('');
}
