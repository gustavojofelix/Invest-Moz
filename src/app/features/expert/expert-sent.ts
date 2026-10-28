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
import { FIRM } from '@core/config/site';
import { pickText } from '@core/domain/text';
import { ImDatePipe } from '@core/i18n/format';
import { LOCALE_LABEL } from '@core/i18n/locales';
import { LocaleService } from '@core/i18n/locale.service';
import { EnquiryRepository } from '@core/ports';
import { copyText, enquiryText, mailtoHref } from '@features/enquiry/enquiry-text';
import { EmptyState } from '@shared/ui/empty-state';
import { Icon } from '@shared/ui/icon';
import { Skeleton } from '@shared/ui/skeleton';
import { ExpertDirectory } from './experts';

/** 10 · Call requested: reference, call time, what was shared and the next steps. */
@Component({
  selector: 'im-expert-sent-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, TranslocoDirective, ImDatePipe, EmptyState, Skeleton],
  template: `
    <ng-container *transloco="let t">
      <div class="container-page py-10 sm:py-16">
        @if (data.isLoading()) {
          <im-skeleton [lines]="5" class="block max-w-xl" />
        } @else if (data.value(); as d) {
          <div class="mx-auto max-w-xl space-y-5">
            <span
              class="grid h-16 w-16 place-items-center rounded-full bg-brand-tint text-brand"
              aria-hidden="true"
            >
              <svg imIcon="circle-check" [size]="32"></svg>
            </span>
            @if (d.expert?.logo; as logo) {
              <img class="logo" [src]="'/' + logo" [alt]="d.expert!.name" />
            }
            <h1 class="font-serif text-3xl leading-tight">
              {{ t('expert.sent.title', { expert: d.name }) }}
            </h1>
            <p class="text-[0.9375rem] leading-relaxed text-muted">
              {{ d.e.projectSnapshot ? t('expert.sent.textProject') : t('expert.sent.text') }}
            </p>

            <dl class="card grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 p-4 text-sm">
              <dt class="text-muted">{{ t('expert.sent.ref') }}</dt>
              <dd class="text-end font-mono font-bold">{{ d.e.ref }}</dd>
              @if (d.e.callSlot) {
                <dt class="text-muted">{{ t('expert.sent.call') }}</dt>
                <dd class="text-end font-bold">
                  {{ d.e.callSlot | imDate: lang() : 'datetime' }}
                  <span class="block text-xs font-normal text-muted">{{
                    t('expert.sent.timezone')
                  }}</span>
                </dd>
              }
              <dt class="text-muted">{{ t('expert.sent.language') }}</dt>
              <dd class="text-end font-bold">{{ d.language }}</dd>
              <dt class="text-muted">{{ t('expert.sent.shared') }}</dt>
              <dd class="text-end font-bold">
                {{
                  d.e.projectSnapshot && d.e.consent?.shareSummary
                    ? t('expert.sent.sharedProject')
                    : t('expert.sent.sharedContact')
                }}
              </dd>
            </dl>
            @if (d.e.projectSnapshot && d.e.consent?.shareSummary) {
              <details class="text-sm">
                <summary class="link inline-flex min-h-11 cursor-pointer items-center">
                  {{ t('expert.sent.whatShared') }}
                </summary>
                <p class="mt-1 leading-relaxed">{{ d.summary }}</p>
                <p class="mt-2 text-muted">
                  {{ d.e.name }} · {{ d.e.company }} · {{ d.e.email }}
                  @if (d.e.phone) {
                    · {{ d.e.phone }}
                  }
                </p>
              </details>
            }

            <h2 class="pt-1 text-base font-bold">{{ t('expert.sent.next') }}</h2>
            <ol class="space-y-3" role="list">
              @for (n of [1, 2, 3]; track n) {
                <li class="flex items-start gap-2.5 text-sm leading-relaxed">
                  <span
                    class="grid h-6.5 w-6.5 shrink-0 place-items-center rounded-full bg-brand text-[0.8125rem] font-bold text-brand-ink"
                    aria-hidden="true"
                    >{{ n }}</span
                  >
                  <span class="pt-0.5">{{
                    t('expert.sent.' + (d.paid ? 'paid' : 'free') + '.step' + n)
                  }}</span>
                </li>
              }
            </ol>
            <p class="rounded-md bg-surface-alt px-4 py-3 text-sm">
              {{ d.paid ? t('expert.sent.feeNote') : t('expert.sent.freeNote') }}
            </p>

            <div class="grid gap-2 sm:grid-cols-2">
              @if (d.e.callSlot) {
                <button type="button" class="btn btn-outline" (click)="addToCalendar(d.name)">
                  <svg imIcon="calendar" [size]="18" aria-hidden="true"></svg
                  >{{ t('expert.sent.calendar') }}
                </button>
              }
              @if (d.e.projectSnapshot) {
                <a
                  class="btn btn-primary"
                  [routerLink]="['/', lang(), 'roadmap', d.e.projectSnapshot.projectRef]"
                  >{{ t('expert.sent.roadmap') }}</a
                >
              } @else {
                <a class="btn btn-primary" [routerLink]="['/', lang(), 'pathfinder']">{{
                  t('expert.sent.pathfinder')
                }}</a>
              }
              <a class="btn btn-ghost sm:col-span-2" [routerLink]="['/', lang(), 'chat']">
                <svg imIcon="message-circle" [size]="18" aria-hidden="true"></svg
                >{{ t('expert.sent.chat') }}
              </a>
            </div>

            <div class="border-t border-rule pt-5">
              <p class="text-sm text-muted">{{ t('expert.sent.fallback') }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <button type="button" class="btn btn-secondary btn-sm" (click)="copy()">
                  @if (copied()) {
                    <svg imIcon="check" [size]="16" aria-hidden="true"></svg
                    >{{ t('expert.sent.copied') }}
                  } @else {
                    <svg imIcon="copy" [size]="16" aria-hidden="true"></svg
                    >{{ t('expert.sent.copy') }}
                  }
                </button>
                @if (d.paid && fallback(); as f) {
                  <a class="btn btn-secondary btn-sm" [href]="f.href">
                    <svg imIcon="mail" [size]="16" aria-hidden="true"></svg
                    >{{ t('expert.sent.mail') }}
                  </a>
                }
              </div>
            </div>
          </div>
        } @else {
          <im-empty-state [eyebrow]="t('expert.eyebrow')" [heading]="t('expert.sent.missing')">
            <a class="btn btn-primary" [routerLink]="['/', lang(), 'expert']">{{
              t('expert.sent.again')
            }}</a>
          </im-empty-state>
        }
      </div>
    </ng-container>
  `,
  styles: `
    .logo {
      height: 3.5rem;
      width: auto;
    }
    :host-context([data-theme='dark']) .logo {
      background: #fff;
      border-radius: var(--radius-sm);
      padding: 0.25rem 0.5rem;
    }
  `,
})
export class ExpertSentPage {
  readonly ref = input.required<string>();
  private readonly repo = inject(EnquiryRepository);
  private readonly directory = inject(ExpertDirectory);
  private readonly transloco = inject(TranslocoService);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly copied = signal(false);

