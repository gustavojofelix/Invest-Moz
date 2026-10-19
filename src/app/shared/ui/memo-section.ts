import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';

/**
 * A numbered section of the advisory memo. Anchored (id) for the section
 * index; collapsible on mobile, always open from the md breakpoint and in print.
 */
@Component({
  selector: 'im-memo-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideChevronDown],
  template: `
    <section [attr.aria-labelledby]="anchor() + '-title'" class="border-t border-ink pt-5 pb-10">
      <div class="flex items-baseline gap-3">
        @if (number()) {
          <span class="font-mono text-sm text-muted" aria-hidden="true">{{ number() }}</span>
        }
        <div class="min-w-0 flex-1">
          @if (label()) {
            <p class="label-caps text-muted">{{ label() }}</p>
          }
          <h2 [id]="anchor() + '-title'" class="mt-1 text-xl sm:text-2xl">
            <button
              type="button"
              class="toggle"
              [attr.aria-expanded]="open()"
              [attr.aria-controls]="anchor() + '-body'"
              (click)="open.set(!open())"
            >
              <span>{{ heading() }}</span>
              <svg lucideChevronDown [size]="20" class="chev" [class.rotate-180]="open()" aria-hidden="true"></svg>
            </button>
            <span class="static-heading">{{ heading() }}</span>
          </h2>
        </div>
      </div>
      <div [id]="anchor() + '-body'" class="body mt-5" [class.collapsed]="!open()">
        <ng-content />
      </div>
    </section>
  `,
  host: { '[attr.id]': 'anchor()', class: 'block scroll-mt-24' },
  styles: `
    .toggle {
      display: flex;
      width: 100%;
      min-height: 2.75rem;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      text-align: left;
      font: inherit;
      color: inherit;
      background: none;
      border: 0;
      padding: 0;
    }
    .static-heading {
      display: none;
    }
    @media (min-width: 768px) {
      .toggle {
        display: none;
      }
      .static-heading {
        display: inline;
      }
    }
    @media print {
      .toggle {
        display: none;
      }
      .static-heading {
        display: inline;
      }
    }
    .chev {
      transition: transform 180ms;
      color: var(--muted);
    }
    .collapsed {
      display: none;
    }
    @media (min-width: 768px) {
      .collapsed {
        display: block;
      }
    }
    @media print {
      .collapsed {
        display: block !important;
      }
    }
  `,
})
export class MemoSection {
  readonly anchor = input.required<string>();
  readonly heading = input.required<string>();
  readonly label = input('');
  readonly number = input('');
  readonly open = signal(true);
}
