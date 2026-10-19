import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { DemoPanel } from './demo-panel';

@Component({
  selector: 'im-demo-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, DemoPanel],
  template: `
    <div *transloco="let t" class="container-page py-12">
      <div class="max-w-2xl">
        <p class="label-caps text-muted">{{ t('demo.eyebrow') }}</p>
        <h1 class="mt-2 text-3xl sm:text-4xl">{{ t('demo.title') }}</h1>
        <p class="mt-3 text-muted">{{ t('demo.intro') }}</p>
        <div class="mt-10">
          <im-demo-panel />
        </div>
      </div>
    </div>
  `,
})
export class DemoPage {}
