import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Loading placeholder: `lines` text bars, or one block of `height`. */
@Component({
  selector: 'im-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (height()) {
      <span class="bar block" [style.height]="height()"></span>
    } @else {
      @for (w of widths(); track $index) {
        <span class="bar line" [style.width]="w"></span>
      }
    }
  `,
  host: { 'aria-hidden': 'true', class: 'block' },
  styles: `
    .bar {
      display: block;
      border-radius: 2px;
      background: linear-gradient(90deg, var(--panel) 0%, var(--rule) 50%, var(--panel) 100%);
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    .line {
      height: 0.875rem;
    }
    .line + .line {
      margin-top: 0.625rem;
    }
    @keyframes shimmer {
      from {
        background-position: 100% 0;
      }
      to {
        background-position: -100% 0;
      }
    }
  `,
})
export class Skeleton {
  readonly lines = input(3);
  readonly height = input('');
  protected readonly widths = computed(() =>
    Array.from({ length: this.lines() }, (_, i) => (i === this.lines() - 1 ? '62%' : `${96 - (i % 3) * 7}%`)),
  );
}
