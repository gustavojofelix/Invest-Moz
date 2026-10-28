import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  Injector,
  PendingTasks,
  afterNextRender,
  computed,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { SafeStorage } from '@core/adapters/safe-storage';
import { ROADMAP_STEP_IDS } from '@core/domain/roadmap-steps';
import { pickText } from '@core/domain/text';
import { ImDatePipe, LocPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { ProjectRepository } from '@core/ports';
import { Icon } from '@shared/ui/icon';
import { RefTag } from '@shared/ui/ref-tag';
import type { AlertChannel, AlertsData, RegulatoryAlert } from './alerts.types';

const SEVERITY_ORDER = { action: 0, watch: 1, info: 2 } as const;
const CHANNELS: AlertChannel[] = ['whatsapp', 'email', 'push'];
const READ_KEY = 'alerts:read';
const CHANNELS_KEY = 'alerts:channels';

/** Screen 16 · Regulatory watch: law changes linked to the roadmap step they affect. */
@Component({
  selector: 'im-alerts-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, TranslocoDirective, LocPipe, ImDatePipe, RefTag],
  template: `
    <ng-container *transloco="let t">
      <header class="border-b border-rule bg-paper">
        <div class="container-page py-6 sm:py-8">
          <p class="eyebrow">{{ t('alerts.eyebrow') }}</p>
          <h1 class="mt-1.5 text-[1.75rem] leading-tight sm:text-4xl">{{ t('alerts.title') }}</h1>
          <p class="mt-2 max-w-2xl text-muted">{{ t('alerts.lead') }}</p>
          <div
            role="group"
            [attr.aria-label]="t('alerts.notifyBy')"
            class="mt-4 flex flex-wrap items-center gap-1.5"
          >
            <span class="me-1 text-sm font-semibold text-muted">{{ t('alerts.notifyBy') }}</span>
            @for (c of channelList; track c) {
              <button
                type="button"
                class="pill"
                [attr.aria-pressed]="channels()[c]"
                (click)="toggleChannel(c)"
              >
                <svg [imIcon]="channelIcon(c)" [size]="15" aria-hidden="true"></svg>
                {{ t('alerts.channels.' + c) }}
              </button>
            }
          </div>
          <p class="mt-2 text-xs text-muted" aria-live="polite">{{ channelSummary() }}</p>
        </div>
      </header>

      <div class="container-page py-6 sm:py-8">
        <div class="grid gap-8 lg:grid-cols-12">
          <section class="lg:col-span-8" aria-labelledby="alerts-list-title">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 id="alerts-list-title" class="text-xl">
                {{ t('alerts.listTitle') }}
                @if (unread()) {
                  <span class="tag tag-bad ms-1 align-middle">{{
                    t('alerts.unread', { count: unread() })
                  }}</span>
                }
              </h2>
              @if (unread()) {
                <button type="button" class="btn btn-ghost btn-sm" (click)="markAllRead()">
                  <svg imIcon="check-check" [size]="16" aria-hidden="true"></svg
                  >{{ t('alerts.markAll') }}
                </button>
              }
            </div>

            <ul class="mt-3 grid gap-2.5" role="list">
              @for (a of alerts(); track a.id) {
                <li
                  class="card alert"
                  [id]="'alert-' + a.id"
                  [class.alert-action]="a.severity === 'action'"
                  [class.targeted]="'alert-' + a.id === fragment()"
                >
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="flex flex-wrap items-center gap-1.5">
                      <span
                        class="tag"
                        [class.tag-bad]="a.severity === 'action'"
                        [class.tag-warn]="a.severity === 'watch'"
                        [class.tag-neutral]="a.severity === 'info'"
                      >
                        @if (a.step) {
                          {{ t('alerts.affectsStep', { n: stepNumber(a) }) }}
                        } @else if (a.area) {
                          {{ t('alerts.affectsArea.' + a.area) }}
                        } @else {
                          {{ t('alerts.forInformation') }}
                        }
                      </span>
                      @if (!isRead(a.id)) {
                        <span class="tag tag-ok">{{ t('alerts.new') }}</span>
                      }
                    </span>
                    <span class="text-xs text-muted">
                      @switch (a.status) {
                        @case ('in_force') {
                          @if (a.effective) {
                            {{
                              t('alerts.inForceOn', {
                                date: a.effective | imDate: lang() : 'medium',
                              })
                            }}
                          } @else {
                            {{ t('alerts.inForce') }}
                          }
                        }
                        @case ('upcoming') {
                          {{ t('alerts.from', { date: a.effective | imDate: lang() : 'medium' }) }}
                        }
                        @default {
                          {{ t('alerts.pending') }}
                        }
                      }
                    </span>
                  </div>
                  <h3 class="font-sans text-[0.9375rem] font-bold leading-snug">
                    {{ a.title | loc: lang() }}
                  </h3>
                  <div class="grid gap-1.5 text-sm leading-relaxed">
                    <p>
                      <span class="font-semibold">{{ t('alerts.whatChanged') }}</span>
                      {{ a.summary | loc: lang() }}
                    </p>
                    <p class="text-muted">
                      <span class="font-semibold text-ink">{{ t('alerts.forYou') }}</span>
                      {{ a.impact | loc: lang() }}
                    </p>
                  </div>
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="flex flex-wrap gap-1.5">
                      @for (r of a.refIds; track r) {
                        <im-ref-tag [refId]="r" />
                      }
                      @for (label of plainInstruments(a); track label) {
                        <span class="chip">{{ label }}</span>
                      }
                      @if (data.value()?.status === 'illustrative') {
                        <span class="tag tag-neutral">{{ t('alerts.illustrative') }}</span>
                      }
                    </span>
                    <span class="flex flex-wrap gap-1">
                      @if (a.step) {
                        <a
                          class="btn btn-ghost btn-sm text-brand"
                          [routerLink]="roadmapLink()"
                          [fragment]="'step-' + a.step"
                          (click)="markRead(a.id)"
                          >{{ t('alerts.seeStep') }}</a
                        >
                      } @else if (a.area) {
                        <a
                          class="btn btn-ghost btn-sm text-brand"
                          [routerLink]="['/', lang(), a.area]"
                          (click)="markRead(a.id)"
                          >{{ t('alerts.seeArea.' + a.area) }}</a
                        >
                      }
                      <a
                        class="btn btn-outline btn-sm"
                        [routerLink]="['/', lang(), 'chat']"
                        [queryParams]="{ q: question(a) }"
                        (click)="markRead(a.id)"
                        ><svg imIcon="message-circle" [size]="15" aria-hidden="true"></svg
                        >{{ t('alerts.ask') }}</a
                      >
                      @if (!isRead(a.id)) {
                        <button
                          type="button"
                          class="btn btn-ghost btn-sm"
                          (click)="markRead(a.id)"
                          [attr.aria-label]="
                            t('alerts.markReadLabel', { title: a.title | loc: lang() })
                          "
                        >
                          <svg imIcon="check" [size]="16" aria-hidden="true"></svg>
                        </button>
                      }
                    </span>
                  </div>
                </li>
              }
            </ul>
          </section>

          <aside class="grid content-start gap-4 lg:col-span-4">
            <div class="card p-4">
              <p class="label-caps text-muted">{{ t('alerts.watching') }}</p>
              @if (project.value(); as p) {
                <p class="mt-1 font-bold">{{ p.title | loc: lang() }}</p>
                <p class="font-mono text-xs text-muted">{{ p.ref }}</p>
                <a
                  class="link mt-2 inline-flex min-h-11 items-center text-sm"
                  [routerLink]="roadmapLink()"
                  >{{ t('alerts.openRoadmap') }}</a
                >
              } @else {
                <p class="mt-1 text-sm">{{ t('alerts.guestText') }}</p>
                <a
                  class="btn btn-secondary btn-sm mt-3"
                  [routerLink]="['/', lang(), 'pathfinder']"
                  >{{ t('alerts.start') }}</a
                >
              }
            </div>
            <div class="surface-deep rounded-lg p-4 text-sm">
              <p class="flex items-center gap-2 font-bold">
                <svg imIcon="bell-ring" [size]="18" aria-hidden="true"></svg>
                {{ t('alerts.sourceTitle', { source: source() }) }}
              </p>
              <p class="mt-1 text-on-deep-muted">{{ t('alerts.sourceText') }}</p>
            </div>
            <p class="text-xs text-muted">{{ t('alerts.demoNote') }}</p>
          </aside>
        </div>
      </div>
    </ng-container>
  `,
  styles: `
    .alert {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.875rem;
      scroll-margin-top: 6rem;
    }
    .alert-action {
      border: 2px solid var(--brand);
    }
    .targeted {
      box-shadow: 0 0 0 3px var(--highlight);
    }
  `,
})
export class AlertsPage {
  private readonly storage = inject(SafeStorage);
  private readonly projects = inject(ProjectRepository);
  private readonly locale = inject(LocaleService);
  private readonly tasks = inject(PendingTasks);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  protected readonly lang = this.locale.lang;
  protected readonly channelList = CHANNELS;
  protected readonly fragment = toSignal(inject(ActivatedRoute).fragment);

  protected readonly data = resource({
    loader: () => {
      const done = this.tasks.add();
      return import('../../../assets/data/alerts/alerts.json')
        .then((m) => m.default as unknown as AlertsData)
        .finally(done);
    },
  });
  protected readonly project = resource({
    params: () => this.projects.currentRef(),
    loader: ({ params: ref }) => (ref ? this.projects.get(ref) : Promise.resolve(null)),
  });

  private readonly read = signal<string[]>(this.storage.get<string[]>(READ_KEY, []));
  protected readonly channels = signal<Record<AlertChannel, boolean>>(
    this.storage.get(CHANNELS_KEY, { whatsapp: true, email: true, push: false }),
  );

  protected readonly source = computed(() => this.data.value()?.source ?? 'Alertas Legais');
  protected readonly alerts = computed(() =>
    [...(this.data.value()?.alerts ?? [])].sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        b.published.localeCompare(a.published),
    ),
  );
  protected readonly unread = computed(
    () => this.alerts().filter((a) => !this.read().includes(a.id)).length,
  );
  protected readonly roadmapLink = computed(() => {
    const ref = this.projects.currentRef();
    return ref ? ['/', this.lang(), 'roadmap', ref] : ['/', this.lang(), 'roadmap'];
  });
  protected readonly channelSummary = computed(() => {
    const on = CHANNELS.filter((c) => this.channels()[c]).map((c) =>
      this.locale.t(`alerts.channels.${c}`),
    );
    return on.length
      ? this.locale.t('alerts.channelsOn', { list: on.join(' · ') })
      : this.locale.t('alerts.channelsOff');
  });

  constructor() {
    // Alerts render after their data loads, so scroll to `#alert-…` once they are there.
    effect(() => {
      const f = this.fragment();
      if (!f || !this.data.hasValue()) return;
      afterNextRender(() => this.document.getElementById(f)?.scrollIntoView({ block: 'start' }), {
        injector: this.injector,
      });
    });
  }

  protected stepNumber(a: RegulatoryAlert): number {
    return a.step ? ROADMAP_STEP_IDS.indexOf(a.step) + 1 : 0;
  }

  protected plainInstruments(a: RegulatoryAlert): string[] {
    return a.refIds.length ? a.instruments.slice(a.refIds.length) : a.instruments;
  }

  protected question(a: RegulatoryAlert): string {
    return pickText(a.question, this.lang());
  }

  protected isRead(id: string): boolean {
    return this.read().includes(id);
  }

  protected markRead(id: string): void {
    if (this.isRead(id)) return;
    this.read.update((r) => [...r, id]);
    this.storage.set(READ_KEY, this.read());
  }

  protected markAllRead(): void {
    this.read.set(this.alerts().map((a) => a.id));
    this.storage.set(READ_KEY, this.read());
  }

  protected toggleChannel(c: AlertChannel): void {
    this.channels.update((v) => ({ ...v, [c]: !v[c] }));
    this.storage.set(CHANNELS_KEY, this.channels());
  }

  protected channelIcon(c: AlertChannel): string {
    return c === 'whatsapp' ? 'message-circle' : c === 'email' ? 'mail' : 'bell';
  }
}
