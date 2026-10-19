import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LucideArrowLeft, LucideCheck, LucideMail, LucidePhone } from '@lucide/angular';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { RULE_SET } from '@core/domain/rule-set.data';
import type { EnquiryStatus } from '@core/domain/types';
import { ImDatePipe, LocPipe, MoneyPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { EnquiryRepository } from '@core/ports';
import { EmptyState } from '@shared/ui/empty-state';
import { SectionLabel } from '@shared/ui/section-label';
import { Skeleton } from '@shared/ui/skeleton';
import { StatusPill } from '@shared/ui/status-pill';
import { STATUSES } from './inbox-page';

@Component({
  selector: 'im-inbox-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, TranslocoDirective, ImDatePipe, LocPipe, MoneyPipe, EmptyState, SectionLabel, Skeleton, StatusPill, LucideArrowLeft, LucideMail, LucidePhone, LucideCheck],
  templateUrl: './inbox-detail.html',
  styles: `
    .steps {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      border: 1px solid var(--rule-strong);
      border-radius: var(--radius);
      overflow: hidden;
    }
    .steps button {
      min-height: 2.75rem;
      padding: 0.375rem 0.5rem;
      background: var(--paper);
      border: 0;
      font-size: 0.875rem;
      color: var(--muted);
      line-height: 1.2;
    }
    .steps button + button {
      border-left: 1px solid var(--rule-strong);
    }
    .steps button.reached {
      color: var(--ink);
      background: var(--panel);
    }
    .steps button[aria-pressed='true'] {
      background: var(--ink);
      color: var(--surface);
      font-weight: 700;
    }
    .block-title {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      border-bottom: 1px solid var(--ink);
      padding-bottom: 0.5rem;
    }
  `,
})
export class InboxDetail {
  readonly ref = input.required<string>();
  private readonly repo = inject(EnquiryRepository);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly statuses = STATUSES;
  protected readonly provinceNames = PROVINCE_NAMES;
  protected readonly note = signal('');
  protected readonly saved = signal(false);
  protected readonly loaded = this.repo.loaded;
  protected readonly enquiry = computed(() => this.repo.enquiries().find((e) => e.ref === this.ref()) ?? null);
  protected readonly statusIndex = computed(() => STATUSES.indexOf(this.enquiry()?.status ?? 'new'));
  protected readonly vehicleName = computed(() => {
    const v = this.enquiry()?.projectSnapshot?.vehicle;
    return RULE_SET.vehicles.options.find((o) => o.vehicle === v)?.name;
  });

  constructor() {
    void this.repo.load();
    effect(() => {
      const ref = this.ref();
      if (this.enquiry()) untracked(() => this.repo.markSeen(ref));
    });
  }

  protected async setStatus(status: EnquiryStatus): Promise<void> {
    await this.repo.updateStatus(this.ref(), status);
    this.flash();
  }

  protected async addNote(event: Event): Promise<void> {
    event.preventDefault();
    const text = this.note().trim();
    if (!text) return;
    await this.repo.addNote(this.ref(), text);
    this.note.set('');
    this.flash();
  }

  private flash(): void {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 1800);
  }
}
