import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '@shared/ui/icon';
import { LOCALES, type Locale } from '../domain/types';
import { LOCALE_LABEL } from '../i18n/locales';
import { LocaleService } from '../i18n/locale.service';
import { CurrentUrl } from './current-url';

let nextId = 0;

/**
 * The eight-language menu. Each option is a real link to the same page in that
 * language (good for hreflang and for opening in a new tab); the choice is
 * remembered by LocaleService.
 *
 * - `variant="field"`: "Language [English ▾]" as in the site header
 * - `variant="pill"`: a compact "EN ▾" pill for app bars on deep green
 */
@Component({
  selector: 'im-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close(true)',
  },
  template: `
    <div class="relative inline-flex items-center gap-2">
      @if (variant() === 'field') {
        <span class="text-sm text-muted" aria-hidden="true">{{ label() }}</span>
      }
      <button
        #trigger
        type="button"
        class="trigger"
        [class.trigger--pill]="variant() === 'pill'"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="menuId"
        [attr.aria-label]="label() + ': ' + current().name"
        (click)="open.set(!open())"
      >
        <svg imIcon="globe" [size]="16" aria-hidden="true"></svg>
        <span>{{ variant() === 'pill' ? current().code : current().name }}</span>
        <svg imIcon="chevron-down" [size]="14" aria-hidden="true"></svg>
      </button>
      @if (open()) {
        <ul [id]="menuId" class="menu im-rise" role="list" [attr.aria-label]="label()">
          @for (l of links(); track l.lang) {
            <li>
              <a
                [routerLink]="l.tree"
                [attr.hreflang]="l.lang"
                [attr.lang]="l.lang"
                [attr.dir]="l.lang === 'ar' ? 'rtl' : 'ltr'"
                [attr.aria-current]="l.active ? 'true' : null"
                class="option"
                [class.is-active]="l.active"
                (click)="close(false)"
              >
                <span>{{ l.name }}</span>
                @if (l.active) {
                  <svg imIcon="check" [size]="16" aria-hidden="true"></svg>
                }
              </a>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      min-height: 2.5rem;
      padding: 0 0.75rem;
      border: 1px solid var(--rule);
      border-radius: 8px;
      background: var(--paper);
      color: var(--ink);
      font: inherit;
      font-size: 0.875rem;
    }
    .trigger:hover {
      border-color: var(--brand);
    }
    .trigger--pill {
      min-height: 2.25rem;
      border-radius: 999px;
      border-color: var(--brand-line);
      background: transparent;
      color: var(--on-deep);
      font-weight: 600;
      font-size: 0.8125rem;
    }
    .menu {
      position: absolute;
      inset-inline-end: 0;
      top: calc(100% + 6px);
      z-index: 50;
      min-width: 12rem;
      padding: 0.375rem;
      background: var(--paper);
      color: var(--ink);
      border: 1px solid var(--rule);
      border-radius: 12px;
      box-shadow: var(--shadow-overlay);
    }
    .option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      min-height: 2.75rem;
      padding: 0 0.75rem;
      border-radius: 8px;
      text-decoration: none;
      font-size: 0.9375rem;
    }
    .option:hover {
      background: var(--brand-tint);
    }
    .option.is-active {
      font-weight: 700;
      color: var(--brand);
    }
  `,
})
export class LanguageSwitcher {
  private readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly currentUrl = inject(CurrentUrl);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly label = input('Language');
  readonly variant = input<'field' | 'pill'>('field');

  protected readonly menuId = `im-lang-menu-${nextId++}`;
  protected readonly open = signal(false);

  protected readonly current = computed(() => {
    const lang = this.locale.lang();
    return { code: lang.toUpperCase(), name: LOCALE_LABEL[lang] };
  });

  protected readonly links = computed(() => {
    const url = this.currentUrl.url();
    const active = this.locale.lang();
    return LOCALES.map((lang: Locale) => ({
      lang,
      name: LOCALE_LABEL[lang],
      active: lang === active,
      tree: this.router.parseUrl(this.locale.switchUrl(url, lang)),
    }));
  });

  constructor() {
    // Close on navigation.
    effect(() => {
      this.currentUrl.url();
      this.open.set(false);
    });
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node))
      this.open.set(false);
  }

  protected close(refocus: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    if (refocus) this.host.nativeElement.querySelector<HTMLButtonElement>('.trigger')?.focus();
  }
}
