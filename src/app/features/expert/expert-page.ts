import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { pickText } from '@core/domain/text';
import type { Enquiry } from '@core/domain/types';
import { LocPipe, formatDate, formatMoney, formatNumber } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import {
  AssessmentService,
  EnquiryRepository,
  ProjectRepository,
  ReferenceData,
} from '@core/ports';
import { FieldError } from '@shared/ui/field-error';
import { Icon } from '@shared/ui/icon';
import { ExpertDirectory } from './experts';
import { backLink, callSlots, CALL_TIMES } from './expert-util';

/** 9 · Talk to an expert: Tax Advisory or a free public body, with explicit consent. */
@Component({
  selector: 'im-expert-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, ReactiveFormsModule, RouterLink, TranslocoDirective, LocPipe, FieldError],
  templateUrl: './expert-page.html',
  styles: `
    .choice {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.875rem;
      border: 1px solid var(--rule);
      border-radius: var(--radius-lg);
      background: var(--paper);
      cursor: pointer;
    }
    .choice:hover {
      border-color: var(--brand);
    }
    .choice:has(input:checked) {
      border: 2px solid var(--brand);
      padding: calc(0.875rem - 1px);
    }
    .choice:has(input:focus-visible) {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
    .choice input,
    .consent input {
      width: 1.125rem;
      height: 1.125rem;
      margin-top: 0.1875rem;
      flex: none;
      accent-color: var(--brand);
    }
    .logo {
      height: 2.5rem;
      width: auto;
    }
    :host-context([data-theme='dark']) .logo {
      background: #fff;
      border-radius: var(--radius-sm);
      padding: 0.25rem 0.375rem;
    }
    :host-context([dir='rtl']) .flip {
      transform: scaleX(-1);
    }
  `,
})
export class ExpertPage {
  /** `?from=` (chat, roadmap, incentives, map…) for the back link. */
  readonly from = input<string>();
  /** `?expert=` preselects an expert. */
  readonly expert = input<string>();
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly repo = inject(EnquiryRepository);
  private readonly projects = inject(ProjectRepository);
  private readonly engine = inject(AssessmentService);
  private readonly reference = inject(ReferenceData);
  private readonly directory = inject(ExpertDirectory);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly times = CALL_TIMES;

  protected readonly form = this.fb.group({
    expertId: ['tax-advisory', Validators.required],
    name: ['', [Validators.required, Validators.maxLength(120)]],
    company: ['', [Validators.required, Validators.maxLength(160)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    phone: ['', [Validators.pattern(/^\+?[0-9 ()-]{7,20}$/)]],
    day: ['', Validators.required],
    time: [CALL_TIMES[0] as string, Validators.required],
    note: ['', [Validators.maxLength(1000)]],
    consent: [false, Validators.requiredTrue],
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  protected readonly experts = resource({ loader: () => this.directory.all() });
  protected readonly partners = computed(() =>
    (this.experts.value() ?? []).filter((e) => e.kind === 'partner'),
  );
  protected readonly publicBodies = computed(() =>
    (this.experts.value() ?? []).filter((e) => e.kind === 'public'),
  );
  protected readonly chosen = computed(() =>
    (this.experts.value() ?? []).find((e) => e.id === this.value().expertId),
  );

  protected readonly days = resource({
    loader: async () => callSlots(new Date(), await this.reference.holidays()),
  });

  protected readonly project = resource({
    params: () => this.projects.currentRef(),
    loader: async ({ params: ref }) => {
      const p = ref ? await this.projects.get(ref) : null;
      if (!p) return null;
      const [assessment, countries] = await Promise.all([
        this.engine.assess(p),
        this.reference.countries(),
      ]);
      return { project: p, assessment, countries };
    },
  });

  /** One-line summary shown before consent (what will be shared). */
  protected readonly summary = computed(() => {
    const r = this.project.value();
    if (!r) return null;
    const l = this.lang();
    const i = r.project.input;
    const country = r.countries.find((c) => c.code === i.investorCountry);
    return {
      title: pickText(r.project.title, l),
      ref: r.project.ref,
      facts: [
        pickText(PROVINCE_NAMES[i.province], l),
        formatMoney(i.investmentUsd, 'USD', l),
        formatNumber(i.workers, l),
        country ? pickText(country.name, l) : i.investorCountry,
      ],
      text: pickText(r.project.summary, l),
    };
  });

  protected readonly back = computed(() =>
    backLink(this.from(), this.lang(), this.projects.currentRef()),
  );

  protected dayLabel(iso: string): string {
    return `${formatDate(iso, this.lang(), 'weekday')}, ${formatDate(iso, this.lang(), 'medium')}`;
  }

  constructor() {
    effect(() => {
      const days = this.days.value();
      const id = this.expert();
      untracked(() => {
        if (days?.length && !this.form.controls.day.value) this.form.controls.day.setValue(days[0]);
        if (id) this.form.controls.expertId.setValue(id);
      });
    });
  }

  protected invalid(name: 'name' | 'company' | 'email' | 'phone' | 'consent'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    const expert = this.chosen();
    if (this.form.invalid || !expert) {
      queueMicrotask(() =>
        this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    this.sending.set(true);
    const v = this.form.getRawValue();
    const r = this.project.value();
    const snapshot: Enquiry['projectSnapshot'] = r
      ? {
          projectRef: r.project.ref,
          input: r.project.input,
          vehicle: r.assessment.vehicle.recommended,
          summary: r.project.summary,
        }
      : undefined;
    const now = new Date().toISOString();
    try {
      const enquiry = await this.repo.create({
        locale: this.lang(),
        name: v.name.trim(),
        company: v.company.trim(),
        email: v.email.trim(),
        phone: v.phone.trim() || undefined,
        areas: expert.areas,
        message: v.note.trim() || (snapshot ? pickText(snapshot.summary, this.lang()) : '—'),
        projectSnapshot: snapshot,
        expertId: expert.id,
        consent: { shareSummary: v.consent, at: now },
        callSlot: `${v.day}T${v.time}:00+02:00`,
        channel: 'web',
      });
      await this.router.navigate(['/', this.lang(), 'expert', 'sent', enquiry.ref]);
    } finally {
      this.sending.set(false);
    }
  }
}
