import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { LOCALES } from '../domain/types';
import { SITE_ORIGIN_TOKEN } from '../config/site';
import { LocaleService } from '../i18n/locale.service';

export interface SeoRouteData {
  /** Translation key (global file) for the page title. */
  title?: string;
  description?: string;
  noindex?: boolean;
}

/**
 * Keeps <title>, meta description, robots, canonical and hreflang alternates
 * in sync with the route and the active language.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly locale = inject(LocaleService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  init(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.apply(e.urlAfterRedirects));
  }

  /** Lets a page override its title once its data is known (e.g. project name). */
  setTitle(text: string): void {
    this.title.setTitle(`${text} · Tiva`);
  }

  private apply(url: string): void {
    let route: ActivatedRouteSnapshot = this.router.routerState.snapshot.root;
    let data: SeoRouteData = {};
    while (route) {
      data = { ...data, ...(route.data['seo'] as SeoRouteData | undefined) };
      if (!route.firstChild) break;
      route = route.firstChild;
    }

    const pageTitle = data.title ? this.locale.t(data.title) : '';
    const brandTitle = this.locale.t('seo.siteTitle');
    this.title.setTitle(pageTitle ? `${pageTitle} · Tiva` : brandTitle);
    this.meta.updateTag({
      name: 'description',
      content: this.locale.t(data.description ?? 'seo.siteDescription'),
    });
    this.meta.updateTag({
      name: 'robots',
      content: data.noindex ? 'noindex, nofollow' : 'index, follow',
    });

    const origin = this.browser ? this.document.location.origin : SITE_ORIGIN_TOKEN;
    const path = url.split(/[?#]/)[0];
    this.setLink('canonical', undefined, origin + path);
    for (const lang of LOCALES) {
      this.setLink('alternate', lang, origin + this.locale.switchUrl(path, lang));
    }
    this.setLink('alternate', 'x-default', origin + this.locale.switchUrl(path, 'pt'));
  }

  private setLink(rel: string, hreflang: string | undefined, href: string): void {
    const head = this.document.head;
    const selector = hreflang
      ? `link[rel="${rel}"][hreflang="${hreflang}"]`
      : `link[rel="${rel}"]:not([hreflang])`;
    let link = head.querySelector<HTMLLinkElement>(selector);
    if (!link) {
      link = this.document.createElement('link');
      link.rel = rel;
      if (hreflang) link.hreflang = hreflang;
      head.appendChild(link);
    }
    link.href = href;
  }
}
