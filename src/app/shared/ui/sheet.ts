import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  type Injector,
  inject,
  input,
} from '@angular/core';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { BreakpointObserver } from '@angular/cdk/layout';
import type { ComponentType } from '@angular/cdk/portal';
import { Icon } from '@shared/ui/icon';

export interface SheetOptions<D> {
  data?: D;
  /** Accessible name of the dialog. */
  label: string;
  /** `auto`: side panel from 768px, bottom sheet below. */
  side?: 'auto' | 'right' | 'bottom';
  width?: string;
  injector?: Injector;
}

/** Opens a component as a side panel (desktop) or bottom sheet (mobile). */
@Injectable({ providedIn: 'root' })
export class SheetService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly breakpoints = inject(BreakpointObserver);

  open<C, D = unknown, R = unknown>(
    component: ComponentType<C>,
    opts: SheetOptions<D>,
  ): DialogRef<R, C> {
    const wide = this.breakpoints.isMatched('(min-width: 768px)');
    const bottom = opts.side === 'bottom' || (opts.side !== 'right' && !wide);
    const position = bottom
      ? this.overlay.position().global().bottom('0').left('0')
      : this.overlay.position().global().top('0').right('0');
    return this.dialog.open<R, D, C>(component, {
      data: opts.data,
      injector: opts.injector,
      ariaLabel: opts.label,
      panelClass: ['im-sheet', bottom ? 'im-sheet--bottom' : 'im-sheet--right'],
      backdropClass: 'im-scrim',
      positionStrategy: position,
      width: bottom ? '100vw' : (opts.width ?? 'min(32rem, 100vw)'),
      maxWidth: '100vw',
      height: bottom ? undefined : '100dvh',
      maxHeight: bottom ? '88dvh' : '100dvh',
      autoFocus: 'dialog',
      restoreFocus: true,
    });
  }
}

/**
 * Chrome for content opened through SheetService: title bar, close button and
 * a scrollable body. Project the body as content.
 */
@Component({
  selector: 'im-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="flex h-full max-h-[inherit] flex-col bg-paper">
      <div class="flex items-start justify-between gap-4 border-b border-rule px-5 pt-4 pb-3">
        <div class="min-w-0">
          @if (eyebrow()) {
            <p class="label-caps text-muted">{{ eyebrow() }}</p>
          }
          <h2 class="mt-1 text-xl leading-snug">{{ heading() }}</h2>
        </div>
        <button type="button" class="btn btn-ghost -mr-2 shrink-0" (click)="close()">
          <svg imIcon="x" [size]="20" aria-hidden="true"></svg>
          <span class="sr-only">{{ closeLabel() }}</span>
        </button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <ng-content />
      </div>
      <ng-content select="[sheet-footer]" />
    </div>
  `,
  host: { class: 'block h-full' },
})
export class Sheet {
  readonly heading = input.required<string>();
  readonly eyebrow = input<string>('');
  readonly closeLabel = input('Fechar');
  private readonly ref = inject(DialogRef, { optional: true });

  protected close(): void {
    this.ref?.close();
  }
}
