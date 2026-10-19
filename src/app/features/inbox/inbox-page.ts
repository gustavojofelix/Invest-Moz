import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LucideLogOut, LucideSearch } from '@lucide/angular';
import { normalize } from '@core/domain/text';
import type { Enquiry, EnquiryStatus } from '@core/domain/types';
import { ImDatePipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { AuthService, EnquiryRepository } from '@core/ports';
import { EmptyState } from '@shared/ui/empty-state';
import { SectionLabel } from '@shared/ui/section-label';
import { Skeleton } from '@shared/ui/skeleton';
import { StatusPill } from '@shared/ui/status-pill';

export const STATUSES: EnquiryStatus[] = ['new', 'in_review', 'quoted', 'won'];

@Component({
  selector: 'im-inbox-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, TranslocoDirective, ImDatePipe, EmptyState, SectionLabel, Skeleton, StatusPill, LucideSearch, LucideLogOut],
  templateUrl: './inbox-page.html',
  styles: `
    .stat {
      padding: 1rem 1.25rem 1rem 0;
      border-top: 1px solid var(--ink);
    }
    .filter {
      min-height: 2.75rem;
      padding: 0.375rem 0.875rem;
      border: 1px solid var(--rule-strong);
      border-radius: var(--radius);
      background: var(--paper);
      font-size: 0.9375rem;
      white-space: nowrap;
    }
    .filter[aria-pressed='true'] {
      background: var(--ink);
      border-color: var(--ink);
      color: var(--surface);
      font-weight: 700;
    }
    .row {
      display: grid;
      gap: 0.375rem;
      padding: 1rem 0.75rem;
      border-bottom: 1px solid var(--rule);
      text-decoration: none;
      color: var(--ink);
      position: relative;
    }
    .row:hover {
      background: var(--panel);
    }
    .row.fresh {
      background: var(--highlight-tint);
    }
    .row.fresh::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--accent);
    }
    @media (min-width: 768px) {
      .row {
        grid-template-columns: 9rem minmax(0, 1fr) 9rem 8.5rem;
        align-items: center;
        gap: 1.25rem;
      }
    }
  `,
})
export class InboxPage {
  private readonly repo = inject(EnquiryRepository);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly statuses = STATUSES;
  protected readonly filter = signal<EnquiryStatus | 'all'>('all');
  protected readonly query = signal('');
  protected readonly loaded = this.repo.loaded;
  protected readonly user = this.auth.user;

  protected readonly counts = computed(() => {
    const all = this.repo.enquiries();
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, all.filter((e) => e.status === s).length])) as Record<EnquiryStatus, number>;
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return { total: all.length, byStatus, week: all.filter((e) => new Date(e.createdAt).getTime() >= weekAgo).length };
  });

  protected readonly rows = computed(() => {
    const f = this.filter();
    const q = normalize(this.query());
    return this.repo
      .enquiries()
      .filter((e) => f === 'all' || e.status === f)
      .filter((e) => !q || normalize([e.ref, e.name, e.company, e.email, e.message].join(' ')).includes(q));
  });

  constructor() {
    void this.repo.load();
  }

  protected isNew(e: Enquiry): boolean {
    return this.repo.isUnseen(e.ref);
  }

  protected clearFilters(): void {
    this.filter.set('all');
    this.query.set('');
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/', this.lang()]);
  }
}
