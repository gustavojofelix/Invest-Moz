import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LOCALES } from '@core/domain/types';
import { LOCALE_DIR, LOCALE_LABEL } from '@core/i18n/locales';
import { LocaleService } from '@core/i18n/locale.service';
import { BrandMark } from '@core/layout/brand-mark';
import { FlagStripe } from '@core/layout/flag-stripe';
import { Icon } from '@shared/ui/icon';
import { HeroMap } from './hero-map';
import { SpeechInput } from './speech-input';

const EXAMPLES = ['ecoLodge', 'solar', 'logistics', 'bakery'] as const;
const AREAS = [
  'companies',
  'licensing',
  'investment',
  'incentives',
  'land',
  'people',
  'money',
  'tax',
] as const;
const SOURCES = ['investmentLaw', 'licensing', 'irpc'] as const;

/** Screen 1 · Landing: the idea box turns a visitor's idea into a conversation. */
@Component({
  selector: 'im-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, TranslocoDirective, BrandMark, FlagStripe, HeroMap],
  templateUrl: './landing-page.html',
  styles: `
    .move-num {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 999px;
      background: var(--brand-tint);
      color: var(--brand);
      font-weight: 700;
    }
    .area {
      border-top: 3px solid var(--brand);
      padding-block: 1rem;
    }
    .area.alt {
      border-top-color: var(--highlight);
    }
    .stat {
      font-family: var(--font-serif);
      font-size: 2.25rem;
      line-height: 1.1;
      font-weight: 500;
      color: var(--brand);
    }
    .mic[aria-pressed='true'] {
      background: var(--accent-tint);
      border-color: var(--accent);
      color: var(--accent);
    }
  `,
})
export class LandingPage {
  private readonly router = inject(Router);
  protected readonly speech = inject(SpeechInput);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly examples = EXAMPLES;
  protected readonly areas = AREAS;
  protected readonly sources = SOURCES;
  protected readonly languages = LOCALES.map((l) => ({
    l,
    name: LOCALE_LABEL[l],
    dir: LOCALE_DIR[l],
  }));
  protected readonly idea = signal('');
  protected readonly empty = signal(false);
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('ideaField');

  constructor() {
    // Browser only: the Web Speech API is detected after hydration.
    afterNextRender(() => this.speech.detect());
  }

  protected ask(event?: Event): void {
    event?.preventDefault();
    const q = this.idea().trim();
    if (!q) {
      this.empty.set(true);
      this.field()?.nativeElement.focus();
      return;
    }
    this.go(q);
  }

  protected go(q: string): void {
    this.speech.stop();
    void this.router.navigate(['/', this.lang(), 'chat'], { queryParams: { q } });
  }

  protected voice(): void {
    if (this.speech.listening()) {
      this.speech.stop();
      return;
    }
    this.speech.start(this.lang(), (text) => {
      this.idea.set(text);
      this.empty.set(false);
    });
  }
}
