import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { maputoToday } from '@core/adapters/json/json-assessment-service';
import { SafeStorage } from '@core/adapters/safe-storage';
import { fromIso, nextDueDates, toIso } from '@core/domain/calendar';
import { pickText } from '@core/domain/text';
import type { DueDate, Holiday, LocalizedText, Obligation, Project } from '@core/domain/types';
import { ImDatePipe, LocPipe, formatDate } from '@core/i18n/format';
import { INTL_LOCALE } from '@core/i18n/locales';
import { LocaleService } from '@core/i18n/locale.service';
import { AssessmentService, ProjectRepository, ReferenceData } from '@core/ports';
import { downloadFile } from '@features/documents/download';
import { ConfirmText } from '@shared/ui/confirm-text';
import { Icon } from '@shared/ui/icon';
import { ObligationCalendar } from '@shared/ui/obligation-calendar';
import { RefTag } from '@shared/ui/ref-tag';

type Tab = 'deadlines' | 'permits' | 'filings';
type Channel = 'whatsapp' | 'email' | 'push';

/** Monthly deadlines shown in the "Deadlines" tab; the rest are annual filings. */
const MONTHLY = ['inss', 'withholding-stamp', 'vat-return'];
/** What a company with staff (some foreign) owes when no project is in context. */
const GENERIC = [
  'inss',
  'withholding-stamp',
  'vat-return',
  'irpc-payments-on-account',
  'modelo-22',
  'apiex-report',
  'permit-renewals',
];
const LEAD_DAYS = [30, 60, 90] as const;

interface Deadline {
  key: string;
  obligation: Obligation;
  due: DueDate;
  /** Holiday name when the nominal date is a public holiday. */
  holiday: string | null;
}

interface Permit {
  id: string;
  kind: 'dire' | 'work_permit' | 'licence';
  holder: string;
  /** ISO date; null for the illustrative example. */
  expires: string | null;
  lead: number;
}

interface AftercareData {
  project: Project | null;
  obligations: Obligation[];
  holidays: Holiday[];
}

