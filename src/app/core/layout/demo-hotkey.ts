import { Directive, Injector, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Shift + D toggles the presenter panel as an overlay (lazy-loaded). */
@Directive({
  selector: '[imDemoHotkey]',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class DemoHotkey {
  private readonly injector = inject(Injector);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private ref: { close(): void } | null = null;

  protected async onKey(event: KeyboardEvent): Promise<void> {
    if (!this.browser || !event.shiftKey || event.key.toLowerCase() !== 'd') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    if (this.ref) {
      this.ref.close();
      return;
    }
    // Loaded on demand so the CDK overlay stays out of the initial bundle.
    const [{ DemoPanelSheet }, { SheetService }] = await Promise.all([
      import('../../features/demo/demo-panel'),
      import('../../shared/ui/sheet'),
    ]);
    const ref = this.injector.get(SheetService).open(DemoPanelSheet, {
      label: 'Demo',
      side: 'right',
      width: 'min(28rem, 100vw)',
      injector: this.injector,
    });
    this.ref = ref;
    ref.closed.subscribe(() => (this.ref = null));
  }
}
