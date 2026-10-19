import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The signature four-colour rule: green, black, yellow, red. */
@Component({
  selector: 'im-flag-stripe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="seg" style="background:#007168; flex-grow: 5"></span>
    <span class="seg" style="background:#111111; flex-grow: 2"></span>
    <span class="seg" style="background:#FCE100; flex-grow: 2"></span>
    <span class="seg" style="background:#D21034; flex-grow: 1"></span>
  `,
  host: { 'aria-hidden': 'true', '[style.height.px]': 'height()' },
  styles: `
    :host {
      display: flex;
      width: 100%;
    }
    .seg {
      display: block;
      flex-basis: 0;
      height: 100%;
    }
  `,
})
export class FlagStripe {
  readonly height = input(4);
}
