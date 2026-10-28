import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The Tiva flag band: green, white, black, white and yellow stripes with the
 * red hoist chevron, as in the screen pack.
 */
@Component({
  selector: 'im-flag-stripe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: { 'aria-hidden': 'true', '[style.height.px]': 'height()' },
  styles: `
    :host {
      display: block;
      width: 100%;
      background:
        linear-gradient(to bottom right, #d21034 50%, transparent 50%) 0 0 / 44px 50% no-repeat,
        linear-gradient(to top right, #d21034 50%, transparent 50%) 0 100% / 44px 50% no-repeat,
        linear-gradient(
          #007168 0 30%,
          #ffffff 30% 35%,
          #14171a 35% 65%,
          #ffffff 65% 70%,
          #fce100 70% 100%
        );
    }
    :host-context([dir='rtl']) {
      transform: scaleX(-1);
    }
  `,
})
export class FlagStripe {
  readonly height = input(14);
}