/** Screen 15 · Aftercare calendar: the company's deadlines after set-up. */
@Component({
  selector: 'im-aftercare-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Icon,
    RouterLink,
    TranslocoDirective,
    LocPipe,
    ImDatePipe,
    ConfirmText,
    ObligationCalendar,
    RefTag,
  ],
  template: `
    <ng-container *transloco="let t">
      <header class="border-b border-rule bg-paper">
        <div class="container-page py-6 sm:py-8">
          <p class="eyebrow">{{ t('aftercare.eyebrow') }}</p>
          <h1 class="mt-1.5 text-[1.75rem] leading-tight sm:text-4xl">
            @if (data.value()?.project; as p) {
              {{ p.title | loc: lang() }}
            } @else {
              {{ t('aftercare.genericCompany') }}
            }
          </h1>
          <p class="mt-1 text-sm text-muted">
            @if (data.value()?.project; as p) {
              <span class="font-mono">{{ p.ref }}</span> · {{ t('aftercare.fromRoadmap') }}
            } @else {
              {{ t('aftercare.genericNote') }}
              <a class="link" [routerLink]="['/', lang(), 'pathfinder']">{{
                t('aftercare.start')
              }}</a>
            }
          </p>
          <div
            role="tablist"
            [attr.aria-label]="t('aftercare.view')"
            class="mt-4 flex flex-wrap gap-1.5"
          >
            @for (x of tabs; track x) {
              <button
                type="button"
                role="tab"
                class="pill"
                [id]="'tab-' + x"
                [attr.aria-selected]="tab() === x"
                [attr.aria-controls]="'panel-' + x"
                [attr.tabindex]="tab() === x ? 0 : -1"
                [class.is-on]="tab() === x"
                (click)="tab.set(x)"
                (keydown)="onTabKey($event)"
              >
                {{ t('aftercare.tabs.' + x) }}
              </button>
            }
          </div>
        </div>
      </header>

      <div class="container-page py-6 sm:py-8">
        <div class="grid gap-8 lg:grid-cols-12">
          <div class="min-w-0 lg:col-span-8">
            @switch (tab()) {
              @case ('deadlines') {
                <section id="panel-deadlines" role="tabpanel" aria-labelledby="tab-deadlines">
                  <p class="mb-3 flex gap-2 text-sm text-muted">
                    <svg imIcon="info" [size]="16" class="mt-0.5 shrink-0" aria-hidden="true"></svg>
                    {{ t('aftercare.shiftRule') }}
                  </p>
                  @for (m of months(); track m.key) {
                    <section class="mt-5 first:mt-0" [attr.aria-labelledby]="'m-' + m.key">
                      <div class="flex items-baseline justify-between gap-2">
                        <h2 [id]="'m-' + m.key" class="font-sans text-base font-bold">
                          {{ m.label }}
                        </h2>
                        <span class="text-xs text-muted">{{
                          t('aftercare.count', { count: m.items.length })
                        }}</span>
                      </div>
                      <ul class="mt-2 grid gap-2.5" role="list">
                        @for (d of m.items; track d.key) {
                          <li class="card deadline" [class.shifted]="d.due.shifted">
                            <div class="date" aria-hidden="true">
                              <span class="text-[0.6875rem] font-bold uppercase">{{
                                weekdayShort(d.due.date)
                              }}</span>
                              <span class="text-2xl leading-none font-bold">{{
                                d.due.date | imDate: lang() : 'day'
                              }}</span>
                              <span class="text-[0.6875rem]">{{ monthShort(d.due.date) }}</span>
                            </div>
                            <div class="min-w-0">
                              <p class="text-[0.9375rem] font-bold leading-snug">
                                <span class="sr-only"
                                  >{{ d.due.date | imDate: lang() : 'long' }} · </span
                                >{{ d.obligation.title | loc: lang() }}
                              </p>
                              <p class="text-xs text-muted">{{ period(d) }}</p>
                              @if (d.due.shifted) {
                                <p class="shift-note mt-1 text-xs font-semibold">
                                  {{
                                    t(
                                      d.holiday
                                        ? 'aftercare.shiftedHoliday'
                                        : 'aftercare.shiftedWeekend',
                                      {
                                        nominal: (d.due.nominal | imDate: lang() : 'long'),
                                        weekday: (d.due.nominal | imDate: lang() : 'weekday'),
                                        holiday: d.holiday ?? '',
                                        date: (d.due.date | imDate: lang() : 'long'),
                                      }
                                    )
                                  }}
                                </p>
                              }
                              @if (d.obligation.note) {
                                <p class="mt-1 text-xs text-muted">
                                  <im-confirm-text [text]="d.obligation.note | loc: lang()" />
                                </p>
                              }
                            </div>
                          </li>
                        }
                      </ul>
                    </section>
                  } @empty {
                    @if (data.hasValue()) {
                      <p class="text-muted">{{ t('aftercare.noDeadlines') }}</p>
                    }
                  }
                </section>
              }
              @case ('permits') {
                <section id="panel-permits" role="tabpanel" aria-labelledby="tab-permits">
                  <ul class="grid gap-2.5" role="list">
                    @for (p of permits(); track p.id) {
                      <li class="card permit">
                        <svg
                          imIcon="calendar-clock"
                          [size]="22"
                          class="shrink-0 text-brand"
                          aria-hidden="true"
                        ></svg>
                        <div class="min-w-0 flex-1">
                          <p class="text-[0.9375rem] font-bold">
                            {{ t('aftercare.permitKinds.' + p.kind) }} · {{ p.holder }}
                          </p>
                          <p class="text-xs text-muted">
                            @if (p.expires) {
                              {{
                                t('aftercare.expires', {
                                  date: (p.expires | imDate: lang() : 'long'),
                                  reminder: (reminderDate(p) | imDate: lang() : 'long'),
                                })
                              }}
                            } @else {
                              {{ t('aftercare.expiresExample') }}
                            }
                          </p>
                        </div>
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          (click)="removePermit(p.id)"
                          [attr.aria-label]="t('aftercare.removePermit', { holder: p.holder })"
                        >
                          <svg imIcon="trash" [size]="16" aria-hidden="true"></svg>
                        </button>
                      </li>
                    } @empty {
                      <li class="text-muted">{{ t('aftercare.noPermits') }}</li>
                    }
                  </ul>

                  <form
                    class="card mt-4 grid gap-3 p-4 sm:grid-cols-2"
                    (submit)="addPermit($event)"
                  >
                    <p class="font-bold sm:col-span-2">{{ t('aftercare.addTitle') }}</p>
                    <div>
                      <label class="field-label" for="pk">{{ t('aftercare.kind') }}</label>
                      <select id="pk" name="kind" class="input">
                        @for (k of permitKinds; track k) {
                          <option [value]="k">{{ t('aftercare.permitKinds.' + k) }}</option>
                        }
                      </select>
                    </div>
                    <div>
                      <label class="field-label" for="ph">{{ t('aftercare.holder') }}</label>
                      <input id="ph" name="holder" class="input" required autocomplete="off" />
                    </div>
                    <div>
                      <label class="field-label" for="pe">{{ t('aftercare.expiry') }}</label>
                      <input
                        id="pe"
                        name="expires"
                        type="date"
                        class="input"
                        required
                        [min]="today"
                      />
                    </div>
                    <div>
                      <label class="field-label" for="pl">{{ t('aftercare.lead') }}</label>
                      <select id="pl" name="lead" class="input">
                        @for (n of leadDays; track n) {
                          <option [value]="n">{{ t('aftercare.leadDays', { n: n }) }}</option>
                        }
                      </select>
                    </div>
                    @if (renewalNote(); as note) {
                      <p class="text-xs text-muted sm:col-span-2">
                        <im-confirm-text [text]="note | loc: lang()" />
                      </p>
                    }
                    <div class="sm:col-span-2">
                      <button type="submit" class="btn btn-primary">
                        <svg imIcon="plus" [size]="18" aria-hidden="true"></svg
                        >{{ t('aftercare.add') }}
                      </button>
                    </div>
                  </form>
                </section>
              }
              @case ('filings') {
                <section id="panel-filings" role="tabpanel" aria-labelledby="tab-filings">
                  <p class="mb-2 text-sm text-muted">{{ t('aftercare.filingsLead') }}</p>
                  <im-obligation-calendar [obligations]="filings()" [lang]="lang()" />
                </section>
              }
            }
          </div>

          <aside class="grid content-start gap-4 lg:col-span-4">
            <fieldset class="card p-4">
              <legend class="float-start mb-2 w-full font-bold">
                {{ t('aftercare.remindTitle') }}
              </legend>
              <div class="clear-both flex flex-wrap gap-1.5">
                @for (c of channelList; track c) {
                  <button
                    type="button"
                    class="pill"
                    [attr.aria-pressed]="channels()[c]"
                    (click)="toggleChannel(c)"
                  >
                    {{ t('aftercare.channels.' + c) }}
                  </button>
                }
              </div>
              <p class="mt-2 text-xs text-muted" aria-live="polite">
                {{ anyChannel() ? t('aftercare.remindOn') : t('aftercare.remindOff') }}
              </p>
            </fieldset>
            <div class="card p-4 text-sm">
              <p class="font-bold">{{ t('aftercare.sourcesTitle') }}</p>
              <p class="mt-2 flex flex-wrap gap-1.5">
                @for (r of refs; track r) {
                  <im-ref-tag [refId]="r" />
                }
              </p>
              <p class="mt-2 text-xs text-muted">{{ t('aftercare.disclaimer') }}</p>
            </div>
            <div class="foot">
              <button
                type="button"
                class="btn btn-outline flex-1"
                (click)="downloadIcs()"
                [disabled]="!data.hasValue()"
              >
                <svg imIcon="calendar" [size]="18" aria-hidden="true"></svg
                >{{ t('aftercare.addToCalendar') }}
              </button>
              <a
                class="btn btn-primary flex-1"
                [routerLink]="['/', lang(), 'expert']"
                [queryParams]="{ from: 'aftercare' }"
                >{{ t('aftercare.help') }}</a
              >
            </div>
          </aside>
        </div>
      </div>
    </ng-container>
  `,
  styles: `
    .deadline,
    .permit {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
    }
    .date {
      flex: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 3.25rem;
      color: var(--muted);
    }
    .date .text-2xl {
      color: var(--ink);
    }
    .shifted {
      border: 2px solid var(--accent);
    }
    .shifted .date,
    .shifted .date .text-2xl,
    .shift-note {
      color: var(--bad-ink);
    }
    .foot {
      position: sticky;
      bottom: 0;
      display: flex;
      gap: 0.5rem;
      margin-inline: -1rem;
      padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
      border-top: 1px solid var(--rule);
      background: var(--paper);
    }
    @media (min-width: 1024px) {
      .foot {
        position: static;
        flex-direction: column;
        margin: 0;
        padding: 0;
        border: 0;
        background: none;
      }
    }
  `,
})
export class AftercarePage {
  private readonly projects = inject(ProjectRepository);
  private readonly engine = inject(AssessmentService);
  private readonly reference = inject(ReferenceData);
  private readonly storage = inject(SafeStorage);
  private readonly locale = inject(LocaleService);
  private readonly document = inject(DOCUMENT);
  protected readonly lang = this.locale.lang;
  protected readonly today = maputoToday();
  protected readonly tabs: Tab[] = ['deadlines', 'permits', 'filings'];
  protected readonly tab = signal<Tab>('deadlines');
  protected readonly channelList: Channel[] = ['whatsapp', 'email', 'push'];
  protected readonly permitKinds: Permit['kind'][] = ['dire', 'work_permit', 'licence'];
  protected readonly leadDays = LEAD_DAYS;
  protected readonly refs = ['inss', 'cirpc', 'civa', 'dec-88-2024'];

