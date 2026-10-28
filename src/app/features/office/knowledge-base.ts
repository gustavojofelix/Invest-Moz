import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { RULE_SET } from '@core/domain/rule-set.data';
import { normalize, pickText } from '@core/domain/text';
import type { LocalizedText, RefId, TopicId } from '@core/domain/types';
import { ImDatePipe, LocPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { KnowledgeBase, QaService } from '@core/ports';
import { Icon } from '@shared/ui/icon';
import { linkedRules, type LinkedItem } from './linked-rules';
import { OfficeData, type DiplomaStatus } from './office-data';
import { ValidationStore } from './validation-store';

interface DiplomaRow {
  refId: RefId;
  instrument: string;
  title: LocalizedText;
  topic: TopicId;
  version: number;
  status: DiplomaStatus;
  effective?: string;
  revokedBy?: string;
  linked: LinkedItem[];
}

const STATUSES: DiplomaStatus[] = ['active', 'amended', 'under_review', 'revoked'];

/** 19 · Legal knowledge base: versioned diplomas, statuses and the rules that cite them. */
@Component({
  selector: 'im-knowledge-base-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, TranslocoDirective, ImDatePipe, LocPipe, Icon],
  styleUrl: './office.css',
  template: `
    <div *transloco="let t" class="office-page">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <h1 class="font-serif text-3xl font-medium sm:text-[2rem]">{{ t('office.kb.title') }}</h1>
          <p class="text-[0.9375rem] text-muted">{{ t('office.kb.intro') }}</p>
        </div>
        <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label class="sr-only" for="kb-search">{{ t('office.kb.search') }}</label>
          <input
            id="kb-search"
            type="search"
            class="input sm:w-60"
            [placeholder]="t('office.kb.search')"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
          />
          <a
            class="btn btn-primary btn-sm"
            [routerLink]="['/', lang(), 'office', 'queue']"
            [queryParams]="{ upload: 1 }"
          >
            <svg imIcon="plus" [size]="16" aria-hidden="true"></svg>{{ t('office.kb.add') }}
          </a>
        </div>
      </header>

      <div
        class="flex flex-wrap items-center gap-2"
        role="group"
        [attr.aria-label]="t('office.kb.filterTopic')"
      >
        <button
          type="button"
          class="pill"
          [attr.aria-pressed]="topic() === 'all'"
          (click)="topic.set('all')"
        >
          {{ t('office.kb.all') }}
        </button>
        @for (tp of topics(); track tp) {
          <button
            type="button"
            class="pill"
            [attr.aria-pressed]="topic() === tp"
            (click)="topic.set(tp)"
          >
            {{ t('topics.' + tp) }}
          </button>
        }
      </div>
      <div
        class="flex flex-wrap items-center gap-2"
        role="group"
        [attr.aria-label]="t('office.kb.filterStatus')"
      >
        <button
          type="button"
          class="pill"
          [attr.aria-pressed]="status() === 'all'"
          (click)="status.set('all')"
        >
          {{ t('office.kb.anyStatus') }}
        </button>
        @for (s of statuses; track s) {
          <button
            type="button"
            class="pill"
            [attr.aria-pressed]="status() === s"
            (click)="status.set(s)"
          >
            {{ t('office.kb.status.' + s) }} · {{ counts()[s] }}
          </button>
        }
      </div>

      <div class="card overflow-hidden">
        <div
          class="table-wrap"
          tabindex="0"
          role="region"
          [attr.aria-label]="t('office.kb.tableCaption')"
        >
          <table class="office-table panel-table">
            <caption class="text-start">
              <span class="text-sm text-muted"
                >{{ t('office.kb.tableCaption') }} ·
                {{ t('office.kb.count', { n: rows().length }) }}</span
              >
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ t('office.kb.col.diploma') }}</th>
                <th scope="col">{{ t('office.kb.col.subject') }}</th>
                <th scope="col">{{ t('office.kb.col.effective') }}</th>
                <th scope="col">{{ t('office.kb.col.version') }}</th>
                <th scope="col">{{ t('office.kb.col.status') }}</th>
                <th scope="col">{{ t('office.kb.col.linked') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.refId) {
                <tr>
                  <th scope="row">
                    <strong>{{ r.instrument }}</strong>
                  </th>
                  <td>{{ r.title | loc: lang() }}</td>
                  <td class="whitespace-nowrap">
                    @if (r.effective) {
                      {{ r.effective | imDate: lang() : 'medium' }}
                    } @else if (r.status === 'revoked') {
                      —
                    } @else {
                      <span class="text-muted">{{ t('office.toConfirm') }}</span>
                    }
                  </td>
                  <td class="font-mono">v{{ r.version }}</td>
                  <td>
                    <span class="flex flex-col items-start gap-1">
                      <span class="tag" [class]="tagClass(r.status)">
                        {{ t('office.kb.status.' + r.status) }}
                        @if (r.revokedBy) {
                          · {{ t('office.kb.revokedBy', { by: r.revokedBy }) }}
                        }
                      </span>
                      @if (inReview().has(r.refId)) {
                        <span class="tag tag-warn">{{ t('office.kb.summaryInReview') }}</span>
                      }
                    </span>
                  </td>
                  <td>
                    @if (r.linked.length) {
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm -ms-3"
                        [attr.aria-expanded]="expanded() === r.refId"
                        [attr.aria-controls]="'links-' + r.refId"
                        (click)="toggle(r.refId)"
                      >
                        {{ r.linked.length }}
                        <span class="sr-only"
                          >{{ t('office.kb.col.linked') }} · {{ r.instrument }}</span
                        >
                        <svg
                          [imIcon]="expanded() === r.refId ? 'chevron-up' : 'chevron-down'"
                          [size]="16"
                          aria-hidden="true"
                        ></svg>
                      </button>
                    } @else {
                      <span class="text-muted">0</span>
                    }
                  </td>
                </tr>
                @if (expanded() === r.refId) {
                  <tr [id]="'links-' + r.refId" class="bg-surface-alt">
                    <td colspan="6">
                      <div class="grid gap-4 md:grid-cols-3">
                        @for (k of kinds; track k) {
                          <div>
                            <h3 class="label-caps text-muted">
                              {{ t('office.kb.kind.' + k) }} · {{ byKind(r.linked, k).length }}
                            </h3>
                            <ul role="list" class="mt-1 flex flex-col gap-1 text-[0.8125rem]">
                              @for (l of byKind(r.linked, k); track l.table + l.id) {
                                <li>
                                  <span class="font-mono text-xs text-muted">{{
                                    t('office.kb.table.' + l.table)
                                  }}</span>
                                  · {{ l.title ? (l.title | loc: lang()) : l.id }}
                                </li>
                              } @empty {
                                <li class="text-muted">—</li>
                              }
                            </ul>
                          </div>
                        }
                      </div>
                    </td>
                  </tr>
                }
              } @empty {
                <tr>
                  <td colspan="6" class="text-muted">{{ t('office.kb.empty') }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Weekly Boletim da República scan -->
      @if (seed.value(); as s) {
        <section class="card flex flex-col gap-4 p-5" aria-labelledby="scan-title">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="scan-title" class="text-lg font-bold">{{ t('office.kb.scan.title') }}</h2>
              <p class="text-sm text-muted">{{ t('office.kb.scan.intro') }}</p>
            </div>
            <span class="tag tag-neutral">{{ t('office.demoData') }}</span>
          </div>
          <dl class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt class="label-caps text-muted">{{ t('office.kb.scan.last') }}</dt>
              <dd class="mt-1 font-bold">
                {{ s.diplomas.scan.lastScan | imDate: lang() : 'medium' }}
              </dd>
            </div>
            <div>
              <dt class="label-caps text-muted">{{ t('office.kb.scan.next') }}</dt>
              <dd class="mt-1 font-bold">
                {{ s.diplomas.scan.nextScan | imDate: lang() : 'medium' }}
              </dd>
            </div>
            <div>
              <dt class="label-caps text-muted">{{ t('office.kb.scan.issues') }}</dt>
              <dd class="mt-1 font-bold">{{ s.diplomas.scan.issuesRead }}</dd>
            </div>
            <div>
              <dt class="label-caps text-muted">{{ t('office.kb.scan.found') }}</dt>
              <dd class="mt-1 font-bold">{{ s.diplomas.scan.items.length }}</dd>
            </div>
          </dl>
          <ul role="list" class="flex flex-col divide-y divide-rule-soft">
            @for (i of s.diplomas.scan.items; track $index) {
              <li class="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span
                  ><strong>{{ i.instrument }}</strong> · {{ i.note | loc: lang() }}</span
                >
                <span
                  class="tag"
                  [class.tag-warn]="i.outcome === 'queued'"
                  [class.tag-ok]="i.outcome === 'published'"
                  [class.tag-neutral]="i.outcome === 'no_impact'"
                >
                  {{ t('office.kb.scan.outcome.' + i.outcome) }}
                </span>
              </li>
            }
          </ul>
          <p class="text-[0.8125rem] text-muted">{{ t('office.kb.scan.footer') }}</p>
        </section>
      }
    </div>
  `,
})
export class KnowledgeBasePage {
  private readonly kb = inject(KnowledgeBase);
  private readonly qa = inject(QaService);
  private readonly data = inject(OfficeData);
  private readonly queue = inject(ValidationStore);
  protected readonly lang = inject(LocaleService).lang;

  protected readonly statuses = STATUSES;
  protected readonly kinds = ['step', 'rule', 'answer'] as const;
  protected readonly query = signal('');
  protected readonly topic = signal<TopicId | 'all'>('all');
  protected readonly status = signal<DiplomaStatus | 'all'>('all');
  protected readonly expanded = signal<RefId | null>(null);

  protected readonly seed = resource({
    loader: async () => {
      const [refs, answers, diplomas] = await Promise.all([
        this.kb.all(),
        this.qa.answers(),
        this.data.diplomas(),
      ]);
      return { refs, diplomas, links: linkedRules(RULE_SET, answers) };
    },
  });

  private readonly all = computed<DiplomaRow[]>(() => {
    const s = this.seed.value();
    if (!s) return [];
    const versions = new Map(s.diplomas.versions.map((v) => [v.refId, v]));
    const base: DiplomaRow[] = s.refs.map((r) => {
      const v = versions.get(r.id);
      return {
        refId: r.id,
        instrument: r.instrument,
        title: r.title,
        topic: r.topic,
        version: v?.version ?? 1,
        status: v?.status ?? 'active',
        effective: v?.effective,
        revokedBy: v?.revokedBy,
        linked: s.links.get(r.id) ?? [],
      };
    });
    const extra: DiplomaRow[] = s.diplomas.extra.map((x) => ({
      ...x,
      linked: s.links.get(x.refId) ?? [],
    }));
    const rank = (r: DiplomaRow) => (r.status === 'revoked' ? 2 : r.effective ? 0 : 1);
    return [...base, ...extra].sort(
      (a, b) => rank(a) - rank(b) || (b.effective ?? '').localeCompare(a.effective ?? ''),
    );
  });

  protected readonly topics = computed(() => [...new Set(this.all().map((r) => r.topic))]);

  protected readonly counts = computed(
    () =>
      Object.fromEntries(
        STATUSES.map((s) => [s, this.all().filter((r) => r.status === s).length]),
      ) as Record<DiplomaStatus, number>,
  );

  protected readonly inReview = computed(
    () =>
      new Set(
        this.queue
          .pending()
          .filter((d) => d.kind === 'law_summary')
          .map((d) => d.refId),
      ),
  );

  protected readonly rows = computed(() => {
    const q = normalize(this.query());
    const tp = this.topic();
    const st = this.status();
    const lang = this.lang();
    return this.all().filter(
      (r) =>
        (tp === 'all' || r.topic === tp) &&
        (st === 'all' || r.status === st) &&
        (!q || normalize(`${r.instrument} ${pickText(r.title, lang)}`).includes(q)),
    );
  });

  protected byKind(items: LinkedItem[], kind: LinkedItem['kind']): LinkedItem[] {
    return items.filter((i) => i.kind === kind);
  }

  protected toggle(id: RefId): void {
    this.expanded.set(this.expanded() === id ? null : id);
  }

  protected tagClass(s: DiplomaStatus): string {
    return {
      active: 'tag tag-ok',
      amended: 'tag tag-neutral',
      under_review: 'tag tag-warn',
      revoked: 'tag tag-bad',
    }[s];
  }
}
