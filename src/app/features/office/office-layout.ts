import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LocaleService } from '@core/i18n/locale.service';
import { BrandMark } from '@core/layout/brand-mark';
import { CurrentUrl } from '@core/layout/current-url';
import { LanguageSwitcher } from '@core/layout/language-switcher';
import { AuthService, EnquiryRepository } from '@core/ports';
import { Icon } from '@shared/ui/icon';
import { ReviewStore } from './review-store';
import { ValidationStore } from './validation-store';

interface NavItem {
  path: string;
  key: string;
  icon: string;
  badge?: () => number;
}

/** Back-office chrome: deep-green sidebar (a drawer below 1024px) and the routed screen. */
@Component({
  selector: 'im-office-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgTemplateOutlet,
    TranslocoDirective,
    BrandMark,
    LanguageSwitcher,
    Icon,
  ],
  host: { '(keydown.escape)': 'closeDrawer(true)' },
  template: `
    <ng-container *transloco="let t">
      <div class="office">
        <!-- Top bar (below 1024px) -->
        <div class="topbar surface-deep no-print lg:hidden">
          <a [routerLink]="['/', lang(), 'office']" class="flex items-center gap-2 text-on-deep">
            <im-brand-mark variant="wordmark" size="sm" tone="dark" />
            <span class="sr-only">{{ t('office.nav.home') }}</span>
          </a>
          <span class="label-caps text-on-deep-muted">{{ t('office.nav.title') }}</span>
          <button
            #menuButton
            type="button"
            class="menu-btn"
            [attr.aria-expanded]="drawer()"
            aria-controls="office-drawer"
            (click)="drawer.set(!drawer())"
          >
            <svg [imIcon]="drawer() ? 'x' : 'menu'" [size]="22" aria-hidden="true"></svg>
            <span class="sr-only">{{ t('office.nav.menu') }}</span>
          </button>
        </div>

        <!-- Sidebar (1024px and up) -->
        <nav
          class="sidebar surface-deep no-print hidden lg:flex"
          [attr.aria-label]="t('office.nav.title')"
        >
          <ng-container *ngTemplateOutlet="navTpl; context: { $implicit: t }" />
        </nav>

        <!-- Drawer -->
        @if (drawer()) {
          <button
            type="button"
            class="scrim lg:hidden"
            tabindex="-1"
            [attr.aria-label]="t('office.nav.close')"
            (click)="closeDrawer(true)"
          ></button>
          <nav
            id="office-drawer"
            class="drawer surface-deep im-rise lg:hidden"
            [attr.aria-label]="t('office.nav.title')"
          >
            <ng-container *ngTemplateOutlet="navTpl; context: { $implicit: t }" />
          </nav>
        }

        <div class="content">
          <router-outlet />
        </div>
      </div>

      <ng-template #navTpl let-t>
        <a
          [routerLink]="['/', lang(), 'office']"
          class="hidden items-center gap-2 px-2 pb-1 text-on-deep lg:flex"
        >
          <im-brand-mark variant="wordmark" size="sm" tone="dark" />
          <span class="sr-only">{{ t('office.nav.home') }}</span>
        </a>
        <p class="label-caps hidden px-2 pb-4 text-on-deep-subtle lg:block">
          {{ t('office.nav.title') }}
        </p>
        <ul role="list" class="flex flex-col gap-1">
          @for (item of items; track item.path) {
            <li>
              <a
                class="nav-link"
                [routerLink]="['/', lang(), 'office', item.path]"
                routerLinkActive="is-active"
                ariaCurrentWhenActive="page"
              >
                <svg [imIcon]="item.icon" [size]="18" aria-hidden="true"></svg>
                <span class="flex-1">{{ t('office.nav.' + item.key) }}</span>
                @if (item.badge && item.badge() > 0) {
                  <span class="badge">
                    {{ item.badge() }}
                    <span class="sr-only">{{ t('office.nav.pending') }}</span>
                  </span>
                }
              </a>
            </li>
          }
        </ul>

        <div class="mt-auto flex flex-col gap-3 px-2 pt-8 text-xs text-on-deep-subtle">
          <span>{{ t('office.nav.builtBy') }}</span>
          <im-brand-mark variant="lts" tone="dark" size="sm" />
          <span>{{ t('office.nav.legalContent') }}</span>
          <im-brand-mark variant="ta" tone="dark" size="sm" />
        </div>

        <div class="mt-6 flex flex-col gap-3 border-t border-brand-line px-2 pt-4">
          @if (user(); as u) {
            <p class="text-sm">
              <span class="block text-xs text-on-deep-subtle">{{ t('office.nav.signedIn') }}</span>
              <span class="block font-bold text-on-deep">{{ u.name }}</span>
              <span class="block text-xs break-all text-on-deep-muted">{{ u.email }}</span>
            </p>
          }
          <div class="flex flex-wrap items-center gap-2">
            <im-language-switcher variant="pill" [label]="t('office.nav.language')" />
            <button type="button" class="side-btn" (click)="logout()">
              <svg imIcon="log-out" [size]="16" aria-hidden="true"></svg
              >{{ t('office.nav.signOut') }}
            </button>
          </div>
          <a class="side-btn self-start" [routerLink]="['/', lang()]">
            <svg imIcon="arrow-left" [size]="16" class="flip-rtl" aria-hidden="true"></svg
            >{{ t('office.nav.publicSite') }}
          </a>
        </div>
      </ng-template>
    </ng-container>
  `,
  styles: `
    :host {
      display: block;
      flex: 1;
    }
    .office {
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--surface-alt);
      color: var(--ink);
    }
    @media (min-width: 1024px) {
      .office {
        display: grid;
        grid-template-columns: 16.5rem minmax(0, 1fr);
      }
      /* Component styles outrank Tailwind's lg:hidden, so hide the mobile chrome here. */
      .office .topbar,
      .office .drawer,
      .office .scrim {
        display: none;
      }
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 40;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem 0.5rem 1rem;
    }
    .menu-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: var(--radius);
      border: 1px solid var(--brand-line);
      background: transparent;
      color: var(--on-deep);
    }
    .sidebar {
      position: sticky;
      top: 0;
      height: 100vh;
      height: 100dvh;
      overflow-y: auto;
      flex-direction: column;
      padding: 1.5rem 1rem;
    }
    .drawer {
      position: fixed;
      z-index: 50;
      inset-block: 0;
      inset-inline-start: 0;
      width: min(18rem, 86vw);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      padding: 1.25rem 1rem;
      box-shadow: var(--shadow-overlay);
    }
    .scrim {
      position: fixed;
      inset: 0;
      z-index: 45;
      background: rgb(0 0 0 / 0.45);
      border: 0;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      min-height: 2.75rem;
      padding: 0.625rem 0.75rem;
      border-radius: var(--radius);
      color: var(--on-deep-muted);
      font-size: 0.875rem;
      text-decoration: none;
    }
    .nav-link:hover {
      background: var(--brand-deep-2);
      color: var(--on-deep);
    }
    .nav-link.is-active {
      background: var(--brand-deep-2);
      color: var(--on-deep);
      font-weight: 600;
    }
    .badge {
      padding: 0.0625rem 0.5rem;
      border-radius: 999px;
      background: var(--highlight);
      color: var(--highlight-ink);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .side-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      min-height: 2.75rem;
      padding: 0 0.75rem;
      border: 1px solid var(--brand-line);
      border-radius: 999px;
      background: transparent;
      color: var(--on-deep);
      font-size: 0.8125rem;
      text-decoration: none;
    }
    .side-btn:hover {
      background: var(--brand-deep-2);
    }
    :host-context([dir='rtl']) .flip-rtl {
      transform: scaleX(-1);
    }
    .content {
      min-width: 0;
    }
    @media (prefers-reduced-motion: reduce) {
      .drawer {
        animation: none;
      }
    }
  `,
})
export class OfficeLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly queue = inject(ValidationStore);
  private readonly review = inject(ReviewStore);
  private readonly enquiries = inject(EnquiryRepository);
  private readonly url = inject(CurrentUrl).url;
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  protected readonly lang = inject(LocaleService).lang;
  protected readonly user = this.auth.user;
  protected readonly drawer = signal(false);

  private readonly newLeads = computed(
    () => this.enquiries.enquiries().filter((e) => this.enquiries.isUnseen(e.ref)).length,
  );

  protected readonly items: NavItem[] = [
    { path: 'queue', key: 'queue', icon: 'list-checks', badge: () => this.queue.pending().length },
    { path: 'knowledge-base', key: 'knowledgeBase', icon: 'library' },
    {
      path: 'conversations',
      key: 'conversations',
      icon: 'message-square-text',
      badge: () => this.review.open().length,
    },
    { path: 'leads', key: 'leads', icon: 'handshake', badge: () => this.newLeads() },
    { path: 'intelligence', key: 'intelligence', icon: 'chart-bar' },
    { path: 'partners', key: 'partners', icon: 'building' },
  ];

  constructor() {
    void this.enquiries.load();
    effect(() => {
      this.url();
      untracked(() => this.drawer.set(false));
    });
  }

  protected closeDrawer(refocus: boolean): void {
    if (!this.drawer()) return;
    this.drawer.set(false);
    if (refocus) this.menuButton()?.nativeElement.focus();
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/', this.lang(), 'login']);
  }
}
