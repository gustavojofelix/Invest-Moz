import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LocaleService } from '@core/i18n/locale.service';

@Component({
  selector: 'im-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslocoDirective],
  template: `
    <div *transloco="let t" class="container-page py-20">
      <p class="label-caps text-muted">404</p>
      <h1 class="mt-2 text-3xl">{{ t('notFound.title') }}</h1>
      <p class="mt-3 max-w-lg text-muted">{{ t('notFound.text') }}</p>
      <a class="btn btn-secondary mt-8" [routerLink]="['/', lang()]">{{ t('notFound.cta') }}</a>
    </div>
  `,
})
export class NotFound {
  protected readonly lang = inject(LocaleService).lang;
}
