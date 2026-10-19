import { ChangeDetectionStrategy, Component, forwardRef, input, model, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { LucideCheck } from '@lucide/angular';

let nextId = 0;

/** A checkbox styled as a chip. Works standalone (`[(checked)]`) or with forms. */
@Component({
  selector: 'im-checkbox-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideCheck],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CheckboxChip), multi: true }],
  template: `
    <label class="chip" [class.on]="checked()" [class.disabled]="disabled()" [attr.for]="id">
      <input
        type="checkbox"
        class="sr-only"
        [id]="id"
        [checked]="checked()"
        [disabled]="disabled()"
        (change)="toggle($any($event.target).checked)"
        (blur)="onTouched()"
      />
      <span class="box" aria-hidden="true">
        @if (checked()) {
          <svg lucideCheck [size]="14" [strokeWidth]="2.5"></svg>
        }
      </span>
      <span>{{ label() }}</span>
    </label>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 2.75rem;
      padding: 0.375rem 0.875rem 0.375rem 0.625rem;
      border: 1px solid var(--rule-strong);
      border-radius: var(--radius);
      background: var(--paper);
      font-size: 0.9375rem;
      line-height: 1.3;
      cursor: pointer;
      user-select: none;
      transition:
        border-color 150ms,
        background-color 150ms;
    }
    .chip:hover {
      border-color: var(--ink);
    }
    .chip:has(input:focus-visible) {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
    .chip.on {
      border-color: var(--brand);
      background: var(--brand-tint);
    }
    .chip.disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .box {
      display: grid;
      place-items: center;
      width: 1.125rem;
      height: 1.125rem;
      border: 1px solid var(--muted);
      border-radius: 2px;
      background: var(--paper);
      flex-shrink: 0;
    }
    .on .box {
      background: var(--brand);
      border-color: var(--brand);
      color: var(--brand-ink);
    }
  `,
})
export class CheckboxChip implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly checked = model(false);
  protected readonly disabled = signal(false);
  protected readonly id = `im-chip-${nextId++}`;
  private onChange: (v: boolean) => void = () => undefined;
  protected onTouched: () => void = () => undefined;

  protected toggle(value: boolean): void {
    this.checked.set(value);
    this.onChange(value);
  }

  writeValue(value: boolean): void {
    this.checked.set(!!value);
  }
  registerOnChange(fn: (v: boolean) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }
}
