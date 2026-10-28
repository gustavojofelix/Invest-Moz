import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { KnowledgeBase } from '@core/ports';
import { CitationService } from './citation.service';

/**
 * Mono legal reference tag, e.g. `Lei n.º 11/2009`. With `refId` it is a
 * button that opens the citation sheet; with only `label` it is static.
 * `variant="chip"` draws the rounded legal-source chip of the Tiva screens.
 */
@Component({
  selector: 'im-ref-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (refId()) {
      <button
        type="button"
        class="tag tag-btn"
        [class.as-chip]="variant() === 'chip'"
        (click)="open($event)"
        [attr.aria-label]="ariaLabel()"
      >
        {{ text() }}
      </button>
    } @else {
      <span class="tag" [class.as-chip]="variant() === 'chip'">{{ text() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      padding: 0.0625rem 0.375rem;
      border: 1px solid var(--rule-strong);
      border-radius: 2px;
      background: var(--paper);
      color: var(--ink);
      font-family: var(--font-mono);
      font-size: 0.78em;
      font-weight: 400;
      line-height: 1.5;
      letter-spacing: 0;
      white-space: nowrap;
      vertical-align: 0.06em;
    }
    .tag-btn {
      cursor: pointer;
      color: var(--brand);
      border-color: color-mix(in srgb, var(--brand) 45%, var(--rule));
      transition: background-color 150ms;
      /* invisible hit-area extension keeps the 44px target without bloating text */
      position: relative;
    }
    .tag-btn::after {
      content: '';
      position: absolute;
      inset: -10px -2px;
    }
    .tag-btn:hover {
      background: var(--brand-tint);
    }
    .tag.as-chip {
      padding: 0.3125rem 0.5625rem;
      border: 0;
      border-radius: var(--radius-sm);
      background: var(--brand-tint);
      color: var(--ok-ink);
      font-family: var(--font-sans);
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.3;
      vertical-align: baseline;
    }
    .tag-btn.as-chip::after {
      inset: -6px -2px;
    }
    .tag-btn.as-chip:hover {
      background: color-mix(in srgb, var(--brand) 18%, var(--brand-tint));
    }
  `,
})
export class RefTag {
  readonly refId = input<string>();
  readonly label = input<string>();
  readonly variant = input<'tag' | 'chip'>('tag');
  private readonly kb = inject(KnowledgeBase);
  private readonly citations = inject(CitationService);

  protected readonly text = computed(() => {
    const id = this.refId();
    if (this.label()) return this.label();
    this.kb.loaded();
    return (id && this.kb.lookup(id)?.instrument) || id || '';
  });

  protected readonly ariaLabel = computed(() => `${this.text()} — ${this.citations.openLabel()}`);

  protected open(event: Event): void {
    event.stopPropagation();
    const id = this.refId();
    if (id) this.citations.open(id);
  }
}
