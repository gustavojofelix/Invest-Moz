import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

const STAR = starPoints(4.4, 10, 2.7, 1.1);

/**
 * All brand marks live here so real logos can replace them in one place.
 *
 * - `wordmark`: flag glyph + "Invest Moz" set in the heading serif
 * - `flag`: simplified Mozambique flag (bands, hoist triangle, star)
 * - `ta` / `lts`: partner roundels (Tax Advisory red, LTS black)
 * - `partners`: both roundels side by side with names
 */
@Component({
  selector: 'im-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (variant()) {
      @case ('wordmark') {
        <span class="inline-flex items-center gap-2.5" [class.text-2xl]="size() === 'lg'">
          <ng-container *ngTemplateOutlet="flagTpl" />
          <span
            class="font-serif font-semibold tracking-tight text-ink"
            [class.text-xl]="size() === 'md'"
            [class.text-3xl]="size() === 'lg'"
            [class.text-lg]="size() === 'sm'"
            >Invest Moz</span
          >
        </span>
      }
      @case ('flag') {
        <ng-container *ngTemplateOutlet="flagTpl" />
      }
      @case ('ta') {
        <span class="roundel bg-accent" [style.--d]="diameter()" aria-hidden="true">TA</span>
      }
      @case ('lts') {
        <span class="roundel bg-flag-black" [style.--d]="diameter()" aria-hidden="true">LTS</span>
      }
      @case ('partners') {
        <span class="inline-flex flex-wrap items-center gap-x-5 gap-y-3">
          <span class="inline-flex items-center gap-2.5">
            <span class="roundel bg-accent" [style.--d]="diameter()" aria-hidden="true">TA</span>
            <span class="text-sm font-bold leading-tight">Tax Advisory</span>
          </span>
          <span class="text-muted" aria-hidden="true">×</span>
          <span class="inline-flex items-center gap-2.5">
            <span class="roundel bg-flag-black" [style.--d]="diameter()" aria-hidden="true"
              >LTS</span
            >
            <span class="text-sm font-bold leading-tight">Law Technology Solutions</span>
          </span>
        </span>
      }
    }

    <ng-template #flagTpl>
      <svg
        class="flag"
        viewBox="0 0 30 20"
        [attr.width]="flagWidth()"
        [attr.height]="flagWidth() * 0.6667"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="30" height="20" fill="#ffffff" />
        <rect width="30" height="6.2" fill="#007168" />
        <rect y="6.9" width="30" height="6.2" fill="#111111" />
        <rect y="13.8" width="30" height="6.2" fill="#FCE100" />
        <path d="M0 0 L12.5 10 L0 20 Z" fill="#D21034" />
        <polygon [attr.points]="star" fill="#FCE100" />
      </svg>
    </ng-template>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
    }
    .flag {
      display: block;
      border-radius: 1px;
      box-shadow: 0 0 0 1px var(--rule);
    }
    .roundel {
      --d: 36px;
      display: inline-grid;
      place-items: center;
      width: var(--d);
      height: var(--d);
      border-radius: 9999px;
      color: #fff;
      font-family: var(--font-serif);
      font-weight: 600;
      font-size: calc(var(--d) * 0.36);
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }
  `,
  imports: [NgTemplateOutlet],
})
export class BrandMark {
  readonly variant = input<'wordmark' | 'flag' | 'ta' | 'lts' | 'partners'>('wordmark');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  protected readonly star = STAR;
  protected readonly flagWidth = computed(() => ({ sm: 24, md: 28, lg: 40 })[this.size()]);
  protected readonly diameter = computed(
    () => ({ sm: '28px', md: '36px', lg: '48px' })[this.size()],
  );
}
