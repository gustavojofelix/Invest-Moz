import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TOPICS, type TopicId } from '@core/domain/types';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { LocPipe, MoneyPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { AssessmentService, EnquiryRepository, ProjectRepository } from '@core/ports';
import { CheckboxChip } from '@shared/ui/checkbox-chip';
import { FieldError } from '@shared/ui/field-error';
import { SectionLabel } from '@shared/ui/section-label';
import { copyText, enquiryText, mailtoHref } from './enquiry-text';
import { Icon } from '@shared/ui/icon';

const SERVICES = ['incorporation', 'investment', 'licensing', 'tax', 'labour', 'exchange'] as const;

function atLeastOne(group: AbstractControl): ValidationErrors | null {
  return Object.values(group.value as Record<string, boolean>).some(Boolean)
    ? null
    : { areasRequired: true };
}

@Component({
  selector: 'im-enquiry-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Icon,
    ReactiveFormsModule,
    RouterLink,
    TranslocoDirective,
    LocPipe,
    MoneyPipe,
    CheckboxChip,
    FieldError,
    SectionLabel,
  ],
  templateUrl: './enquiry-page.html',
  styles: `
    .service {
      padding: 0.875rem 0;
      border-bottom: 1px solid var(--rule);
    }
    .attach {
      border: 1px solid var(--rule-strong);
      background: var(--panel);
    }
    .attach summary {
      display: flex;
      align-items: center;
      min-height: 2.75rem;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-weight: 700;
    }
  `,
})
export class EnquiryPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly repo = inject(EnquiryRepository);
  private readonly projects = inject(ProjectRepository);
  private readonly engine = inject(AssessmentService);
  private readonly transloco = inject(TranslocoService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly services = SERVICES;
  protected readonly topics = TOPICS;
  protected readonly provinceNames = PROVINCE_NAMES;
  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly copied = signal<boolean | null>(null);
  protected readonly attach = signal(true);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    company: ['', [Validators.required, Validators.maxLength(160)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    phone: ['', [Validators.pattern(/^\+?[0-9 ()-]{7,20}$/)]],
    areas: this.fb.group(
      Object.fromEntries(TOPICS.map((t) => [t, false])) as Record<TopicId, boolean>,
      { validators: atLeastOne },
    ),
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(3000)]],
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  protected readonly project = resource({
    params: () => this.projects.currentRef(),
    loader: async ({ params: ref }) => {
      const p = ref ? await this.projects.get(ref) : null;
      if (!p) return null;
      const a = await this.engine.assess(p);
      return { project: p, assessment: a };
    },
  });

  protected readonly fallback = computed(() => {
    this.formValue();
    const v = this.form.getRawValue();
    const l = this.lang();
    const t = (k: string) => this.transloco.translate(k);
    const snapshot = this.snapshot();
    const { subject, body } = enquiryText(
      {
        ...v,
        areasLabels: TOPICS.filter((k) => v.areas[k]).map((k) => t(`topics.${k}`)),
        projectSnapshot: snapshot,
      },
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

  constructor() {
    // Pre-select sensible areas when a project is in context.
    effect(() => {
      const r = this.project.value();
      if (!r) return;
      untracked(() => {
        const areas = this.form.controls.areas;
        if (Object.values(areas.value).some(Boolean)) return;
        const pick: TopicId[] = ['companies', 'investment'];
        if (
          r.assessment.factTriggers.some((t) =>
            ['loan', 'fees_abroad', 'treaty'].includes(t.trigger),
          )
        )
          pick.push('tax', 'exchange');
        if (r.project.input.needsLand) pick.push('land');
        if (r.project.input.foreignWorkers > 0) pick.push('immigration');
        pick.forEach((k) => areas.controls[k].setValue(true));
      });
    });
  }

  private snapshot() {
    const r = this.project.value();
    if (!r || !this.attach()) return undefined;
    return {
      projectRef: r.project.ref,
      input: r.project.input,
      vehicle: r.assessment.vehicle.recommended,
      summary: r.project.summary,
    };
  }

  protected invalid(name: 'name' | 'company' | 'email' | 'phone' | 'message'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      queueMicrotask(() =>
        this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    this.sending.set(true);
    const v = this.form.getRawValue();
    const enquiry = await this.repo.create({
      locale: this.lang(),
      name: v.name.trim(),
      company: v.company.trim(),
      email: v.email.trim(),
      phone: v.phone.trim() || undefined,
      areas: TOPICS.filter((k) => v.areas[k]),
      message: v.message.trim(),
      projectSnapshot: this.snapshot(),
    });
    await this.router.navigate(['/', this.lang(), 'contact', 'sent', enquiry.ref]);
  }

  protected async copy(): Promise<void> {
    this.copied.set(await copyText(this.fallback().text));
  }
}
