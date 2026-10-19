import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { LucideChevronDown } from '@lucide/angular';
import type { Country, Locale } from '@core/domain/types';
import { normalize } from '@core/domain/text';

let nextId = 0;

/**
 * Searchable country select (WAI-ARIA combobox with a listbox popup).
 * Value: ISO 3166-1 alpha-2 code.
 */
@Component({
  selector: 'im-country-combobox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideChevronDown],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CountryCombobox), multi: true }],
  host: { '(focusout)': 'onFocusOut($event)' },
  template: `
    <div class="relative">
      <input
        #field
        [id]="inputId()"
        type="text"
        class="input pr-10"
        role="combobox"
        autocomplete="off"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="listId"
        aria-autocomplete="list"
        [attr.aria-activedescendant]="open() && filtered().length ? optionId(activeIndex()) : null"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        [attr.aria-describedby]="describedBy() || null"
        [placeholder]="placeholder()"
        [value]="query()"
        [disabled]="disabled()"
        (input)="onInput($any($event.target).value)"
        (focus)="open.set(true)"
        (click)="open.set(true)"
        (keydown)="onKey($event)"
      />
      <svg lucideChevronDown [size]="16" class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" aria-hidden="true"></svg>
      @if (open()) {
        <ul [id]="listId" role="listbox" class="list" [attr.aria-label]="placeholder()">
          @for (c of filtered(); track c.code; let i = $index) {
            <!-- Combobox pattern: focus stays on the input; options are reached with the
                 arrow keys via aria-activedescendant, so the click is a pointer shortcut. -->
            <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
            <li
              [id]="optionId(i)"
              role="option"
              class="opt"
              [class.active]="i === activeIndex()"
              [attr.aria-selected]="c.code === value()"
              (mousedown)="$event.preventDefault()"
              (click)="choose(c)"
            >
              <span>{{ c.name[lang()] }}</span>
              @if (c.treaty) {
                <span class="treaty">{{ treatyLabel() }}</span>
              }
            </li>
          } @empty {
            <li class="px-3 py-2.5 text-sm text-muted" role="presentation">{{ emptyLabel() }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .list {
      position: absolute;
      z-index: 30;
      left: 0;
      right: 0;
      top: calc(100% + 4px);
      max-height: 16rem;
      overflow-y: auto;
      background: var(--paper);
      border: 1px solid var(--ink);
      border-radius: var(--radius);
      box-shadow: var(--shadow-overlay);
      padding: 0.25rem 0;
    }
    .opt {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      min-height: 2.75rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
    }
    .opt.active,
    .opt:hover {
      background: var(--panel);
    }
    .opt[aria-selected='true'] {
      font-weight: 700;
    }
    .treaty {
      font-size: 0.6875rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--brand);
    }
  `,
})
export class CountryCombobox implements ControlValueAccessor {
  readonly countries = input.required<Country[]>();
  readonly lang = input.required<Locale>();
  readonly inputId = input(`im-country-${nextId}`);
  readonly placeholder = input('');
  readonly emptyLabel = input('—');
  readonly treatyLabel = input('ADT');
  readonly invalid = input(false);
  readonly describedBy = input('');

  protected readonly listId = `im-country-list-${nextId++}`;
  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly value = signal<string>('');
  protected readonly disabled = signal(false);
  protected readonly activeIndex = signal(0);
  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private onChange: (v: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    effect(() => {
      this.countries();
      this.lang();
      untracked(() => this.refreshLabel());
    });
  }

  protected readonly filtered = computed(() => {
    const q = normalize(this.query());
    const lang = this.lang();
    const sorted = [...this.countries()].sort((a, b) => a.name[lang].localeCompare(b.name[lang], lang));
    const selected = sorted.find((c) => c.code === this.value());
    if (!q || (selected && selected.name[lang] === this.query())) return sorted;
    return sorted.filter((c) => normalize(c.name[lang]).includes(q) || c.code.toLowerCase() === q);
  });

  protected optionId(i: number): string {
    return `${this.listId}-${i}`;
  }

  protected onInput(text: string): void {
    this.query.set(text);
    this.open.set(true);
    this.activeIndex.set(0);
    if (this.value()) {
      this.value.set('');
      this.onChange('');
    }
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.filtered().length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.open.set(true);
        this.activeIndex.set(n ? (this.activeIndex() + 1) % n : 0);
        this.scrollActive();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.activeIndex.set(n ? (this.activeIndex() - 1 + n) % n : 0);
        this.scrollActive();
        break;
      case 'Enter':
        if (this.open() && n) {
          e.preventDefault();
          this.choose(this.filtered()[this.activeIndex()]);
        }
        break;
      case 'Escape':
        if (this.open()) {
          e.preventDefault();
          this.close();
        }
        break;
      case 'Tab':
        this.close();
        break;
    }
  }

  protected choose(c: Country): void {
    this.value.set(c.code);
    this.query.set(c.name[this.lang()]);
    this.onChange(c.code);
    this.onTouched();
    this.open.set(false);
    this.field().nativeElement.focus();
  }

  protected onFocusOut(e: FocusEvent): void {
    if (!this.host.nativeElement.contains(e.relatedTarget as Node | null)) this.close();
  }

  private close(): void {
    this.open.set(false);
    // Restore the label of the selected country (or clear an unmatched query).
    const selected = this.countries().find((c) => c.code === this.value());
    this.query.set(selected ? selected.name[this.lang()] : '');
    this.onTouched();
  }

  private scrollActive(): void {
    queueMicrotask(() =>
      this.host.nativeElement.querySelector(`#${this.optionId(this.activeIndex())}`)?.scrollIntoView({ block: 'nearest' }),
    );
  }

  writeValue(code: string | null): void {
    this.value.set(code ?? '');
    const c = this.countries().find((x) => x.code === code);
    this.query.set(c ? c.name[this.lang()] : '');
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.disabled.set(d);
  }

  /** Re-label after the language or the country list changes. */
  refreshLabel(): void {
    const c = this.countries().find((x) => x.code === this.value());
    if (c) this.query.set(c.name[this.lang()]);
  }
}
