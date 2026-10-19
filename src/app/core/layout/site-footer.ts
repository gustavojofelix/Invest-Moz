import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { FIRM } from '../config/site';
import { LocaleService } from '../i18n/locale.service';
import { BrandMark } from './brand-mark';
import { FlagStripe } from './flag-stripe';
import { LanguageSwitcher } from './language-switcher';

@Component({
  selector: 'im-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, BrandMark, FlagStripe, LanguageSwitcher],
  template: `
    <footer *transloco="let t" class="no-print mt-24 border-t border-rule bg-panel">
      <div class="container-page grid gap-10 py-12 md:grid-cols-12">
        <div class="md:col-span-5">
          <im-brand-mark />
          <p class="mt-4 max-w-md text-sm text-muted">{{ t('disclaimer') }}</p>
        </div>
        <div class="text-sm md:col-span-4">
          <p class="label-caps text-muted">{{ t('footer.contact') }}</p>
          <p class="mt-3">
            <a class="link" [href]="'mailto:' + firm.email">{{ firm.email }}</a>
          </p>
          <p class="mt-3 font-bold">{{ firm.legalName }}</p>
          <p class="text-muted">{{ t('footer.technology') }}: {{ firm.technology }}</p>
        </div>
        <div class="text-sm md:col-span-3">
          <p class="label-caps text-muted">{{ t('nav.language') }}</p>
          <div class="-ml-2 mt-1">
            <im-language-switcher [label]="t('nav.language')" />
          </div>
          <ul class="mt-4 space-y-1" role="list">
            <li><a class="link" [routerLink]="['/', lang(), 'questions']">{{ t('nav.questions') }}</a></li>
            <li><a class="link" [routerLink]="['/', lang(), 'login']">{{ t('footer.firmAccess') }}</a></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-rule">
        <div class="container-page flex flex-wrap items-center justify-between gap-4 py-5">
          <im-brand-mark variant="partners" size="sm" />
          <p class="text-xs text-muted">© 2026 Tax Advisory · Law Technology Solutions</p>
        </div>
      </div>
      <im-flag-stripe [height]="3" />
    </footer>
  `,
})
export class SiteFooter {
  protected readonly lang = inject(LocaleService).lang;
  protected readonly firm = FIRM;
}
