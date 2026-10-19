import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { DemoHotkey } from './demo-hotkey';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

/** Page chrome for every `/:lang/...` route. */
@Component({
  selector: 'im-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SiteHeader, SiteFooter, TranslocoDirective],
  hostDirectives: [DemoHotkey],
  template: `
    <ng-container *transloco="let t">
      <a href="#main" class="skip-link">{{ t('nav.skip') }}</a>
    </ng-container>
    <im-site-header />
    <main id="main" tabindex="-1" class="min-h-[60vh] outline-none">
      <router-outlet />
    </main>
    <im-site-footer />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    main {
      flex: 1;
    }
    .skip-link {
      position: absolute;
      left: 1rem;
      top: -4rem;
      z-index: 100;
      padding: 0.75rem 1rem;
      background: var(--ink);
      color: var(--surface);
      font-weight: 700;
      border-radius: var(--radius);
    }
    .skip-link:focus {
      top: 1rem;
    }
  `,
})
export class Shell {}
