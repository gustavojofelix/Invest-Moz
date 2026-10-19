import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { DEMO_CREDENTIALS } from '@core/config/demo-credentials';
import { LocaleService } from '@core/i18n/locale.service';
import { AuthService } from '@core/ports';
import { BrandMark } from '@core/layout/brand-mark';
import { Icon } from '@shared/ui/icon';

/** Demo login for the Tax Advisory inbox. Credentials are prefilled on purpose. */
@Component({
  selector: 'im-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, ReactiveFormsModule, TranslocoDirective, BrandMark],
  template: `
    <div *transloco="let t" class="container-page py-12 sm:py-20">
      <div class="mx-auto max-w-md">
        <im-brand-mark variant="ta" size="lg" />
        <p class="label-caps mt-6 text-muted">{{ t('inbox.login.eyebrow') }}</p>
        <h1 class="mt-2 text-3xl">{{ t('inbox.login.title') }}</h1>
        <p class="mt-3 text-muted">{{ t('inbox.login.intro') }}</p>

        <div class="mt-6 border-l-2 border-highlight bg-highlight-tint/60 px-4 py-3 text-sm">
          <p class="font-bold">{{ t('inbox.login.demoTitle') }}</p>
          <p class="mt-1">{{ t('inbox.login.demoText') }}</p>
          <p class="mt-2 font-mono text-[0.8125rem]">{{ creds.email }} · {{ creds.password }}</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 space-y-5" novalidate>
          <div>
            <label class="field-label" for="email">{{ t('inbox.login.email') }}</label>
            <input
              id="email"
              type="email"
              class="input"
              formControlName="email"
              autocomplete="username"
            />
          </div>
          <div>
            <label class="field-label" for="password">{{ t('inbox.login.password') }}</label>
            <input
              id="password"
              type="password"
              class="input"
              formControlName="password"
              autocomplete="current-password"
            />
          </div>
          @if (error()) {
            <p class="field-error" role="alert">
              <svg imIcon="circle-alert" [size]="16" aria-hidden="true"></svg
              >{{ t('inbox.login.error') }}
            </p>
          }
          <button type="submit" class="btn btn-brand w-full" [disabled]="busy()">
            <svg imIcon="lock-keyhole" [size]="18" aria-hidden="true"></svg
            >{{ t('inbox.login.submit') }}
          </button>
          <p class="text-xs text-muted">{{ t('inbox.login.notSecurity') }}</p>
        </form>
      </div>
    </div>
  `,
})
export class LoginPage {
  readonly next = input<string>();
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly lang = inject(LocaleService).lang;
  protected readonly creds = DEMO_CREDENTIALS;
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
      next?.startsWith('/') && next.includes('/inbox') ? next : `/${this.lang()}/inbox`;
    await this.router.navigateByUrl(target);
  }
}
