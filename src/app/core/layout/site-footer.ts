import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { FIRM } from '../config/site';
import { LocaleService } from '../i18n/locale.service';
import { BrandMark } from './brand-mark';
import { FlagStripe } from './flag-stripe';

/** Footer: partner logos (LTS technology, Tax Advisory expert partner), sponsors, link columns. */
@Component({
  selector: 'im-site-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective, BrandMark, FlagStripe],
  template: `
    <footer *transloco="let t" class="no-print mt-16 border-t border-rule bg-panel">
      <div class="container-page grid gap-10 py-12 md:grid-cols-12">
        <div class="md:col-span-5">
          <im-brand-mark />
          <p class="mt-3 text-sm font-semibold text-ink-soft">{{ t('brand.tagline') }}</p>
          <p class="mt-1 text-sm text-muted">{{ t('brand.meaning') }}</p>
          <p class="mt-4 max-w-md text-sm text-muted">{{ t('disclaimer') }}</p>
        </div>
        <nav class="text-sm md:col-span-3" [attr.aria-label]="t('footer.journey')">
          <p class="label-caps text-muted">{{ t('footer.journey') }}</p>
          <ul class="mt-3 space-y-2" role="list">
            @for (l of journey(); track l.key) {
              <li>
                <a class="link" [routerLink]="l.link">{{ t(l.key) }}</a>
              </li>
            }
          </ul>
        </nav>
        <nav class="text-sm md:col-span-4" [attr.aria-label]="t('footer.tools')">
          <p class="label-caps text-muted">{{ t('footer.tools') }}</p>
          <ul class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2" role="list">
            @for (l of tools(); track l.key) {
              <li>
                <a class="link" [routerLink]="l.link">{{ t(l.key) }}</a>
              </li>
            }
          </ul>
        </nav>
      </div>
      <div class="border-t border-rule">
        <div
          class="container-page flex flex-wrap items-center justify-between gap-6 py-6 text-sm text-muted"
        >
          <im-brand-mark
            variant="partners"
            size="sm"
            [technologyLabel]="t('footer.technology')"
            [expertLabel]="t('footer.expert')"
          />
          <span>{{ t('footer.sponsors') }}</span>
          <span class="flex flex-wrap gap-x-3 gap-y-1">
            <a class="link" [href]="'mailto:' + firm.email">{{ t('footer.contact') }}</a>
            <span aria-hidden="true">·</span>
            <a class="link" [routerLink]="['/', lang(), 'login']">{{ t('footer.officeAccess') }}</a>
          </span>
        </div>
        <p class="container-page pb-6 text-xs text-muted">
          © 2026 Law Technology Solutions · Tax Advisory. {{ t('footer.builtIn') }}
        </p>
      </div>
      <im-flag-stripe [height]="6" />
    </footer>
  `,
})
export class SiteFooter {
  protected readonly lang = inject(LocaleService).lang;
  protected readonly firm = FIRM;

  protected readonly journey = computed(() => {
    const l = this.lang();
    return [
      { key: 'nav.start', link: ['/', l, 'welcome'] },
      { key: 'nav.chat', link: ['/', l, 'chat'] },
      { key: 'nav.roadmap', link: ['/', l, 'roadmap'] },
      { key: 'nav.explore', link: ['/', l, 'map'] },
      { key: 'nav.incentives', link: ['/', l, 'incentives'] },
      { key: 'nav.experts', link: ['/', l, 'expert'] },
    ];
  });

  protected readonly tools = computed(() => {
    const l = this.lang();
    return [
      { key: 'nav.library', link: ['/', l, 'library'] },
      { key: 'nav.documents', link: ['/', l, 'documents'] },
      { key: 'nav.directory', link: ['/', l, 'directory'] },
      { key: 'nav.aftercare', link: ['/', l, 'aftercare'] },
      { key: 'nav.alerts', link: ['/', l, 'alerts'] },
      { key: 'nav.whatsapp', link: ['/', l, 'whatsapp'] },
    ];
  });
}
