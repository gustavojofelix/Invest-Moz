import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LOCALES, type Locale } from '../domain/types';
import { LOCALE_LABEL } from '../i18n/locales';
import { LocaleService } from '../i18n/locale.service';
import { CurrentUrl } from './current-url';

/** PT · EN · FR. Switching keeps the current page; the choice is remembered. */
@Component({
  selector: 'im-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <nav [attr.aria-label]="label()" class="flex items-center">
      <ul class="flex items-center" role="list">
        @for (l of links(); track l.lang; let last = $last) {
          <li class="flex items-center">
            <a
              [routerLink]="l.tree"
              [attr.hreflang]="l.lang"
              [attr.lang]="l.lang"
              [attr.aria-current]="l.active ? 'true' : null"
              [attr.title]="l.name"
              class="lang"
              [class.active]="l.active"
              >{{ l.lang.toUpperCase() }}<span class="sr-only"> — {{ l.name }}</span></a
            >
            @if (!last) {
              <span class="text-muted px-0.5" aria-hidden="true">·</span>
            }
          </li>
        }
      </ul>
    </nav>
  `,
  styles: `
    .lang {
      display: inline-grid;
      place-items: center;
      min-width: 2.75rem;
      min-height: 2.75rem;
      padding-inline: 0.25rem;
      font-size: 0.875rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--muted);
      text-decoration: none;
      border-radius: var(--radius);
    }
    .lang:hover {
      color: var(--ink);
      background: var(--panel);
    }
    .lang.active {
      color: var(--ink);
      text-decoration: underline;
      text-decoration-color: var(--brand);
      text-decoration-thickness: 2px;
      text-underline-offset: 6px;
    }
  `,
})
export class LanguageSwitcher {
  private readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly current = inject(CurrentUrl);
  readonly label = input('Idioma');

  protected readonly links = computed(() => {
    const url = this.current.url();
    const active = this.locale.lang();
    return LOCALES.map((lang: Locale) => ({
      lang,
      name: LOCALE_LABEL[lang],
      active: lang === active,
      tree: this.router.parseUrl(this.locale.switchUrl(url, lang)),
    }));
  });
}
