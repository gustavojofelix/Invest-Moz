import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { DEMO_CREDENTIALS } from '@core/config/demo-credentials';
import { LocaleService } from '@core/i18n/locale.service';
import { BrandMark } from '@core/layout/brand-mark';
import { AuthService } from '@core/ports';
import { Icon } from '@shared/ui/icon';

/** Demo sign-in for the Tiva back office. Credentials are prefilled on purpose. */
@Component({
  selector: 'im-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, ReactiveFormsModule, RouterLink, TranslocoDirective, BrandMark],
  template: `
    <div *transloco="let t" class="bg-surface-alt px-4 py-10 sm:py-16">
      <div
        class="mx-auto grid max-w-4xl overflow-hidden rounded-xl border border-rule md:grid-cols-2"
      >
        <div class="surface-deep flex flex-col gap-5 p-6 sm:p-8">
          <im-brand-mark variant="wordmark" size="md" tone="dark" />
          <p class="label-caps text-on-deep-subtle">{{ t('office.login.eyebrow') }}</p>
          <h1 class="font-serif text-3xl leading-tight font-medium text-on-deep">
            {{ t('office.login.title') }}
          </h1>
          <p class="text-on-deep-muted">{{ t('office.login.intro') }}</p>
          <ul role="list" class="flex flex-col gap-2 text-sm text-on-deep-muted">
            @for (k of points; track k) {
              <li class="flex items-start gap-2">
                <svg
                  imIcon="check"
                  [size]="16"
                  class="mt-0.5 text-highlight"
                  aria-hidden="true"
                ></svg>
                {{ t('office.login.points.' + k) }}
              </li>
            }
          </ul>
          <div class="mt-auto flex flex-col gap-3 pt-4 text-xs text-on-deep-subtle">
            <span>{{ t('office.nav.builtBy') }}</span>
            <im-brand-mark variant="lts" tone="dark" size="sm" />
          </div>
        </div>

        <div class="bg-paper p-6 sm:p-8">
          <div class="rounded-md border border-rule bg-highlight-tint px-4 py-3 text-sm">
            <p class="font-bold">{{ t('office.login.demoTitle') }}</p>
            <p class="mt-1">{{ t('office.login.demoText') }}</p>
            <p class="mt-2 font-mono text-[0.8125rem] break-all">
              {{ creds.email }} · {{ creds.password }}
            </p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="mt-6 space-y-5" novalidate>
            <div>
              <label class="field-label" for="email">{{ t('office.login.email') }}</label>
              <input
                id="email"
                type="email"
                class="input"
                formControlName="email"
                autocomplete="username"
                [attr.aria-invalid]="error()"
              />
            </div>
            <div>
              <label class="field-label" for="password">{{ t('office.login.password') }}</label>
              <input
                id="password"
                type="password"
                class="input"
                formControlName="password"
                autocomplete="current-password"
                [attr.aria-invalid]="error()"
              />
            </div>
            @if (error()) {
              <p class="field-error" role="alert">
                <svg imIcon="circle-alert" [size]="16" aria-hidden="true"></svg
                >{{ t('office.login.error') }}
              </p>
            }
            <button type="submit" class="btn btn-primary w-full" [disabled]="busy()">
              <svg imIcon="lock-keyhole" [size]="18" aria-hidden="true"></svg
              >{{ t('office.login.submit') }}
            </button>
            <p class="text-xs text-muted">{{ t('office.login.notSecurity') }}</p>
          </form>
          <a
            class="link mt-6 inline-flex min-h-11 items-center text-sm"
            [routerLink]="['/', lang()]"
          >
            {{ t('office.nav.publicSite') }}
          </a>
        </div>
      </div>
    </div>
  `,
})
export class LoginPage {
  readonly next = input<string>();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly creds = DEMO_CREDENTIALS;
  protected readonly points = ['validate', 'leads', 'intelligence'];
  protected readonly error = signal(false);
  protected readonly busy = signal(false);
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: [DEMO_CREDENTIALS.email, [Validators.required, Validators.email]],
    password: [DEMO_CREDENTIALS.password, Validators.required],
  });

  protected async submit(): Promise<void> {
    this.busy.set(true);
    const { email, password } = this.form.getRawValue();
    const ok = await this.auth.login(email, password);
    this.busy.set(false);
    this.error.set(!ok);
    if (!ok) return;
    const next = this.next();
    const target =
      next && /^\/[a-z]{2}\/office(\/|$|\?)/.test(next) ? next : `/${this.lang()}/office`;
    await this.router.navigateByUrl(target);
  }
}
