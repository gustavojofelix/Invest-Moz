import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LOCALES, type Locale } from '@core/domain/types';
import { LOCALE_DIR, LOCALE_LABEL } from '@core/i18n/locales';
import { LocaleService } from '@core/i18n/locale.service';
import { BrandMark } from '@core/layout/brand-mark';
import { FlagStripe } from '@core/layout/flag-stripe';

/** Screen 3 · Welcome and language: Tiva introduces itself; pick one of eight languages. */
@Component({
  selector: 'im-welcome-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, BrandMark, FlagStripe],
  template: `
    <div *transloco="let t" class="surface-deep flex min-h-dvh flex-col">
      <im-flag-stripe [height]="14" />
      <div
        class="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-6 pt-12 pb-6 sm:pt-16 md:max-w-xl"
      >
        <im-brand-mark variant="wordmark" size="md" tone="dark" />
        <h1 class="font-serif text-[2.25rem] leading-[1.1] font-medium sm:text-5xl">
          {{ t('welcome.title') }}
        </h1>
        <p class="text-base leading-relaxed text-on-deep-muted">{{ t('welcome.lead') }}</p>
        <fieldset class="grid grid-cols-2 gap-2.5">
          <legend class="sr-only">{{ t('welcome.language') }}</legend>
          @for (l of locales; track l) {
            <button
              type="button"
              class="lang"
              [attr.aria-pressed]="l === lang()"
              [attr.lang]="l"
              [attr.dir]="dir[l]"
              (click)="choose(l)"
            >
              {{ labels[l] }}
            </button>
          }
        </fieldset>
      </div>
      <div class="mx-auto flex w-full max-w-md flex-col gap-3 px-6 pt-4 pb-8 md:max-w-xl">
        <a class="btn btn-highlight btn-lg w-full" [routerLink]="['/', lang(), 'pathfinder']">
          {{ t('welcome.start') }}
        </a>
        <a
          class="flex min-h-11 items-center justify-center text-sm font-semibold text-on-deep underline underline-offset-4"
          [routerLink]="['/', lang(), 'login']"
          >{{ t('welcome.account') }}</a
        >
        <div class="flex items-center justify-center gap-2.5 text-xs text-on-deep-subtle">
          {{ t('welcome.builtBy') }}
          <im-brand-mark variant="lts" size="sm" tone="dark" />
        </div>
        <p class="text-center text-xs leading-normal text-on-deep-subtle">
          {{ t('welcome.disclaimer') }}
        </p>
      </div>
    </div>
  `,
  styles: `
    .lang {
      min-height: 3.25rem;
      padding: 0.5rem;
      border: 1px solid var(--brand-line);
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--on-deep);
      font: inherit;
      font-size: 0.9375rem;
      cursor: pointer;
      transition: background-color 150ms;
    }
    .lang:hover {
      background: var(--brand-deep-2);
    }
    .lang[aria-pressed='true'] {
      border: 2px solid var(--highlight);
      background: var(--brand-deep-2);
      font-weight: 700;
    }
    .lang:focus-visible {
      outline: 2px solid var(--highlight);
      outline-offset: 2px;
    }
  `,
})
export class WelcomePage {
  private readonly router = inject(Router);
  private readonly locale = inject(LocaleService);
  protected readonly lang = this.locale.lang;
  protected readonly locales = LOCALES;
  protected readonly labels = LOCALE_LABEL;
  protected readonly dir = LOCALE_DIR;

  /** Switches the URL locale; the route resolver then activates and remembers it. */
  protected choose(l: Locale): void {
    if (l === this.lang()) return;
    void this.router.navigateByUrl(this.locale.switchUrl(this.router.url, l), {
      replaceUrl: true,
    });
  }
}