  protected readonly data = resource({
    params: () => this.projects.currentRef(),
    loader: async ({ params: ref }): Promise<AftercareData> => {
      const [project, holidays, { RULE_SET }] = await Promise.all([
        ref ? this.projects.get(ref) : Promise.resolve(null),
        this.reference.holidays(),
        import('@core/domain/rule-set.data'),
      ]);
      if (project) {
        const a = await this.engine.assess(project);
        return { project, obligations: a.obligations, holidays };
      }
      const obligations = RULE_SET.obligations.obligations
        .filter((r) => GENERIC.includes(r.then.id))
        .map((r) => ({ ...r.then, next: [], refs: [...r.then.refs] }) as Obligation);
      return { project: null, obligations, holidays };
    },
  });

  private readonly owner = computed(() => this.projects.currentRef() ?? 'guest');
  private readonly permitsVersion = signal(0);
  protected readonly channels = signal<Record<Channel, boolean>>(
    this.storage.get('aftercare:channels', { whatsapp: true, email: false, push: true }),
  );
  protected readonly anyChannel = computed(() => Object.values(this.channels()).some(Boolean));

  private readonly holidaySet = computed(
    () => new Set((this.data.value()?.holidays ?? []).map((h) => h.date)),
  );

  /** Monthly deadlines for the next three months, grouped by month. */
  protected readonly months = computed(() => {
    const d = this.data.value();
    if (!d) return [];
    const holidays = this.holidaySet();
    const items: Deadline[] = d.obligations
      .filter((o) => MONTHLY.includes(o.id))
      .flatMap((o) =>
        nextDueDates(o.schedule, this.today, holidays, 3).map((due) => ({
          key: `${o.id}-${due.date}`,
          obligation: o,
          due,
          holiday: this.holidayName(due.nominal, d.holidays),
        })),
      )
      .sort((a, b) => a.due.date.localeCompare(b.due.date));
    const groups = new Map<string, Deadline[]>();
    for (const it of items) {
      const k = it.due.date.slice(0, 7);
      groups.set(k, [...(groups.get(k) ?? []), it]);
    }
    return [...groups.entries()].map(([key, list]) => ({
      key,
      label: this.monthLabel(`${key}-01`, 'long'),
      items: list,
    }));
  });

