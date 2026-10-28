import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LocaleService } from '../i18n/locale.service';
import { CurrentUrl } from './current-url';
import { DemoHotkey } from './demo-hotkey';
import { RouteChrome } from './route-chrome';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

/** Page chrome for every `/:lang/...` route (see RouteChrome for the three modes). */
@Component({
  selector: 'im-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, SiteHeader, SiteFooter, TranslocoDirective],
  hostDirectives: [DemoHotkey],
  template: `
    <ng-container *transloco="let t">
      <a href="#main" class="skip-link">{{ t('nav.skip') }}</a>
      @if (locale.machineTranslated() && chrome() !== 'office') {
        <p class="mt-notice no-print" role="note">
          <span>{{ t('mt.notice') }}</span>
          <a [routerLink]="englishUrl()" hreflang="en" lang="en" class="font-bold underline">{{
            t('mt.switch')
          }}</a>
        </p>
      }
    </ng-container>
    @if (chrome() === 'site') {
      <im-site-header />
    }
    <main id="main" tabindex="-1" class="outline-none" [class.min-h-[60vh]]="chrome() === 'site'">
      <router-outlet />
    </main>
    @if (chrome() === 'site') {
      <im-site-footer />
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      min-height: 100dvh;
    }
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    main > :not(router-outlet) {
      flex: 1;
    }
    .skip-link {
      position: absolute;
      inset-inline-start: 1rem;
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
    .mt-notice {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.25rem 0.75rem;
      margin: 0;
      padding: 0.5rem 1rem;
      background: var(--highlight-tint);
      color: var(--warn-ink);
      font-size: 0.8125rem;
      text-align: center;
    }
  `,
})
export class Shell {
  protected readonly locale = inject(LocaleService);
  protected readonly chrome = inject(RouteChrome).chrome;
  private readonly url = inject(CurrentUrl).url;
  protected readonly englishUrl = computed(() => this.locale.switchUrl(this.url(), 'en'));
}
