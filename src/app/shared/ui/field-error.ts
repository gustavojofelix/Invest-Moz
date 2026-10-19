import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import type { AbstractControl } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { LucideCircleAlert } from '@lucide/angular';
import type { Subscription } from 'rxjs';

/**
 * Translated validation message for a control. Shown once the control was
 * touched or the form submitted. Keys: `forms.<errorName>` in the global file.
 */
@Component({
  selector: 'im-field-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, LucideCircleAlert],
  template: `
    @if (message(); as m) {
      <p *transloco="let t" class="field-error" [id]="errorId()">
        <svg lucideCircleAlert [size]="16" class="mt-0.5" aria-hidden="true"></svg>
        <span>{{ t('forms.' + m.key, m.params) }}</span>
      </p>
    }
  `,
})
export class FieldError {
  readonly control = input.required<AbstractControl>();
  readonly submitted = input(false);
  readonly errorId = input('');
  /** Override the message key for a given error, e.g. { min: 'workersMin' }. */
  readonly keys = input<Record<string, string>>({});
  private readonly version = signal(0);

  constructor() {
    let sub: Subscription | undefined;
    effect(() => {
      sub?.unsubscribe();
      sub = this.control().events.subscribe(() => this.version.update((v) => v + 1));
    });
    inject(DestroyRef).onDestroy(() => sub?.unsubscribe());
  }

  protected readonly message = computed(() => {
    this.version();
    const c = this.control();
    if (!c.errors || !(c.touched || this.submitted())) return null;
    const [name, detail] = Object.entries(c.errors)[0] as [string, Record<string, unknown> | boolean];
    const params: Record<string, unknown> = {};
    if (detail && typeof detail === 'object') {
      if ('min' in detail) params['min'] = detail['min'];
      if ('max' in detail) params['max'] = detail['max'];
      if ('requiredLength' in detail) params['length'] = detail['requiredLength'];
    }
    return { key: this.keys()[name] ?? name, params };
  });
}
