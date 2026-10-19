import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LucideMenu, LucideX } from '@lucide/angular';
import { AuthService } from '../ports';
import { LocaleService } from '../i18n/locale.service';
import { BrandMark } from './brand-mark';
import { CurrentUrl } from './current-url';
import { FlagStripe } from './flag-stripe';
import { LanguageSwitcher } from './language-switcher';

@Component({
  selector: 'im-site-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    TranslocoDirective,
    BrandMark,
    FlagStripe,
    LanguageSwitcher,
    LucideMenu,
    LucideX,
  ],
  template: `
    <header *transloco="let t" class="no-print sticky top-0 z-40 border-b border-rule bg-surface/95 backdrop-blur-[2px]">
      <im-flag-stripe />
      <div class="container-page flex h-16 items-center justify-between gap-4">
        <a [routerLink]="['/', lang()]" class="-ml-1 rounded p-1 no-underline" [attr.aria-label]="t('nav.home')">
          <im-brand-mark />
        </a>

        <nav [attr.aria-label]="t('nav.main')" class="hidden md:block">
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

        <div class="flex items-center gap-1">
          <div class="hidden sm:block">
            <im-language-switcher [label]="t('nav.language')" />
          </div>
          <button
            type="button"
            class="btn btn-ghost md:hidden"
            [attr.aria-expanded]="open()"
            aria-controls="mobile-nav"
            (click)="open.set(!open())"
          >
            @if (open()) {
              <svg lucideX [size]="22" aria-hidden="true"></svg>
            } @else {
              <svg lucideMenu [size]="22" aria-hidden="true"></svg>
            }
            <span class="sr-only">{{ t('nav.menu') }}</span>
          </button>
        </div>
      </div>

      @if (open()) {
        <div id="mobile-nav" class="im-rise border-t border-rule bg-surface md:hidden">
          <nav [attr.aria-label]="t('nav.main')" class="container-page py-2">
            <ul role="list">
              @for (item of items(); track item.key) {
                <li class="border-b border-rule last:border-0">
                  <a [routerLink]="item.link" class="flex min-h-12 items-center font-bold no-underline" (click)="open.set(false)">
                    {{ t(item.key) }}
                  </a>
                </li>
              }
            </ul>
            <div class="py-2 sm:hidden">
              <im-language-switcher [label]="t('nav.language')" />
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
      padding: 0 0.875rem;
      font-weight: 700;
      font-size: 0.9375rem;
      text-decoration: none;
      color: var(--ink);
      border-radius: var(--radius);
      position: relative;
    }
    .navlink:hover {
      background: var(--panel);
    }
    .navlink.is-active::after {
      content: '';
      position: absolute;
      left: 0.875rem;
      right: 0.875rem;
      bottom: 0.375rem;
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
    const base = [
      { key: 'nav.project', link: ['/', l, 'project'] },
      { key: 'nav.questions', link: ['/', l, 'questions'] },
      { key: 'nav.contact', link: ['/', l, 'contact'] },
    ];
    return this.auth.user() ? [...base, { key: 'nav.inbox', link: ['/', l, 'inbox'] }] : base;
  });

  constructor() {
    // Close the mobile menu on navigation.
    effect(() => {
      this.url();
      this.open.set(false);
    });
  }
}
