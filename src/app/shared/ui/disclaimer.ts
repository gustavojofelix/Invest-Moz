import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Icon } from '@shared/ui/icon';

/** The legal disclaimer shown on every assessment and answer. */
@Component({
  selector: 'im-disclaimer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, TranslocoDirective],
  template: `
    <p
      *transloco="let t"
      class="flex gap-2.5 border-l-2 border-highlight bg-highlight-tint/50 px-4 py-3 text-sm"
    >
      <svg imIcon="info" [size]="18" class="mt-0.5 text-muted" aria-hidden="true"></svg>
      <span>{{ t('disclaimer') }}</span>
    </p>
  `,
})
export class Disclaimer {}
