import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Uppercase tracked label: "FICHA DE ENQUADRAMENTO", "RECOMENDADO", "INDICATIVO". */
@Component({
  selector: 'im-section-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  host: {
    class: 'label-caps',
    '[class.plain]': "tone() === 'muted'",
    '[class.brand]': "tone() === 'brand'",
    '[class.accent]': "tone() === 'accent'",
    '[class.boxed]':
      "tone() === 'boxed-brand' || tone() === 'boxed-accent' || tone() === 'boxed-highlight'",
    '[class.boxed-brand]': "tone() === 'boxed-brand'",
    '[class.boxed-accent]': "tone() === 'boxed-accent'",
    '[class.boxed-highlight]': "tone() === 'boxed-highlight'",
  },
  styles: `
    :host {
      display: inline-block;
      color: var(--muted);
    }
    :host(.brand) {
      color: var(--brand);
    }
    :host(.accent) {
      color: var(--accent);
    }
    :host(.boxed) {
      padding: 0.125rem 0.5rem;
      border-radius: 2px;
      font-size: 0.6875rem;
    }
    :host(.boxed-brand) {
      background: var(--brand);
      color: var(--brand-ink);
    }
    :host(.boxed-accent) {
      background: var(--accent);
      color: var(--accent-ink);
    }
    :host(.boxed-highlight) {
      background: var(--highlight);
      color: var(--highlight-ink);
    }
  `,
})
export class SectionLabel {
  readonly tone = input<
    'muted' | 'brand' | 'accent' | 'boxed-brand' | 'boxed-accent' | 'boxed-highlight'
  >('muted');
}
