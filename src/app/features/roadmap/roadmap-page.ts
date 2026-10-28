import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { maputoToday } from '@core/adapters/json/json-assessment-service';
import type { RoadmapStepId } from '@core/domain/roadmap-steps';
import type { Project } from '@core/domain/types';
import { ImDatePipe, LocPipe, MoneyPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { SeoService } from '@core/layout/seo.service';
import { KnowledgeBase, ProjectRepository, ReferenceData } from '@core/ports';
import { CitationService } from '@shared/ui/citation.service';
import { ConfirmText } from '@shared/ui/confirm-text';
import { Icon } from '@shared/ui/icon';
import { Skeleton } from '@shared/ui/skeleton';
import { RoadmapFacade, RoadmapProgress, type RoadmapStepView } from './roadmap-data';

/** Screen 6 · Investment roadmap: nine ordered steps the investor ticks off. */
@Component({
  selector: 'im-roadmap-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RoadmapFacade, RoadmapProgress],
  imports: [
    Icon,
    RouterLink,
    TranslocoDirective,
    LocPipe,
    MoneyPipe,
    ImDatePipe,
    ConfirmText,
    Skeleton,
  ],
  templateUrl: './roadmap-page.html',
  styles: `
    .bar {
      height: 0.5rem;
      border-radius: 999px;
      background: var(--rule);
      overflow: hidden;
    }
    .bar > span {
      display: block;
      height: 100%;
      background: var(--brand);
      transition: width 240ms var(--ease-out-soft);
    }
    .tick {
      flex: none;
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      margin: -0.5rem;
      border-radius: 999px;
      background: none;
      border: 0;
      cursor: pointer;
    }
    .tick > span {
      display: grid;
      place-items: center;
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 999px;
      border: 1.5px solid var(--rule-strong);
      color: var(--ink-soft);
      font-size: 0.875rem;
      font-weight: 700;
    }
    .tick[aria-checked='true'] > span {
      background: var(--brand);
      border-color: var(--brand);
      color: var(--brand-ink);
    }
    .is-current .tick[aria-checked='false'] > span {
      background: var(--highlight);
      border-color: var(--highlight);
      color: var(--highlight-ink);
    }
    .tick:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 0;
    }
    .step {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--rule-soft);
      scroll-margin-top: 6rem;
    }
    .step.is-open {
      margin-block: 0.375rem;
      margin-inline: -0.75rem;
      padding: 0.75rem;
      border: 2px solid var(--brand);
      border-radius: var(--radius-md);
      background: var(--paper);
    }
    .step-toggle {
      display: block;
      width: 100%;
      min-height: 2.75rem;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      text-align: start;
      cursor: pointer;
    }
    .step-toggle:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
      border-radius: 4px;
    }
    .is-done .step-title {
      color: var(--muted);
    }
    .cite {
      min-height: 2rem;
      cursor: pointer;
      border: 0;
    }
    .cite:hover {
      background: color-mix(in srgb, var(--brand-tint) 70%, var(--brand));
      color: var(--brand-ink);
    }
    .cite:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 1px;
    }
    .detail + .detail {
      margin-top: 0.5rem;
    }
    :host-context([dir='rtl']) .flip {
      transform: scaleX(-1);
    }
  `,
})
export class RoadmapPage {
  /** Route param; absent on `/:lang/roadmap` (then the project in context is used). */
  readonly ref = input<string>();
  private readonly facade = inject(RoadmapFacade);
  protected readonly progress = inject(RoadmapProgress);
  private readonly projects = inject(ProjectRepository);
  private readonly reference = inject(ReferenceData);
  private readonly kb = inject(KnowledgeBase);
  private readonly citations = inject(CitationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly locale = inject(LocaleService);
  protected readonly lang = this.locale.lang;
  protected readonly today = maputoToday();
  protected readonly state = this.facade.state;
  protected readonly total = 9;

  protected readonly examples = resource({ loader: () => this.projects.examples() });
  protected readonly countries = resource({ loader: () => this.reference.countries() });
  /** A step the investor opened (or 'none' closed) by hand; null = the current step is open. */
  private readonly opened = signal<RoadmapStepId | 'none' | null>(null);

  protected readonly ready = computed(() => {
    const s = this.state();
    return s.status === 'ready' ? s : null;
  });

  protected readonly current = computed(() => {
    this.progress.done();
    return this.progress.current();
  });

  protected readonly openId = computed(() => {
    const o = this.opened();
    return o === 'none' ? null : (o ?? this.current());
  });

  protected readonly percent = computed(() =>
    Math.round((this.progress.count() / this.total) * 100),
  );

  protected readonly countryName = computed(() => {
    const p = this.ready()?.project;
    if (!p) return '';
    const c = (this.countries.value() ?? []).find((x) => x.code === p.input.investorCountry);
    return c ? this.locale.text(c.name) : p.input.investorCountry;
  });

  constructor() {
    effect(() => {
      const ref = this.ref();
      const current = this.projects.currentRef();
      untracked(() => {
        if (ref) {
          this.opened.set(null);
          this.progress.load(ref);
          void this.facade.load(ref).then(() => this.revealFragment());
        } else if (current) {
          void this.router.navigate(['/', this.lang(), 'roadmap', current], { replaceUrl: true });
        } else {
          this.facade.reset();
        }
      });
    });
    effect(() => {
      const r = this.ready();
      const l = this.lang();
      if (r) untracked(() => this.seo.setTitle(this.locale.text(r.project.title) || l));
    });
  }

  protected isDone(id: RoadmapStepId): boolean {
    return this.progress.done().has(id);
  }

  protected toggleDone(s: RoadmapStepView): void {
    const wasCurrent = this.current() === s.id;
    this.progress.toggle(s.id);
    // Ticking the open step moves the focus of the page to the next one.
    if (wasCurrent || this.opened() === s.id) this.opened.set(null);
  }

  protected toggleOpen(id: RoadmapStepId): void {
    this.opened.set(this.openId() === id ? 'none' : id);
  }

  protected instrument(id: string): string {
    this.kb.loaded();
    return this.kb.lookup(id)?.instrument ?? id;
  }

  protected cite(id: string): void {
    void this.citations.open(id);
  }

  protected openExample(p: Project): void {
    this.projects.setCurrent(p.ref);
    void this.router.navigate(['/', this.lang(), 'roadmap', p.ref]);
  }

  private revealFragment(): void {
    const frag = this.route.snapshot.fragment;
    const m = frag ? /^step-([a-z]+)$/.exec(frag) : null;
    const s = this.ready()?.steps.find((x) => x.id === m?.[1]);
    if (!s) return;
    this.opened.set(s.id);
    if (!this.browser) return;
    setTimeout(() =>
      document.getElementById(`step-${s.id}`)?.scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      }),
    );
  }
}
