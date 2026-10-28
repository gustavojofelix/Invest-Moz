import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Icon } from '@shared/ui/icon';
import { AuthService } from '../ports';
import { LocaleService } from '../i18n/locale.service';
import { BrandMark } from './brand-mark';
import { CurrentUrl } from './current-url';
import { LanguageSwitcher } from './language-switcher';

/** Site header from the screen-pack landing: wordmark, five links, language and the CTA. */
@Component({
  selector: 'im-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, RouterLinkActive, TranslocoDirective, BrandMark, LanguageSwitcher],
  template: `
    <header *transloco="let t" class="no-print sticky top-0 z-40 border-b border-rule bg-surface">
      <div class="container-page flex min-h-16 items-center justify-between gap-4 py-3">
        <a
          [routerLink]="['/', lang()]"
          class="-ms-1 rounded p-1 text-ink no-underline"
          [attr.aria-label]="t('nav.home')"
        >
          <im-brand-mark />
        </a>

        <nav [attr.aria-label]="t('nav.main')" class="hidden lg:block">
          <ul class="flex items-center gap-1" role="list">
            @for (item of items(); track item.key) {
              <li>
                <a
                  [routerLink]="item.link"
                  routerLinkActive="is-active"
                  [routerLinkActiveOptions]="{ exact: false }"
                  class="navlink"
                  >{{ t(item.key) }}</a
                >
              </li>
            }
          </ul>
        </nav>

        <div class="flex items-center gap-2">
          <div class="hidden sm:block">
            <im-language-switcher [label]="t('nav.language')" />
          </div>
          <a
            [routerLink]="['/', lang(), 'welcome']"
            class="btn btn-primary hidden md:inline-flex"
            >{{ t('nav.start') }}</a
          >
          <button
            type="button"
            class="btn btn-ghost lg:hidden"
            [attr.aria-expanded]="open()"
            aria-controls="mobile-nav"
            (click)="open.set(!open())"
          >
            @if (open()) {
              <svg imIcon="x" [size]="22" aria-hidden="true"></svg>
            } @else {
              <svg imIcon="menu" [size]="22" aria-hidden="true"></svg>
            }
            <span class="sr-only">{{ t('nav.menu') }}</span>
          </button>
        </div>
      </div>

      @if (open()) {
        <div id="mobile-nav" class="im-rise border-t border-rule bg-surface lg:hidden">
          <nav [attr.aria-label]="t('nav.main')" class="container-page py-2">
            <ul role="list">
              @for (item of mobileItems(); track item.key) {
                <li class="border-b border-rule last:border-0">
                  <a
                    [routerLink]="item.link"
                    class="flex min-h-12 items-center gap-3 font-semibold no-underline"
                  >
                    <svg [imIcon]="item.icon" [size]="18" aria-hidden="true"></svg>
                    {{ t(item.key) }}
                  </a>
                </li>
              }
            </ul>
            <div class="flex flex-wrap items-center gap-3 py-3">
              <im-language-switcher [label]="t('nav.language')" />
              <a [routerLink]="['/', lang(), 'welcome']" class="btn btn-primary">{{
                t('nav.start')
              }}</a>
            </div>
          </nav>
        </div>
      }
    </header>
  `,
  styles: `
    .navlink {
      display: inline-flex;
      align-items: center;
      min-height: 2.75rem;
      padding: 0 0.75rem;
      font-weight: 500;
      font-size: 0.9375rem;
      text-decoration: none;
      color: var(--ink);
      border-radius: var(--radius);
      position: relative;
    }
    .navlink:hover {
      color: var(--brand);
    }
    .navlink.is-active {
      color: var(--brand);
      font-weight: 700;
    }
    .navlink.is-active::after {
      content: '';
      position: absolute;
      inset-inline: 0.75rem;
      bottom: 0.25rem;
      height: 2px;
      background: var(--brand);
    }
  `,
})
export class SiteHeader {
  private readonly locale = inject(LocaleService);
  private readonly auth = inject(AuthService);
  private readonly url = inject(CurrentUrl).url;
  protected readonly lang = this.locale.lang;
  protected readonly open = signal(false);

  protected readonly items = computed(() => {
    const l = this.lang();
    return [
      { key: 'nav.explore', icon: 'map', link: ['/', l, 'map'] },
      { key: 'nav.roadmap', icon: 'route', link: ['/', l, 'roadmap'] },
      { key: 'nav.incentives', icon: 'gift', link: ['/', l, 'incentives'] },
      { key: 'nav.library', icon: 'library', link: ['/', l, 'library'] },
      { key: 'nav.experts', icon: 'users', link: ['/', l, 'expert'] },
    ];
  });

  protected readonly mobileItems = computed(() => {
    const l = this.lang();
    const all = [
      ...this.items(),
      { key: 'nav.chat', icon: 'message-circle', link: ['/', l, 'chat'] },
      { key: 'nav.documents', icon: 'clipboard-list', link: ['/', l, 'documents'] },
      { key: 'nav.directory', icon: 'building', link: ['/', l, 'directory'] },
      { key: 'nav.aftercare', icon: 'calendar-clock', link: ['/', l, 'aftercare'] },
      { key: 'nav.alerts', icon: 'bell-ring', link: ['/', l, 'alerts'] },
    ];
    return this.auth.user()
      ? [...all, { key: 'nav.office', icon: 'layout-dashboard', link: ['/', l, 'office'] }]
      : all;
  });

  constructor() {
    // Close the mobile menu on navigation.
    effect(() => {
      this.url();
      this.open.set(false);
    });
  }
}