  /** Annual and other filings (with their next dates), for the shared calendar. */
  protected readonly filings = computed<Obligation[]>(() => {
    const d = this.data.value();
    if (!d) return [];
    const holidays = this.holidaySet();
    return d.obligations
      .filter((o) => !MONTHLY.includes(o.id))
      .map((o) => ({ ...o, next: nextDueDates(o.schedule, this.today, holidays, 3) }));
  });

  protected readonly renewalNote = computed<LocalizedText | undefined>(
    () => this.data.value()?.obligations.find((o) => o.id === 'permit-renewals')?.note,
  );

  protected readonly permits = computed<Permit[]>(() => {
    this.permitsVersion();
    const stored = this.storage.get<Permit[] | null>(this.permitsKey(), null);
    if (stored) return stored;
    // Illustrative example until the investor adds their own.
    return [
      {
        id: 'example',
        kind: 'dire',
        holder: this.locale.t('aftercare.exampleHolder'),
        expires: null,
        lead: 60,
      },
    ];
  });

  protected period(d: Deadline): string {
    const prev = fromIso(d.due.nominal);
    prev.setUTCDate(1);
    prev.setUTCMonth(prev.getUTCMonth() - 1);
    const month = new Intl.DateTimeFormat(INTL_LOCALE[this.lang()], {
      month: 'long',
      timeZone: 'UTC',
    }).format(prev);
    const key =
      d.obligation.id === 'inss'
        ? 'payroll'
        : d.obligation.id === 'vat-return'
          ? 'vat'
          : 'salaries';
    return this.locale.t(`aftercare.period.${key}`, { month });
  }

