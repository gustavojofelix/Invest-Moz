import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { DEMO_CREDENTIALS } from '@core/config/demo-credentials';
import type { GuideIndex } from '@core/domain/guide';
import { LocPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { BrandMark } from '@core/layout/brand-mark';
import { AuthService, ProjectRepository } from '@core/ports';
import { RefTag } from '@shared/ui/ref-tag';
import { MozMap } from './map/moz-map';
import { Icon } from '@shared/ui/icon';

const REGIMES = [
  { key: 'companies', ref: 'DL 1/2022' },
  { key: 'licensing', ref: 'Dec. 41/2026' },
  { key: 'investment', ref: 'Lei 8/2023' },
  { key: 'tax', ref: 'CIRPC · CIVA' },
  { key: 'labour', ref: 'Lei 13/2023' },
  { key: 'immigration', ref: 'Dec. 88/2024' },
  { key: 'exchange', ref: 'Lei 11/2009' },
  { key: 'customs', ref: 'Lei 11/2016' },
];

@Component({
  selector: 'im-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, TranslocoDirective, LocPipe, BrandMark, RefTag, MozMap],
  templateUrl: './landing-page.html',
  styles: `
    .regime {
      padding: 1.25rem 0;
      border-top: 1px solid var(--rule);
    }
    @media (min-width: 640px) {
      .regime {
        padding: 1.25rem 1.25rem 1.25rem 0;
      }
    }
    .chapters {
      display: grid;
      column-gap: 2rem;
    }
    @media (min-width: 640px) {
      .chapters {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    .chapters a {
      display: flex;
      gap: 0.875rem;
      align-items: baseline;
      padding: 0.875rem 0;
      border-top: 1px solid var(--rule);
      color: var(--ink);
      text-decoration: none;
    }
    .chapters a:hover {
      color: var(--brand);
    }
    .how-num {
      font-family: var(--font-serif);
      font-size: 3rem;
      line-height: 1;
      font-weight: 600;
      color: var(--brand);
    }
    .demo-box {
      border: 1px solid var(--ink);
      background: var(--paper);
      position: relative;
    }
    .demo-box::before {
      content: '';
      position: absolute;
      inset: -1px auto -1px -1px;
      width: 4px;
      background: var(--highlight);
    }
  `,
})
export class LandingPage {
  /** Resolved by guideIndexResolver (bound through withComponentInputBinding). */
  readonly guide = input<GuideIndex>();
  private readonly router = inject(Router);
  private readonly projects = inject(ProjectRepository);
  private readonly auth = inject(AuthService);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly regimes = REGIMES;
  protected readonly creds = DEMO_CREDENTIALS;
  protected readonly signingIn = signal(false);

  protected viewExample(): void {
    this.projects.setCurrent('TA-IM-EX01');
    void this.router.navigate(['/', this.lang(), 'assessment', 'TA-IM-EX01']);
  }

  protected async enterInbox(): Promise<void> {
    this.signingIn.set(true);
    await this.auth.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    await this.router.navigate(['/', this.lang(), 'inbox']);
    this.signingIn.set(false);
  }
}
