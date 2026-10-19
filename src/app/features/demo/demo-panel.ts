import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  resource,
  signal,
} from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { LOCALES, type Locale } from '@core/domain/types';
import { LocPipe } from '@core/i18n/format';
import { LOCALE_LABEL } from '@core/i18n/locales';
import { LocaleService } from '@core/i18n/locale.service';
import { CurrentUrl } from '@core/layout/current-url';
import { ThemeService } from '@core/layout/theme.service';
import { AuthService, DemoStateService, ProjectRepository } from '@core/ports';
import { Sheet } from '@shared/ui/sheet';
import { Icon } from '@shared/ui/icon';

/** Presenter controls: examples, screens, language, theme, reset. */
@Component({
  selector: 'im-demo-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Also opened as an overlay (Shift + D) outside the /demo route.
  providers: [provideTranslocoScope('demo')],
  imports: [Icon, TranslocoDirective, LocPipe],
  template: `
    <div *transloco="let t" class="space-y-8">
      <section>
        <h3 class="label-caps text-muted">{{ t('demo.examples') }}</h3>
        <ul class="mt-2 border-t border-rule" role="list">
          @for (p of examples.value() ?? []; track p.ref) {
            <li class="border-b border-rule">
              <button type="button" class="row" (click)="openExample(p.ref)">
                <span class="min-w-0">
                  <span class="block font-bold leading-snug">{{ p.title | loc: lang() }}</span>
                  <span class="block text-sm text-muted"
                    >{{ p.sector | loc: lang() }} · {{ p.ref }}</span
                  >
                </span>
                <svg imIcon="arrow-right" [size]="18" aria-hidden="true"></svg>
              </button>
            </li>
          }
        </ul>
      </section>

      <section>
        <h3 class="label-caps text-muted">{{ t('demo.screens') }}</h3>
        <ul class="mt-2 grid grid-cols-2 gap-2" role="list">
          @for (s of screens(); track s.key) {
            <li>
              <button
                type="button"
                class="btn btn-secondary btn-sm w-full justify-start"
                (click)="go(s.path)"
              >
                {{ t('demo.screen.' + s.key) }}
              </button>
            </li>
          }
        </ul>
      </section>

      <section class="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 class="label-caps text-muted">{{ t('demo.language') }}</h3>
          <div class="mt-2 flex gap-2">
            @for (l of locales; track l) {
              <button
                type="button"
                class="btn btn-sm"
                [class.btn-brand]="l === lang()"
                [class.btn-secondary]="l !== lang()"
                [attr.aria-pressed]="l === lang()"
                [attr.title]="label[l]"
                (click)="switchLang(l)"
              >
                {{ l.toUpperCase() }}
              </button>
            }
          </div>
        </div>
        <div>
          <h3 class="label-caps text-muted">{{ t('demo.theme') }}</h3>
          <button
            type="button"
            class="btn btn-secondary btn-sm mt-2"
            [attr.aria-pressed]="theme.theme() === 'dark'"
            (click)="theme.toggle()"
          >
            @if (theme.theme() === 'dark') {
              <svg imIcon="sun" [size]="18" aria-hidden="true"></svg>{{ t('demo.light') }}
            } @else {
              <svg imIcon="moon" [size]="18" aria-hidden="true"></svg>{{ t('demo.dark') }}
            }
          </button>
        </div>
      </section>

      <section class="border-t border-rule pt-5">
        <h3 class="label-caps text-muted">{{ t('demo.reset') }}</h3>
        <p class="mt-1 text-sm text-muted">{{ t('demo.resetText') }}</p>
        @if (confirming()) {
          <div class="mt-3 flex flex-wrap gap-2" role="group" [attr.aria-label]="t('demo.reset')">
            <button type="button" class="btn btn-primary btn-sm" (click)="reset()">
              {{ t('demo.resetConfirm') }}
            </button>
            <button type="button" class="btn btn-ghost btn-sm" (click)="confirming.set(false)">
              {{ t('ui.cancel') }}
            </button>
          </div>
        } @else {
          <button
            type="button"
            class="btn btn-secondary btn-sm mt-3"
            (click)="confirming.set(true)"
          >
            <svg imIcon="rotate-ccw" [size]="18" aria-hidden="true"></svg>{{ t('demo.resetCta') }}
          </button>
        }
        @if (resetDone()) {
          <p class="mt-2 text-sm font-bold text-brand" role="status">{{ t('demo.resetDone') }}</p>
        }
      </section>

      <p class="text-xs text-muted">{{ t('demo.hotkey') }}</p>
    </div>
  `,
  styles: `
    .row {
      display: flex;
      width: 100%;
      min-height: 3.25rem;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.625rem 0.25rem;
      text-align: left;
      background: none;
      border: 0;
      color: inherit;
    }
    .row:hover {
      background: var(--panel);
    }
  `,
})
export class DemoPanel {
  readonly navigated = output<void>();
  private readonly router = inject(Router);
  private readonly projects = inject(ProjectRepository);
  private readonly demo = inject(DemoStateService);
  private readonly auth = inject(AuthService);
  private readonly locale = inject(LocaleService);
  private readonly transloco = inject(TranslocoService);
  private readonly url = inject(CurrentUrl).url;
  protected readonly theme = inject(ThemeService);
  protected readonly lang = this.locale.lang;
  protected readonly locales = LOCALES;
  protected readonly label = LOCALE_LABEL;
  protected readonly confirming = signal(false);
  protected readonly resetDone = signal(false);
  protected readonly examples = resource({ loader: () => this.projects.examples() });

  protected readonly screens = computed(() => {
    const current = this.projects.currentRef() ?? 'TA-IM-EX01';
    return [
      { key: 'landing', path: '' },
      { key: 'intake', path: 'project' },
      { key: 'assessment', path: `assessment/${current}` },
      { key: 'questions', path: 'questions' },
      { key: 'contact', path: 'contact' },
      { key: 'login', path: 'login' },
      { key: 'inbox', path: 'inbox' },
      { key: 'styleGuide', path: 'demo/ui' },
    ];
  });

  constructor() {
    // The overlay can open on any page; make sure the demo scope is loaded.
    void firstValueFrom(this.transloco.load(`demo/${this.lang()}`));
  }

  protected openExample(ref: string): void {
    this.projects.setCurrent(ref);
    this.go(`assessment/${ref}`);
  }

  protected go(path: string): void {
    void this.router.navigateByUrl(`/${this.lang()}${path ? '/' + path : ''}`);
    this.navigated.emit();
  }

  protected switchLang(lang: Locale): void {
    void firstValueFrom(this.transloco.load(`demo/${lang}`));
    void this.router.navigateByUrl(this.locale.switchUrl(this.url(), lang));
  }

  protected async reset(): Promise<void> {
    await this.demo.reset();
    this.auth.logout();
    this.confirming.set(false);
    this.resetDone.set(true);
    if (this.url().includes('/inbox')) this.go('');
  }
}

/** The panel inside a side sheet, opened with Shift + D. */
@Component({
  selector: 'im-demo-panel-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideTranslocoScope('demo')],
  imports: [Sheet, DemoPanel, TranslocoDirective],
  template: `
    <im-sheet
      *transloco="let t"
      [heading]="t('demo.title')"
      [eyebrow]="t('demo.eyebrow')"
      [closeLabel]="t('ui.close')"
    >
      <im-demo-panel (navigated)="ref.close()" />
    </im-sheet>
  `,
})
export class DemoPanelSheet {
  protected readonly ref = inject(DialogRef);
}
