import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { LocaleService } from '@core/i18n/locale.service';
import { EnquiryRepository } from '@core/ports';
import { EmptyState } from '@shared/ui/empty-state';
import { SectionLabel } from '@shared/ui/section-label';
import { Skeleton } from '@shared/ui/skeleton';
import { copyText, enquiryText, mailtoHref } from './enquiry-text';
import { Icon } from '@shared/ui/icon';

@Component({
  selector: 'im-enquiry-sent',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, TranslocoDirective, EmptyState, SectionLabel, Skeleton],
  template: `
    <ng-container *transloco="let t">
      <div class="container-page py-14 sm:py-20">
        @if (enquiry.isLoading()) {
          <im-skeleton [lines]="4" class="max-w-xl" />
        } @else if (enquiry.value(); as e) {
          <div class="max-w-2xl">
            <span
              class="grid h-12 w-12 place-items-center rounded-full bg-brand text-brand-ink"
              aria-hidden="true"
            >
              <svg imIcon="check" [size]="24" [strokeWidth]="2"></svg>
            </span>
            <im-section-label tone="brand" class="mt-6">{{
              t('enquiry.sent.eyebrow')
            }}</im-section-label>
            <h1 class="mt-2 text-3xl sm:text-4xl">{{ t('enquiry.sent.title') }}</h1>
            <p class="mt-3 text-lg">{{ t('enquiry.sent.text', { name: e.name }) }}</p>
            <p class="mt-6 inline-flex items-baseline gap-3 border border-ink px-5 py-3">
              <span class="label-caps text-muted">{{ t('enquiry.sent.ref') }}</span>
              <span class="font-mono text-xl font-medium">{{ e.ref }}</span>
            </p>

            <h2 class="label-caps mt-10 border-b border-ink pb-2 text-ink">
              {{ t('enquiry.sent.next') }}
            </h2>
            <ol class="mt-2" role="list">
              @for (n of [1, 2, 3]; track n) {
                <li class="flex gap-4 border-b border-rule py-4">
                  <span class="font-serif text-2xl font-semibold text-brand" aria-hidden="true">{{
                    n
                  }}</span>
                  <span>{{ t('enquiry.sent.step' + n) }}</span>
                </li>
              }
            </ol>

            <div class="mt-8 flex flex-wrap gap-3">
              @if (e.projectSnapshot) {
                <a
                  class="btn btn-secondary"
                  [routerLink]="['/', lang(), 'assessment', e.projectSnapshot.projectRef]"
                  >{{ t('enquiry.sent.backToAssessment') }}</a
                >
              }
              <a class="btn btn-ghost" [routerLink]="['/', lang(), 'questions']">{{
                t('enquiry.sent.moreQuestions')
              }}</a>
            </div>

            <div class="mt-10 border-t border-rule pt-5">
              <p class="text-sm text-muted">{{ t('enquiry.sent.fallback') }}</p>
              <div class="mt-3 flex flex-wrap gap-3">
                <button type="button" class="btn btn-secondary btn-sm" (click)="copy()">
                  @if (copied()) {
                    <svg imIcon="check" [size]="16" aria-hidden="true"></svg
                    >{{ t('enquiry.fallback.copied') }}
                  } @else {
                    <svg imIcon="copy" [size]="16" aria-hidden="true"></svg
                    >{{ t('enquiry.fallback.copy') }}
                  }
                </button>
                <a class="btn btn-secondary btn-sm" [href]="fallback()?.href">
                  <svg imIcon="mail" [size]="16" aria-hidden="true"></svg
                  >{{ t('enquiry.fallback.mail') }}
                </a>
              </div>
            </div>
          </div>
        } @else {
          <im-empty-state
            [eyebrow]="t('enquiry.sent.eyebrow')"
            [heading]="t('enquiry.sent.missing')"
          >
            <a class="btn btn-primary" [routerLink]="['/', lang(), 'contact']">{{
              t('enquiry.sent.newEnquiry')
            }}</a>
          </im-empty-state>
        }
      </div>
    </ng-container>
  `,
})
export class EnquirySent {
  readonly ref = input.required<string>();
  private readonly repo = inject(EnquiryRepository);
  private readonly transloco = inject(TranslocoService);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly copied = signal(false);
  protected readonly enquiry = resource({
    params: () => this.ref(),
    loader: ({ params }) => this.repo.get(params),
  });

  protected readonly fallback = computed(() => {
    const e = this.enquiry.value();
    if (!e) return null;
    const l = this.lang();
    const t = (k: string) => this.transloco.translate(k);
    const { subject, body } = enquiryText(
      { ...e, areasLabels: e.areas.map((a) => t(`topics.${a}`)) },
      l,
      {
        subject: t('enquiry.mail.subject'),
        name: t('enquiry.fields.name'),
        company: t('enquiry.fields.company'),
        email: t('enquiry.fields.email'),
        phone: t('enquiry.fields.phone'),
        areas: t('enquiry.fields.areas'),
        message: t('enquiry.fields.message'),
        project: t('enquiry.attach.title'),
      },
    );
    return { text: `${subject}\n\n${body}`, href: mailtoHref(subject, body) };
  });

  protected async copy(): Promise<void> {
    const f = this.fallback();
    if (f) this.copied.set(await copyText(f.text));
  }
}
