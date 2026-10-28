import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { SafeStorage } from '@core/adapters/safe-storage';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import {
  ROADMAP_STEP_IDS,
  roadmapProgressKey,
  type RoadmapStepId,
} from '@core/domain/roadmap-steps';
import { pickText } from '@core/domain/text';
import type { Locale, Project } from '@core/domain/types';
import { formatDate, formatMoney, formatNumber, LocPipe } from '@core/i18n/format';
import { HTML_LANG, LOCALE_DIR } from '@core/i18n/locales';
import { LocaleService } from '@core/i18n/locale.service';
import { ProjectRepository } from '@core/ports';
import { Icon } from '@shared/ui/icon';
import { RefTag } from '@shared/ui/ref-tag';
import { DocumentsService } from './documents.service';
import type { ChecklistDocument, StepChecklist, UploadedFile } from './documents.types';
import { downloadFile, escapeHtml, htmlPage } from './download';

type DocStatus = 'uploaded' | 'prefilled' | 'template' | 'upload';

function isStep(id: string | undefined): id is RoadmapStepId {
  return (ROADMAP_STEP_IDS as readonly string[]).includes(id ?? '');
}

/** Screen 13 · Documents and forms: the checklist for one roadmap step. */
@Component({
  selector: 'im-documents-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, TranslocoDirective, LocPipe, RefTag],
  template: `
    <ng-container *transloco="let t">
      <header class="border-b border-rule bg-paper">
        <div class="container-page py-6 sm:py-8">
          @if (checklist(); as c) {
            <p class="eyebrow">{{ t('documents.eyebrow', { n: c.number }) }}</p>
            <h1 class="mt-1.5 text-[1.75rem] leading-tight sm:text-4xl">
              {{ c.title | loc: lang() }}
            </h1>
            <p class="mt-2 text-sm text-muted">
              {{ t('documents.authority') }}: {{ c.authority | loc: lang() }}
              @for (r of c.refs; track r) {
                <im-ref-tag class="ms-1" [refId]="r" />
              }
            </p>
            <div class="mt-4 flex items-center gap-3">
              <div
                class="h-2 flex-1 overflow-hidden rounded-full bg-rule"
                role="progressbar"
                [attr.aria-label]="t('documents.progressLabel')"
                aria-valuemin="0"
                [attr.aria-valuemax]="rows().length"
                [attr.aria-valuenow]="readyCount()"
              >
                <div class="bar h-full bg-brand" [style.width.%]="percent()"></div>
              </div>
              <span class="text-sm font-semibold text-muted">{{
                t('documents.ready', { done: readyCount(), total: rows().length })
              }}</span>
            </div>
          } @else {
            <p class="eyebrow">{{ t('documents.title') }}</p>
          }
        </div>
      </header>

      <div class="container-page py-6 sm:py-8">
        <nav [attr.aria-label]="t('documents.stepsNav')" class="steps-nav">
          <ul class="flex gap-2" role="list">
            @for (s of steps(); track s.id) {
              <li class="shrink-0">
                <a
                  class="pill"
                  [routerLink]="[]"
                  [queryParams]="{ step: s.id }"
                  [attr.aria-current]="s.id === stepId() ? 'step' : null"
                  [class.is-on]="s.id === stepId()"
                  [attr.title]="s.title | loc: lang()"
                >
                  <span class="font-mono">{{ s.number }}</span>
                  <span class="hidden sm:inline">{{ s.title | loc: lang() }}</span>
                  @if (s.id === currentStep()) {
                    <span class="sr-only">({{ t('documents.currentStep') }})</span>
                  }
                </a>
              </li>
            }
          </ul>
        </nav>

        <div class="mt-6 grid gap-8 lg:grid-cols-12">
          <section class="lg:col-span-8" aria-labelledby="list-title">
            <h2 id="list-title" class="sr-only">{{ t('documents.listTitle') }}</h2>
            <ul class="grid gap-2.5" role="list">
              @for (row of rows(); track row.doc.id) {
                <li class="card doc" [class.doc-next]="row.doc.id === nextDocId()">
                  @if (row.status === 'uploaded') {
                    <span class="dot dot-done"
                      ><svg
                        imIcon="check"
                        [size]="14"
                        role="img"
                        [attr.aria-label]="t('documents.readyLabel')"
                      ></svg
                    ></span>
                  } @else {
                    <span
                      class="dot"
                      role="img"
                      [attr.aria-label]="t('documents.missingLabel')"
                    ></span>
                  }
                  <div class="min-w-0 flex-1">
                    <p class="text-[0.9375rem] font-bold leading-snug">
                      {{ row.doc.title | loc: lang() }}
                    </p>
                    <p class="text-xs text-muted">
                      @switch (row.status) {
                        @case ('uploaded') {
                          {{ t('documents.status.uploaded', { format: format(row.file!) }) }} ·
                          <span class="break-all">{{ row.file!.name }}</span> ({{
                            size(row.file!)
                          }})
                        }
                        @case ('prefilled') {
                          {{ t('documents.status.prefilled') }}
                        }
                        @case ('template') {
                          {{ t('documents.status.template') }}
                        }
                        @default {
                          {{
                            row.doc.hint
                              ? (row.doc.hint | loc: lang())
                              : t('documents.status.upload')
                          }}
                        }
                      }
                    </p>
                  </div>
                  <div class="flex shrink-0 flex-wrap justify-end gap-1.5">
                    @if (row.status === 'uploaded') {
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm"
                        (click)="remove(row.doc.id)"
                        [attr.aria-label]="
                          t('documents.removeLabel', { doc: row.doc.title | loc: lang() })
                        "
                      >
                        <svg imIcon="trash" [size]="16" aria-hidden="true"></svg>
                      </button>
                    } @else {
                      @if (row.status === 'prefilled' || row.status === 'template') {
                        <button
                          type="button"
                          class="btn btn-sm"
                          [class.btn-primary]="row.status === 'prefilled'"
                          [class.btn-secondary]="row.status === 'template'"
                          (click)="openTemplate(row.doc, row.status === 'prefilled')"
                          [attr.aria-label]="
                            t('documents.openLabel', { doc: row.doc.title | loc: lang() })
                          "
                        >
                          {{
                            row.status === 'prefilled'
                              ? t('documents.open')
                              : t('documents.template')
                          }}
                        </button>
                      }
                      <label class="btn btn-outline btn-sm upload">
                        <input
                          type="file"
                          class="sr-only"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          (change)="onFile(row.doc.id, $event)"
                          [attr.aria-label]="
                            t('documents.uploadLabel', { doc: row.doc.title | loc: lang() })
                          "
                        />
                        <svg imIcon="upload" [size]="16" aria-hidden="true"></svg>
                        {{ t('documents.upload') }}
                      </label>
                    }
                  </div>
                </li>
              }
            </ul>
            <p class="mt-4 text-xs leading-relaxed text-muted">
              {{ t('documents.supplier', { supplier: supplier() }) }}
              @if (checklist(); as c) {
                {{ t('documents.finalList', { authority: c.authority | loc: lang() }) }}
              }
            </p>
            <p class="mt-2 flex gap-2 text-xs text-muted">
              <svg
                imIcon="lock-keyhole"
                [size]="14"
                class="mt-0.5 shrink-0"
                aria-hidden="true"
              ></svg>
              {{ t('documents.privacy') }}
            </p>
          </section>

          <aside class="grid content-start gap-4 lg:col-span-4">
            <div class="card p-4">
              @if (project.value(); as p) {
                <p class="label-caps text-muted">{{ t('documents.context.project') }}</p>
                <p class="mt-1 font-bold">{{ p.title | loc: lang() }}</p>
                <p class="font-mono text-xs text-muted">{{ p.ref }}</p>
                <a
                  class="link mt-2 inline-flex min-h-11 items-center text-sm"
                  [routerLink]="['/', lang(), 'roadmap', p.ref]"
                  [fragment]="'step-' + stepId()"
                  >{{ t('documents.context.roadmapLink') }}</a
                >
              } @else {
                <p class="label-caps text-muted">{{ t('documents.context.guest') }}</p>
                <p class="mt-1 text-sm">{{ t('documents.context.guestText') }}</p>
                <a
                  class="btn btn-secondary btn-sm mt-3"
                  [routerLink]="['/', lang(), 'pathfinder']"
                  >{{ t('documents.context.start') }}</a
                >
              }
            </div>
            <div class="foot">
              <button type="button" class="btn btn-outline flex-1" (click)="downloadPack()">
                <svg imIcon="download" [size]="18" aria-hidden="true"></svg
                >{{ t('documents.pack') }}
              </button>
              <a
                class="btn btn-primary flex-1"
                [routerLink]="['/', lang(), 'expert']"
                [queryParams]="{ from: 'documents' }"
                >{{ t('documents.fileForMe') }}</a
              >
            </div>
          </aside>
        </div>
      </div>
    </ng-container>
  `,
  styles: `
    .steps-nav {
      overflow-x: auto;
      margin-inline: -1rem;
      padding: 0.25rem 1rem;
      scrollbar-width: thin;
    }
    .pill {
      min-height: 2.75rem;
    }
    .doc {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
    }
    .doc-next {
      border: 2px solid var(--brand);
    }
    .dot {
      flex: none;
      display: grid;
      place-items: center;
      width: 1.625rem;
      height: 1.625rem;
      border: 1.5px solid var(--rule-strong);
      border-radius: 999px;
    }
    .dot-done {
      border-color: var(--brand);
      background: var(--brand);
      color: var(--brand-ink);
    }
    .upload {
      cursor: pointer;
    }
    .upload:focus-within {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
    .bar {
      transition: width 200ms;
    }
    @media (prefers-reduced-motion: reduce) {
      .bar {
        transition: none;
      }
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
export class DocumentsPage {
  /** `?step=<RoadmapStepId>` (bound from the query string). */
  readonly step = input<string>();
  private readonly service = inject(DocumentsService);
  private readonly projects = inject(ProjectRepository);
  private readonly storage = inject(SafeStorage);
  private readonly locale = inject(LocaleService);
  private readonly document = inject(DOCUMENT);
  protected readonly lang = this.locale.lang;

  private readonly data = resource({ loader: () => this.service.checklists() });
  protected readonly project = resource({
    params: () => this.projects.currentRef(),
    loader: ({ params: ref }) => (ref ? this.projects.get(ref) : Promise.resolve(null)),
  });

  protected readonly steps = computed(() => this.data.value()?.steps ?? []);
  protected readonly supplier = computed(() => this.data.value()?.supplier ?? 'mozTemplates');
  private readonly owner = computed(() => this.projects.currentRef() ?? 'guest');

  /** The first step not yet ticked off on the roadmap. */
  protected readonly currentStep = computed<RoadmapStepId>(() => {
    const ref = this.projects.currentRef();
    const done = ref ? this.storage.get<string[]>(roadmapProgressKey(ref), []) : [];
    return ROADMAP_STEP_IDS.find((id) => !done.includes(id)) ?? 'tax';
  });
  protected readonly stepId = computed<RoadmapStepId>(() => {
    const s = this.step();
    return isStep(s) ? s : this.currentStep();
  });
  protected readonly checklist = computed<StepChecklist | undefined>(() =>
    this.steps().find((s) => s.id === this.stepId()),
  );

  protected readonly rows = computed(() => {
    const uploads = this.service.uploads(this.owner());
    const hasProject = !!this.project.value();
    return (this.checklist()?.documents ?? []).map((doc) => {
      const file: UploadedFile | undefined = uploads[doc.id];
      let status: DocStatus;
      if (file) status = 'uploaded';
      else if (doc.kind === 'prefilled') status = hasProject ? 'prefilled' : 'template';
      else status = doc.kind;
      return { doc, file, status };
    });
  });
  protected readonly readyCount = computed(
    () => this.rows().filter((r) => r.status === 'uploaded').length,
  );
  protected readonly percent = computed(() =>
    this.rows().length ? Math.round((this.readyCount() / this.rows().length) * 100) : 0,
  );
  /** The next document to deal with, highlighted as in the screen pack. */
  protected readonly nextDocId = computed(
    () => this.rows().find((r) => r.status !== 'uploaded')?.doc.id ?? null,
  );

  protected format(file: UploadedFile): string {
    const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1];
    return (ext ?? file.type.split('/')[1] ?? '').toUpperCase();
  }

  protected size(file: UploadedFile): string {
    const lang = this.lang();
    return file.size >= 1024 * 1024
      ? `${formatNumber(file.size / 1024 / 1024, lang, { maximumFractionDigits: 1 })} MB`
      : `${formatNumber(Math.max(1, Math.round(file.size / 1024)), lang)} KB`;
  }

  protected onFile(docId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.service.upload(this.owner(), docId, file);
    input.value = '';
  }

  protected remove(docId: string): void {
    this.service.remove(this.owner(), docId);
  }

  /** A template as a small HTML file; pre-filled with the project when one is in context. */
  protected openTemplate(doc: ChecklistDocument, prefill: boolean): void {
    const lang = this.lang();
    const t = (k: string, p?: Record<string, unknown>) => this.locale.t(`documents.file.${k}`, p);
    const title = pickText(doc.title, lang);
    const step = this.checklist();
    const p = prefill ? this.project.value() : null;
    const field = (label: string, value = '') =>
      `<tr><th scope="row">${escapeHtml(label)}</th><td><div class="field">${escapeHtml(value)}</div></td></tr>`;
    const fields = p
      ? this.projectFields(p, lang).map(([l, v]) => field(l, v))
      : [t('company'), t('nuit'), t('address'), t('representative')].map((l) => field(l));
    const body = `<p class="muted">${escapeHtml(t('templateBy', { supplier: this.supplier() }))}</p>
<h1>${escapeHtml(title)}</h1>
<p class="muted">${escapeHtml(step ? pickText(step.title, lang) : '')} · ${escapeHtml(step ? pickText(step.authority, lang) : '')}</p>
${p ? `<p>${escapeHtml(t('prefilledNote'))}</p>` : ''}
<table>${fields.join('\n')}${field(t('date'))}${field(t('signature'))}</table>
<p class="muted">${escapeHtml(t('disclaimer'))}</p>`;
    downloadFile(
      this.document,
      `${doc.id}${p ? `-${p.ref}` : ''}.html`,
      htmlPage(HTML_LANG[lang], LOCALE_DIR[lang], title, body),
      'text/html;charset=utf-8',
    );
  }

  /** The step checklist with each document's status, as a printable HTML file. */
  protected downloadPack(): void {
    const c = this.checklist();
    if (!c) return;
    const lang = this.lang();
    const t = (k: string, p?: Record<string, unknown>) => this.locale.t(`documents.${k}`, p);
    const p = this.project.value();
    const rows = this.rows()
      .map((r) => {
        const status =
          r.status === 'uploaded'
            ? `${t('status.uploaded', { format: this.format(r.file!) })} · ${r.file!.name}`
            : t(`status.${r.status}`);
        return `<tr><td>${r.status === 'uploaded' ? '☑' : '☐'}</td><td>${escapeHtml(pickText(r.doc.title, lang))}</td><td>${escapeHtml(status)}</td></tr>`;
      })
      .join('\n');
    const heading = `${t('eyebrow', { n: c.number })} · ${pickText(c.title, lang)}`;
    const body = `<h1>${escapeHtml(heading)}</h1>
<p class="muted">${escapeHtml(t('authority'))}: ${escapeHtml(pickText(c.authority, lang))}${p ? ` · ${escapeHtml(p.ref)} · ${escapeHtml(pickText(p.title, lang))}` : ''}</p>
<p>${escapeHtml(t('ready', { done: this.readyCount(), total: this.rows().length }))} · ${escapeHtml(formatDate(new Date().toISOString(), lang, 'long'))}</p>
<table><thead><tr><th></th><th>${escapeHtml(t('file.document'))}</th><th>${escapeHtml(t('file.status'))}</th></tr></thead><tbody>
${rows}
</tbody></table>
<p class="muted">${escapeHtml(t('supplier', { supplier: this.supplier() }))} ${escapeHtml(t('finalList', { authority: pickText(c.authority, lang) }))}</p>
<p class="muted">${escapeHtml(t('file.disclaimer'))}</p>`;
    downloadFile(
      this.document,
      `tiva-documents-${c.id}${p ? `-${p.ref}` : ''}.html`,
      htmlPage(HTML_LANG[lang], LOCALE_DIR[lang], heading, body),
      'text/html;charset=utf-8',
    );
  }

  private projectFields(p: Project, lang: Locale): [string, string][] {
    const t = (k: string) => this.locale.t(`documents.file.${k}`);
    const i = p.input;
    return [
      [t('reference'), p.ref],
      [t('project'), pickText(p.title, lang)],
      [t('sector'), pickText(p.sector, lang)],
      [t('province'), pickText(PROVINCE_NAMES[i.province], lang)],
      [t('investorCountry'), i.investorCountry],
      [t('investment'), formatMoney(i.investmentUsd, 'USD', lang)],
      [t('workers'), `${formatNumber(i.workers, lang)} (${formatNumber(i.foreignWorkers, lang)})`],
      [t('company'), ''],
      [t('nuit'), ''],
    ];
  }
}