  protected weekdayShort(iso: string): string {
    return new Intl.DateTimeFormat(INTL_LOCALE[this.lang()], {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(fromIso(iso));
  }

  protected monthShort(iso: string): string {
    return new Intl.DateTimeFormat(INTL_LOCALE[this.lang()], {
      month: 'short',
      timeZone: 'UTC',
    }).format(fromIso(iso));
  }

  protected reminderDate(p: Permit): string {
    if (!p.expires) return '';
    const d = fromIso(p.expires);
    d.setUTCDate(d.getUTCDate() - p.lead);
    return toIso(d);
  }

  protected onTabKey(event: KeyboardEvent): void {
    const dir = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    event.preventDefault();
    const rtl = this.locale.dir() === 'rtl' ? -1 : 1;
    const i = (this.tabs.indexOf(this.tab()) + dir * rtl + this.tabs.length) % this.tabs.length;
    this.tab.set(this.tabs[i]);
    this.document.getElementById(`tab-${this.tabs[i]}`)?.focus();
  }

  protected addPermit(event: Event): void {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const f = new FormData(form);
    const holder = String(f.get('holder') ?? '').trim();
    const expires = String(f.get('expires') ?? '');
    if (!holder || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return;
    const permit: Permit = {
      id: `p${Date.now()}`,
      kind: (f.get('kind') as Permit['kind']) ?? 'dire',
      holder,
      expires,
      lead: Number(f.get('lead')) || 60,
    };
    const list = this.permits().filter((p) => p.id !== 'example');
    this.savePermits(
      [...list, permit].sort((a, b) => (a.expires ?? '').localeCompare(b.expires ?? '')),
    );
    form.reset();
  }

  protected removePermit(id: string): void {
    this.savePermits(this.permits().filter((p) => p.id !== id));
  }

  protected toggleChannel(c: Channel): void {
    this.channels.update((v) => ({ ...v, [c]: !v[c] }));
    this.storage.set('aftercare:channels', this.channels());
  }

  /** Every dated deadline and renewal reminder as an .ics file (all-day events). */
  protected downloadIcs(): void {
    const lang = this.lang();
    const holidays = this.holidaySet();
    const d = this.data.value();
    if (!d) return;
    const stamp = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
    const events: string[] = [];
    const add = (uid: string, date: string, summary: string, description: string) => {
      const start = date.replace(/-/g, '');
      const end = fromIso(date);
      end.setUTCDate(end.getUTCDate() + 1);
      events.push(
        [
          'BEGIN:VEVENT',
          `UID:${uid}@tiva`,
          `DTSTAMP:${stamp}`,
          `DTSTART;VALUE=DATE:${start}`,
          `DTEND;VALUE=DATE:${toIso(end).replace(/-/g, '')}`,
          `SUMMARY:${ics(summary)}`,
          `DESCRIPTION:${ics(description)}`,
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          'TRIGGER:-P3D',
          `DESCRIPTION:${ics(summary)}`,
          'END:VALARM',
          'END:VEVENT',
        ].join('\r\n'),
      );
    };
    for (const o of d.obligations) {
      const count = MONTHLY.includes(o.id) ? 6 : 2;
      for (const due of nextDueDates(o.schedule, this.today, holidays, count)) {
        const shifted = due.shifted
          ? ` ${this.locale.t('aftercare.icsShifted', { date: formatDate(due.nominal, lang, 'long') })}`
          : '';
        add(
          `${o.id}-${due.date}`,
          due.date,
          pickText(o.title, lang),
          `${pickText(o.frequency, lang)}.${shifted}`,
        );
      }
    }
    for (const p of this.permits()) {
      const r = this.reminderDate(p);
      if (!r) continue;
      const title = `${this.locale.t(`aftercare.permitKinds.${p.kind}`)} · ${p.holder}`;
      add(
        `${p.id}-renewal`,
        r,
        this.locale.t('aftercare.icsRenew', { title }),
        this.locale.t('aftercare.icsExpires', { date: formatDate(p.expires!, lang, 'long') }),
      );
    }
    const body = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Tiva//Aftercare calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...events,
      'END:VCALENDAR',
      '',
    ].join('\r\n');
    downloadFile(this.document, 'tiva-aftercare.ics', body, 'text/calendar;charset=utf-8');
  }

  private savePermits(list: Permit[]): void {
    this.storage.set(this.permitsKey(), list);
    this.permitsVersion.update((v) => v + 1);
  }

  private permitsKey(): string {
    return `aftercare:permits:${this.owner()}`;
  }

  private holidayName(iso: string, holidays: Holiday[]): string | null {
    const h = holidays.find((x) => x.date === iso);
    return h ? pickText(h.name, this.lang()) : null;
  }

  private monthLabel(iso: string, style: 'long' | 'short'): string {
    return new Intl.DateTimeFormat(INTL_LOCALE[this.lang()], {
      month: style,
      year: 'numeric',
      timeZone: 'UTC',
    }).format(fromIso(iso));
  }
}

/** Escapes text for an iCalendar property value. */
function ics(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}
