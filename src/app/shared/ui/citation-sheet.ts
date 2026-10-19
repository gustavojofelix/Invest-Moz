import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { TranslocoDirective } from '@jsverse/transloco';
import { ImDatePipe, LocPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import type { LegalReference } from '@core/domain/types';
import { ConfirmText } from './confirm-text';
import { Sheet } from './sheet';

@Component({
  selector: 'im-citation-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Sheet, TranslocoDirective, LocPipe, ImDatePipe, ConfirmText],
  template: `
    <ng-container *transloco="let t">
      <im-sheet
        [heading]="ref.instrument"
        [eyebrow]="t('ui.citation.eyebrow')"
        [closeLabel]="t('ui.close')"
      >
        <p class="font-serif text-lg leading-snug">{{ ref.title | loc: lang() }}</p>

        <dl
          class="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-y border-rule py-4 text-sm"
        >
          <dt class="text-muted">{{ t('ui.citation.status') }}</dt>
          <dd>
            <span
              class="label-caps rounded-sm bg-highlight-tint px-1.5 py-0.5 text-[0.6875rem] text-ink"
            >
              {{ t('ui.citation.illustrative') }}
            </span>
          </dd>
          <dt class="text-muted">{{ t('ui.citation.reviewed') }}</dt>
          <dd>{{ ref.lastReviewed | imDate: lang() : 'long' }}</dd>
          <dt class="text-muted">{{ t('ui.citation.topic') }}</dt>
          <dd>{{ t('topics.' + ref.topic) }}</dd>
        </dl>

        <h3 class="label-caps mt-6 text-muted">{{ t('ui.citation.summary') }}</h3>
        <p class="mt-2"><im-confirm-text [text]="ref.summary | loc: lang()" /></p>

        @if (ref.excerpt) {
          <h3 class="label-caps mt-6 text-muted">{{ t('ui.citation.excerpt') }}</h3>
          <blockquote
            class="mt-2 border-l-2 border-brand bg-panel px-4 py-3 font-serif text-[1.0625rem] leading-relaxed"
          >
            <im-confirm-text [text]="ref.excerpt | loc: lang()" />
          </blockquote>
        }

        <p class="mt-6 text-sm text-muted">{{ t('ui.citation.note') }}</p>
      </im-sheet>
    </ng-container>
  `,
})
export class CitationSheet {
  protected readonly ref = inject<LegalReference>(DIALOG_DATA);
  protected readonly lang = inject(LocaleService).lang;
}