  private readonly loaded = resource({
    params: () => this.ref(),
    loader: async ({ params }) => {
      const e = await this.repo.get(params);
      if (!e) return null;
      return { e, expert: await this.directory.get(e.expertId ?? 'tax-advisory') };
    },
  });

  protected readonly data = {
    isLoading: () => this.loaded.isLoading(),
    value: computed(() => {
      const r = this.loaded.value();
      if (!r) return null;
      const l = this.lang();
      return {
        ...r,
        name: r.expert?.name ?? FIRM.name,
        paid: (r.expert?.fee ?? 'paid') === 'paid',
        language: LOCALE_LABEL[r.e.locale],
        summary: r.e.projectSnapshot ? pickText(r.e.projectSnapshot.summary, l) : '',
      };
    }),
  };

  protected readonly fallback = computed(() => {
    const d = this.data.value();
    if (!d) return null;
    const t = (k: string) => this.transloco.translate(k);
    const { subject, body } = enquiryText(
      { ...d.e, areasLabels: d.e.areas.map((a) => t(`topics.${a}`)) },
      this.lang(),
      {
        subject: t('expert.mail.subject'),
        name: t('expert.fields.name'),
        company: t('expert.fields.company'),
        email: t('expert.fields.email'),
        phone: t('expert.fields.phone'),
        areas: t('expert.mail.areas'),
        message: t('expert.fields.note'),
        project: t('expert.share.title'),
      },
    );
    return { text: `${subject}\n\n${body}`, href: mailtoHref(subject, body) };
  });

  protected async copy(): Promise<void> {
    const f = this.fallback();
    if (f) this.copied.set(await copyText(f.text));
  }

  /** Downloads an .ics file for the requested call (30 minutes). */
  protected addToCalendar(expert: string): void {
    const e = this.data.value()?.e;
    if (!e?.callSlot) return;
    const start = new Date(e.callSlot);
    const end = new Date(start.getTime() + 30 * 60_000);
    const stamp = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '');
    const title = this.transloco.translate('expert.sent.icsTitle', { expert });
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tiva//Expert call//EN',
      'BEGIN:VEVENT',
      `UID:${e.ref}@tiva`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${title.replace(/[,;]/g, ' ')}`,
      `DESCRIPTION:Ref. ${e.ref}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${e.ref}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
