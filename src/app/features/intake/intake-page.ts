import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  resource,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  type AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  PROVINCES,
  type CapitalOrigin,
  type Project,
  type ProjectInput,
  type ProvinceCode,
} from '@core/domain/types';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { LocPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { ProjectRepository, ReferenceData } from '@core/ports';
import { FieldError } from '@shared/ui/field-error';
import { SectionLabel } from '@shared/ui/section-label';
import { Stepper } from '@shared/ui/stepper';
import { CheckboxChip } from '@shared/ui/checkbox-chip';
import { CountryCombobox } from './country-combobox';
import { Icon } from '@shared/ui/icon';

const FLAGS = [
  'importsGoods',
  'exports',
  'needsLand',
  'shareholderLoan',
  'feesAbroad',
  'temporaryImport',
] as const;
const CHECKS = ['vehicle', 'regime', 'licences', 'tax', 'labour', 'exchange'] as const;
const PREPARE_MS = 1500;

function integer(c: AbstractControl): ValidationErrors | null {
  return c.value == null || c.value === '' || Number.isInteger(Number(c.value))
    ? null
    : { integer: true };
}

function foreignWithinWorkers(group: AbstractControl): ValidationErrors | null {
  const workers = Number(group.get('workers')?.value ?? 0);
  const foreign = Number(group.get('foreignWorkers')?.value ?? 0);
  return foreign > workers ? { foreignExceedsWorkers: true } : null;
}

@Component({
  selector: 'im-intake-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Icon,
    ReactiveFormsModule,
    TranslocoDirective,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    LocPipe,
    FieldError,
    SectionLabel,
    Stepper,
    CheckboxChip,
    CountryCombobox,
  ],
  templateUrl: './intake-page.html',
  styles: `
    .menu {
      min-width: 18rem;
      max-width: calc(100vw - 2rem);
      padding: 0.25rem 0;
      background: var(--paper);
      border: 1px solid var(--ink);
      border-radius: var(--radius);
      box-shadow: var(--shadow-overlay);
      animation: im-rise 160ms var(--ease-out-soft);
    }
    .menu-item {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.625rem 0.875rem;
      min-height: 2.75rem;
      background: none;
      border: 0;
      color: var(--ink);
    }
    .menu-item:hover,
    .menu-item:focus {
      background: var(--panel);
      outline: none;
    }
    .seg {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      border: 1px solid var(--rule-strong);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .seg label {
      display: grid;
      place-items: center;
      min-height: 2.75rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.9375rem;
      text-align: center;
      cursor: pointer;
      background: var(--paper);
    }
    .seg label + label {
      border-left: 1px solid var(--rule-strong);
    }
    .seg input:checked + label {
      background: var(--brand);
      color: var(--brand-ink);
      font-weight: 700;
    }
    .seg input:focus-visible + label {
      outline: 2px solid var(--focus);
      outline-offset: -4px;
    }
    .memo-outline li {
      display: flex;
      gap: 0.75rem;
      padding: 0.625rem 0;
      border-bottom: 1px solid var(--rule);
      font-size: 0.9375rem;
    }
  `,
})
export class IntakePage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly repo = inject(ProjectRepository);
  private readonly reference = inject(ReferenceData);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly lang = inject(LocaleService).lang;

  protected readonly provinces = PROVINCES;
  protected readonly provinceNames = PROVINCE_NAMES;
  protected readonly flags = FLAGS;
  protected readonly checks = CHECKS;
  protected readonly capitals: CapitalOrigin[] = ['foreign', 'mixed', 'mozambican'];

  protected readonly examples = resource({ loader: () => this.repo.examples() });
  protected readonly countries = resource({ loader: () => this.reference.countries() });

  protected readonly submitted = signal(false);
  protected readonly preparing = signal(false);
  protected readonly checksDone = signal(0);
  protected readonly loadedExample = signal<Project | null>(null);

  protected readonly form = this.fb.group(
    {
      idea: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1500)]],
      province: ['' as ProvinceCode | '', Validators.required],
      capital: ['foreign' as CapitalOrigin, Validators.required],
      investorCountry: ['', Validators.required],
      investmentUsd: [
        null as number | null,
        [Validators.required, Validators.min(1000), Validators.max(50_000_000_000)],
      ],
      workers: [
        null as number | null,
        [Validators.required, Validators.min(0), Validators.max(1_000_000), integer],
      ],
      foreignWorkers: [0 as number | null, [Validators.required, Validators.min(0), integer]],
      importsGoods: [false],
      exports: [false],
      needsLand: [false],
      shareholderLoan: [false],
      feesAbroad: [false],
      temporaryImport: [false],
    },
    { validators: foreignWithinWorkers },
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Mozambican capital: no foreign investor country.
    this.form.controls.capital.valueChanges
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((capital) => {
        const country = this.form.controls.investorCountry;
        if (capital === 'mozambican') {
          country.setValue('MZ');
          country.disable();
        } else {
          if (country.value === 'MZ') country.setValue('');
          country.enable();
        }
      });
    // Any edit after loading an example makes it a new project.
    this.form.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => {
      const ex = this.loadedExample();
      if (ex && !sameInput(this.value(), ex.input)) this.loadedExample.set(null);
    });
  }

  protected checkLabels(t: (key: string) => string): string[] {
    return CHECKS.map((c) => t(`intake.preparing.checks.${c}`));
  }

  protected loadExample(p: Project): void {
    this.form.reset();
    this.form.controls.investorCountry.enable();
    this.form.setValue({ ...p.input });
    if (p.input.capital === 'mozambican') this.form.controls.investorCountry.disable();
    this.loadedExample.set(p);
    this.submitted.set(false);
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      queueMicrotask(() => {
        const first = this.host.nativeElement.querySelector<HTMLElement>(
          '[aria-invalid="true"], .ng-invalid:not(form) input, input.ng-invalid, select.ng-invalid, textarea.ng-invalid',
        );
        first?.focus();
      });
      return;
    }
    const input = this.value();
    const example = this.loadedExample();
    const project =
      example && sameInput(input, example.input) ? example : await this.repo.create(input);
    this.repo.setCurrent(project.ref);

    this.preparing.set(true);
    this.checksDone.set(0);
    window.scrollTo({ top: 0 });
    const step = PREPARE_MS / (CHECKS.length + 1);
    for (let i = 1; i <= CHECKS.length; i++) {
      await wait(step);
      this.checksDone.set(i);
    }
    await wait(step);
    await this.router.navigate(['/', this.lang(), 'assessment', project.ref]);
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  private value(): ProjectInput {
    const v = this.form.getRawValue();
    return {
      idea: v.idea.trim(),
      province: v.province as ProvinceCode,
      capital: v.capital,
      investorCountry: v.capital === 'mozambican' ? 'MZ' : v.investorCountry,
      investmentUsd: Number(v.investmentUsd),
      workers: Number(v.workers),
      foreignWorkers: Number(v.foreignWorkers ?? 0),
      importsGoods: v.importsGoods,
      exports: v.exports,
      needsLand: v.needsLand,
      shareholderLoan: v.shareholderLoan,
      feesAbroad: v.feesAbroad,
      temporaryImport: v.temporaryImport,
    };
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function sameInput(a: ProjectInput, b: ProjectInput): boolean {
  return (Object.keys(b) as (keyof ProjectInput)[]).every((k) => a[k] === b[k]);
}
