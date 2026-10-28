import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { RULE_SET } from '@core/domain/rule-set.data';
import { pickText } from '@core/domain/text';
import { ImDatePipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { ReferenceData } from '@core/ports';
import { Icon } from '@shared/ui/icon';
import { OfficeData, type QueueDraft } from './office-data';
import { ValidationStore } from './validation-store';

/** 18 · Validation queue: AI drafts wait for a lawyer's approval. */
@Component({
  selector: 'im-validation-queue-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, FormsModule, RouterLink, TranslocoDirective, ImDatePipe, Icon],
  template: `
    <div *transloco="let t" class="office-page">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-col gap-1.5">
          <h1 class="font-serif text-3xl font-medium sm:text-[2rem]">
            {{ t('office.queue.title') }}
          </h1>
          <p class="text-[0.9375rem] text-muted">{{ t('office.queue.intro') }}</p>
        </div>
        <button
          type="button"
          class="btn btn-outline btn-sm"
          [attr.aria-expanded]="uploadOpen()"
          aria-controls="upload-panel"
          (click)="uploadOpen.set(!uploadOpen())"
        >
          <svg imIcon="upload" [size]="16" aria-hidden="true"></svg>{{ t('office.queue.upload') }}
        </button>
      </header>

      @if (uploadOpen()) {
        <form
          id="upload-panel"
          class="card flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
          (submit)="upload($event)"
        >
          <div class="flex-1">
            <label class="field-label" for="upload-name">{{ t('office.queue.uploadName') }}</label>
            <input
              id="upload-name"
              name="uploadName"
              class="input"
              [placeholder]="t('office.queue.uploadPlaceholder')"
              [ngModel]="uploadName()"
              (ngModelChange)="uploadName.set($event)"
              maxlength="120"
            />
            <span class="field-hint">{{ t('office.queue.uploadHint') }}</span>
          </div>
          <div class="flex-1">
            <label class="field-label" for="upload-file">{{ t('office.queue.uploadFile') }}</label>
            <input id="upload-file" type="file" accept=".pdf" class="input" />
          </div>
          <button type="submit" class="btn btn-primary btn-sm" [disabled]="!uploadName().trim()">
            {{ t('office.queue.uploadSubmit') }}
          </button>
        </form>
      }

      <div class="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <!-- Draft list -->
        <div class="card overflow-hidden">
          <h2 class="list-head">{{ t('office.queue.awaiting') }} · {{ store.pending().length }}</h2>
          <ul role="list">
            @for (d of store.pending(); track d.id) {
              <li>
                <ng-container *ngTemplateOutlet="row; context: { $implicit: d }" />
              </li>
            } @empty {
              <li class="px-4 py-5 text-sm text-muted">{{ t('office.queue.empty') }}</li>
            }
          </ul>
          @if (store.reviewed().length) {
            <h2 class="list-head border-t border-rule">
              {{ t('office.queue.reviewed') }} · {{ store.reviewed().length }}
            </h2>
            <ul role="list">
              @for (d of store.reviewed(); track d.id) {
                <li>
                  <ng-container *ngTemplateOutlet="row; context: { $implicit: d }" />
                </li>
              }
            </ul>
          }
          <ng-template #row let-d>
            <button
              type="button"
              class="draft"
              [attr.aria-pressed]="selected()?.id === d.id"
              (click)="select(d.id)"
            >
              <strong class="text-[0.90625rem]"
                >{{ t('office.queue.kind.' + d.kind) }} · {{ d.instrument }}</strong
              >
              <span class="text-[0.8125rem] text-ink-soft">{{ meta(d) }}</span>
              @if (d.affectsRoadmaps && d.kind === 'law_summary') {
                <span class="text-xs font-bold text-bad-ink">{{ t('office.queue.affects') }}</span>
              }
              @if (store.decisions()[d.id]; as dec) {
                <span
                  class="tag self-start"
                  [class.tag-ok]="dec === 'approved'"
                  [class.tag-bad]="dec === 'rejected'"
                >
                  {{ t('office.queue.decision.' + dec) }}
                </span>
              }
            </button>
          </ng-template>
        </div>

        <!-- Selected draft -->
        @if (selected(); as d) {
          <section class="card flex flex-col gap-5 p-5 sm:p-6" aria-labelledby="draft-title">
            <div class="flex flex-wrap justify-between gap-3">
              <div class="flex min-w-0 flex-col gap-1">
                <h2 id="draft-title" class="text-xl font-bold">
                  {{ t('office.queue.kind.' + d.kind) }} · {{ d.instrument }}
                </h2>
                <p class="text-[0.8125rem] text-muted">
                  @if (d.effective) {
                    {{
                      t('office.queue.effective', { date: d.effective | imDate: lang() : 'medium' })
                    }}
                    ·
                  }
                  {{ context(d) }}
                </p>
              </div>
              @switch (store.decisions()[d.id]) {
                @case ('approved') {
                  <span class="tag tag-ok self-start">{{
                    t('office.queue.decision.approved')
                  }}</span>
                }
                @case ('rejected') {
                  <span class="tag tag-bad self-start">{{
                    t('office.queue.decision.rejected')
                  }}</span>
                }
                @default {
                  <span class="tag tag-warn self-start">
                    {{
                      store.edited(d.id) ? t('office.queue.draftEdited') : t('office.queue.draftAi')
                    }}
                  </span>
                }
              }
            </div>

            <div class="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
              <div class="flex flex-col gap-2">
                <h3 class="eyebrow">
                  {{ t('office.queue.aiSummary', { lang: lang().toUpperCase() }) }}
                </h3>
                @if (editing()) {
                  <label class="sr-only" for="edit-summary">{{
                    t('office.queue.editLabel')
                  }}</label>
                  <textarea
                    id="edit-summary"
                    class="input"
                    rows="7"
                    [ngModel]="editText()"
                    (ngModelChange)="editText.set($event)"
                  ></textarea>
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      [disabled]="!editText().trim()"
                      (click)="saveEdit(d)"
                    >
                      {{ t('office.queue.saveEdit') }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="editing.set(false)"
                    >
                      {{ t('office.queue.cancel') }}
                    </button>
                  </div>
                } @else {
                  <p class="text-[0.90625rem] leading-relaxed">
                    {{ summary(d) || t('office.queue.uploadedSummary') }}
                  </p>
                }
              </div>
              <div class="flex flex-col gap-2 rounded-md bg-surface-alt p-4">
                <h3 class="label-caps text-muted">{{ t('office.queue.source') }}</h3>
                <p
                  class="text-[0.84375rem] leading-relaxed whitespace-pre-line text-ink-soft"
                  lang="pt"
                >
                  {{ d.official || t('office.queue.uploadedOfficial') }}
                </p>
                <p class="text-xs text-muted">{{ t('office.queue.illustrativeExcerpt') }}</p>
              </div>
            </div>

            @if (d.conversationId) {
              <a
                class="link self-start text-sm"
                [routerLink]="['/', lang(), 'office', 'conversations']"
                [queryParams]="{ c: d.conversationId }"
              >
                {{ t('office.queue.openConversation') }}
              </a>
            }

            <div>
              <label class="field-label" for="reviewer-note">{{ t('office.queue.note') }}</label>
              <textarea
                id="reviewer-note"
                class="input min-h-0!"
                rows="2"
                [placeholder]="t('office.queue.notePlaceholder')"
                [ngModel]="note()"
                (ngModelChange)="note.set($event)"
                maxlength="500"
              ></textarea>
            </div>

            <div class="flex flex-wrap gap-2.5">
              <button
                type="button"
                class="btn btn-primary"
                [disabled]="decided()"
                (click)="approve(d)"
              >
                <svg imIcon="badge-check" [size]="18" aria-hidden="true"></svg
                >{{ t('office.queue.approve') }}
              </button>
              <button
                type="button"
                class="btn btn-secondary"
                [disabled]="decided() || editing()"
                (click)="startEdit(d)"
              >
                <svg imIcon="pencil" [size]="18" aria-hidden="true"></svg
                >{{ t('office.queue.edit') }}
              </button>
              <button
                type="button"
                class="btn btn-danger"
                [disabled]="decided()"
                (click)="reject(d)"
              >
                <svg imIcon="circle-x" [size]="18" aria-hidden="true"></svg
                >{{ t('office.queue.reject') }}
              </button>
            </div>
            <p class="text-[0.78125rem] text-muted">
              {{ t('office.queue.logged') }} ·
              {{ t('office.queue.version', { n: store.version(d.id) }) }}
            </p>

            <!-- Audit log -->
            <div
              class="table-wrap"
              tabindex="0"
              role="region"
              [attr.aria-label]="t('office.queue.auditTitle')"
            >
              <table class="office-table">
                <caption class="text-start">
                  <span class="label-caps text-muted">{{ t('office.queue.auditTitle') }}</span>
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ t('office.queue.audit.time') }}</th>
                    <th scope="col">{{ t('office.queue.audit.action') }}</th>
                    <th scope="col">{{ t('office.queue.audit.reviewer') }}</th>
                    <th scope="col">{{ t('office.queue.audit.version') }}</th>
                    <th scope="col">{{ t('office.queue.audit.note') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (e of audit(); track e.at + e.action) {
                    <tr>
                      <td class="whitespace-nowrap">{{ e.at | imDate: lang() : 'datetime' }}</td>
                      <td>{{ t('office.queue.action.' + e.action) }}</td>
                      <td>{{ e.reviewer }}</td>
                      <td class="font-mono">v{{ e.version }}</td>
                      <td>{{ e.note ?? '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        }
      </div>

      <p class="sr-only" aria-live="polite">{{ announce() }}</p>

      <!-- Intelligence strip -->
      <section class="grid gap-4 sm:grid-cols-3" aria-labelledby="strip-title">
        <h2 id="strip-title" class="sr-only">{{ t('office.queue.stripTitle') }}</h2>
        <div class="card flex flex-col gap-1.5 p-4">
          <span class="label-caps text-muted">{{ t('office.queue.topSectors') }}</span>
          <span class="text-[0.9375rem]">{{ strip()?.sectors }}</span>
        </div>
        <div class="card flex flex-col gap-1.5 p-4">
          <span class="label-caps text-muted">{{ t('office.queue.topOrigins') }}</span>
          <span class="text-[0.9375rem]">{{ strip()?.origins }}</span>
        </div>
        <a
          class="card flex flex-col gap-1.5 p-4 no-underline hover:border-brand"
          [routerLink]="['/', lang(), 'office', 'intelligence']"
        >
          <span class="label-caps text-muted">{{ t('office.queue.unanswered') }}</span>
          <span class="text-[0.9375rem] text-ink">{{
            t('office.queue.unansweredCount', { n: strip()?.unanswered ?? 0 })
          }}</span>
        </a>
        <p class="text-xs text-muted sm:col-span-3">{{ t('office.demoData') }}</p>
      </section>
    </div>
  `,
  styleUrl: './office.css',
  styles: `
    .list-head {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--rule);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .draft {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      width: 100%;
      min-height: 2.75rem;
      padding: 0.875rem 1rem;
      border: 0;
      border-bottom: 1px solid var(--rule-soft);
      border-inline-start: 4px solid transparent;
      background: var(--paper);
      color: var(--ink);
      text-align: start;
      font: inherit;
    }
    .draft:hover {
      background: var(--panel);
    }
    .draft[aria-pressed='true'] {
      border-inline-start-color: var(--brand);
      background: var(--brand-tint);
    }
  `,
})
export class ValidationQueuePage {
  protected readonly store = inject(ValidationStore);
  private readonly data = inject(OfficeData);
  private readonly refData = inject(ReferenceData);
  private readonly locale = inject(LocaleService);
  protected readonly lang = this.locale.lang;

  private readonly selectedId = signal<string | null>(null);
  protected readonly note = signal('');
  protected readonly editing = signal(false);
  protected readonly editText = signal('');
  protected readonly announce = signal('');
  protected readonly uploadOpen = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.has('upload'),
  );
  protected readonly uploadName = signal('');

  protected readonly selected = computed<QueueDraft | null>(() => {
    const all = this.store.drafts();
    return all.find((d) => d.id === this.selectedId()) ?? this.store.pending()[0] ?? all[0] ?? null;
  });
  protected readonly decided = computed(() => {
    const d = this.selected();
    return !!d && !!this.store.decisions()[d.id];
  });
  protected readonly audit = computed(() => {
    const id = this.selected()?.id;
    return this.store.log().filter((e) => e.draftId === id);
  });

  private readonly intel = resource({
    loader: async () => {
      const [intel, countries] = await Promise.all([
        this.data.intelligence(),
        this.refData.countries(),
      ]);
      return { period: intel.periods[0], unanswered: intel.unanswered.length, countries };
    },
  });
  protected readonly strip = computed(() => {
    const v = this.intel.value();
    if (!v) return null;
    const lang = this.lang();
    const sectors = [...v.period.sectors]
      .sort((a, b) => b.roadmaps - a.roadmaps)
      .slice(0, 3)
      .map((s) => pickText(RULE_SET.sectors.sectors.find((x) => x.id === s.sector)?.label, lang))
      .join(', ');
    const origins = [...v.period.origins]
      .sort((a, b) => b.investors - a.investors)
      .slice(0, 3)
      .map((o) => pickText(v.countries.find((c) => c.code === o.country)?.name, lang) || o.country)
      .join(', ');
    return { sectors, origins, unanswered: v.unanswered };
  });

  constructor() {
    this.store.reload();
  }

  protected meta(d: QueueDraft): string {
    return pickText(d.meta, this.lang()) || this.locale.t('office.queue.uploadedMeta');
  }

  protected context(d: QueueDraft): string {
    return pickText(d.context, this.lang());
  }

  protected summary(d: QueueDraft): string {
    return this.store.summary(d, this.lang());
  }

  protected select(id: string): void {
    this.selectedId.set(id);
    this.note.set('');
    this.editing.set(false);
  }

  protected startEdit(d: QueueDraft): void {
    this.editText.set(this.summary(d));
    this.editing.set(true);
  }

  protected saveEdit(d: QueueDraft): void {
    this.store.saveEdit(d.id, this.lang(), this.editText(), this.note());
    this.editing.set(false);
    this.note.set('');
    this.announce.set(this.locale.t('office.queue.announce.edited'));
  }

  protected approve(d: QueueDraft): void {
    this.store.approve(d.id, this.note());
    this.note.set('');
    this.announce.set(this.locale.t('office.queue.announce.approved'));
  }

  protected reject(d: QueueDraft): void {
    this.store.reject(d.id, this.note());
    this.note.set('');
    this.announce.set(this.locale.t('office.queue.announce.rejected'));
  }

  protected upload(event: Event): void {
    event.preventDefault();
    const name = this.uploadName().trim();
    if (!name) return;
    const draft = this.store.upload(name);
    this.uploadName.set('');
    this.uploadOpen.set(false);
    this.select(draft.id);
    this.announce.set(this.locale.t('office.queue.announce.uploaded'));
  }
}
