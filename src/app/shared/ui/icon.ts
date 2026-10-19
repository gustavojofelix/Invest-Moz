import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS } from './icons.data';

/**
 * Lucide icon (outline, stroke 1.5 by default). Usage:
 * `<svg imIcon="arrow-right" [size]="18" aria-hidden="true"></svg>`
 */
@Component({
  // Attribute component on <svg>, like Lucide's own API; prefixed via the attribute.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'svg[imIcon]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (n of nodes(); track $index) {
      @switch (n[0]) {
        @case ('path') {
          <svg:path [attr.d]="n[1]['d']" />
        }
        @case ('circle') {
          <svg:circle [attr.cx]="n[1]['cx']" [attr.cy]="n[1]['cy']" [attr.r]="n[1]['r']" />
        }
        @case ('rect') {
          <svg:rect
            [attr.x]="n[1]['x']"
            [attr.y]="n[1]['y']"
            [attr.width]="n[1]['width']"
            [attr.height]="n[1]['height']"
            [attr.rx]="n[1]['rx']"
            [attr.ry]="n[1]['ry']"
          />
        }
        @case ('line') {
          <svg:line
            [attr.x1]="n[1]['x1']"
            [attr.y1]="n[1]['y1']"
            [attr.x2]="n[1]['x2']"
            [attr.y2]="n[1]['y2']"
          />
        }
        @case ('polyline') {
          <svg:polyline [attr.points]="n[1]['points']" />
        }
      }
    }
  `,
  host: {
    class: 'lucide',
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    '[attr.width]': 'size()',
    '[attr.height]': 'size()',
    '[attr.stroke-width]': 'strokeWidth()',
    focusable: 'false',
  },
})
export class Icon {
  readonly imIcon = input.required<string>();
  readonly size = input<number | string>(20);
  readonly strokeWidth = input<number | string>(1.5);
  protected readonly nodes = computed(() => ICONS[this.imIcon()] ?? []);
}
