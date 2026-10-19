import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { LucideInfo } from '@lucide/angular';

/** The legal disclaimer shown on every assessment and answer. */
@Component({
  selector: 'im-disclaimer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, LucideInfo],
  template: `
    <p *transloco="let t" class="flex gap-2.5 border-l-2 border-highlight bg-highlight-tint/50 px-4 py-3 text-sm">
      <svg lucideInfo [size]="18" class="mt-0.5 text-muted" aria-hidden="true"></svg>
      <span>{{ t('disclaimer') }}</span>
    </p>
  `,
})
export class Disclaimer {}
