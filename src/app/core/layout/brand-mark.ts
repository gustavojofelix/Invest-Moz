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

const STAR = starPoints(4.6, 10, 2.6, 1.05);
let nextId = 0;

/**
 * All brand marks live here so real logos can replace them in one place.
 *
 * - `wordmark`: rounded flag glyph + "Tiva" set in Fraunces
 * - `flag`: the Mozambique flag glyph alone
 * - `lts` / `ta`: partner logos (the LTS logo has a white-text variant for deep-green surfaces)
 * - `partners`: "Technology" LTS + "Expert partner" Tax Advisory, as in the screen-pack footer
 *
 * `tone="dark"` is for use on the deep-green surfaces.
 */
@Component({
  selector: 'im-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    @switch (variant()) {
      @case ('wordmark') {
        <span class="inline-flex items-center gap-2.5">
          <ng-container *ngTemplateOutlet="flagTpl" />
          <span
            class="font-serif font-semibold tracking-tight"
            [class.text-xl]="size() === 'sm'"
            [class.text-2xl]="size() === 'md'"
            [class.text-4xl]="size() === 'lg'"
            >Tiva</span
          >
        </span>
      }
      @case ('flag') {
        <ng-container *ngTemplateOutlet="flagTpl" />
      }
      @case ('lts') {
        <img
          [src]="tone() === 'dark' ? 'brand/lts-on-dark.png' : 'brand/lts.png'"
          alt="Law Technology Solutions"
          [style.height.px]="logoHeight()"
          width="900"
          height="336"
          class="block w-auto"
          loading="lazy"
          decoding="async"
        />
      }
      @case ('ta') {
        <span class="ta-plate" [class.ta-plate--dark]="tone() === 'dark'">
          <img
            src="brand/tax-advisory.png"
            alt="Tax Advisory"
            [style.height.px]="logoHeight() * 1.3"
            width="900"
            height="612"
            class="block w-auto"
            loading="lazy"
            decoding="async"
          />
        </span>
      }
      @case ('partners') {
        <span class="inline-flex flex-wrap items-center gap-x-4 gap-y-3 text-sm">
          <span>{{ technologyLabel() }}</span>
          <img
            [src]="tone() === 'dark' ? 'brand/lts-on-dark.png' : 'brand/lts.png'"
            alt="Law Technology Solutions"
            [style.height.px]="logoHeight()"
            width="900"
            height="336"
            class="block w-auto"
            loading="lazy"
            decoding="async"
          />
          <span>{{ expertLabel() }}</span>
          <span class="ta-plate" [class.ta-plate--dark]="tone() === 'dark'">
            <img
              src="brand/tax-advisory.png"
              alt="Tax Advisory"
              [style.height.px]="logoHeight() * 1.3"
              width="900"
              height="612"
              class="block w-auto"
              loading="lazy"
              decoding="async"
            />
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
        <defs>
          <clipPath [attr.id]="clipId">
            <rect width="30" height="20" rx="3" />
          </clipPath>
        </defs>
        <g [attr.clip-path]="'url(#' + clipId + ')'">
          <rect width="30" height="6" fill="#007168" />
          <rect y="6" width="30" height="1" fill="#FFFFFF" />
          <rect y="7" width="30" height="6" fill="#000000" />
          <rect y="13" width="30" height="1" fill="#FFFFFF" />
          <rect y="14" width="30" height="6" fill="#FCE100" />
          <polygon points="0,0 12.6,10 0,20" fill="#D21034" />
          <polygon [attr.points]="star" fill="#FCE100" />
        </g>
        <rect
          x=".4"
          y=".4"
          width="29.2"
          height="19.2"
          rx="2.8"
          fill="none"
          stroke="#FFFFFF"
          stroke-opacity=".55"
          stroke-width=".8"
        />
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
      flex-shrink: 0;
    }
    .ta-plate {
      display: inline-flex;
    }
    /* The Tax Advisory logo is navy on transparent: it needs a white plate on dark surfaces. */
    .ta-plate--dark,
    :host-context([data-theme='dark']) .ta-plate {
      background: #fff;
      border-radius: 8px;
      padding: 6px 8px;
    }
  `,
})
export class BrandMark {
  readonly variant = input<'wordmark' | 'flag' | 'lts' | 'ta' | 'partners'>('wordmark');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly tone = input<'light' | 'dark'>('light');
  /** Labels for the `partners` variant (translated by the caller). */
  readonly technologyLabel = input('Technology');
  readonly expertLabel = input('Expert partner');

  protected readonly star = STAR;
  protected readonly clipId = `im-flag-${nextId++}`;
  protected readonly flagWidth = computed(() => ({ sm: 36, md: 44, lg: 56 })[this.size()]);
  protected readonly logoHeight = computed(() => ({ sm: 24, md: 30, lg: 40 })[this.size()]);
}
