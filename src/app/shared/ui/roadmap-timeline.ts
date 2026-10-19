import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import type { Locale, RoadmapPhase, RoadmapStep } from '@core/domain/types';
import { LocPipe } from '@core/i18n/format';
import { ConfirmText } from './confirm-text';
import { RefTag } from './ref-tag';

const PHASES: RoadmapPhase[] = ['explore', 'establish', 'operate'];

/** Numbered roadmap in three phases; critical-path steps in red. */
@Component({
  selector: 'im-roadmap-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, LocPipe, ConfirmText, RefTag],
  template: `
    <div *transloco="let t" class="grid gap-8 lg:grid-cols-3 lg:gap-6">
      @for (group of groups(); track group.phase; let gi = $index) {
        <div class="avoid-break">
          <p class="flex items-baseline gap-2 border-b border-ink pb-2">
            <span class="font-mono text-xs text-muted">0{{ gi + 1 }}</span>
            <span class="label-caps">{{ t('ui.roadmap.' + group.phase) }}</span>
          </p>
          <ol class="mt-1" role="list">
            @for (step of group.steps; track step.id) {
              <li class="step avoid-break" [class.critical]="step.critical">
                <span class="num" aria-hidden="true">{{ step.number }}</span>
                <div class="min-w-0">
                  <h4 class="font-sans text-base font-bold leading-snug">
                    <span class="sr-only">{{ t('ui.roadmap.step') }} {{ step.number }}: </span>{{ step.title | loc: lang() }}
                  </h4>
                  <p class="mt-0.5 text-sm text-muted">{{ step.authority | loc: lang() }}</p>
                  <p class="mt-2 flex flex-wrap items-center gap-2">
                    <span class="duration"><im-confirm-text [text]="step.duration | loc: lang()" /></span>
                    @if (step.critical) {
                      <span class="label-caps text-[0.6875rem] text-accent">{{ t('ui.roadmap.critical') }}</span>
                    }
                  </p>
                  <p class="mt-2 text-sm"><im-confirm-text [text]="step.note | loc: lang()" /></p>
                  @if (step.refs.length) {
                    <p class="mt-2 flex flex-wrap gap-1.5">
                      @for (r of step.refs; track r) {
                        <im-ref-tag [refId]="r" />
                      }
                    </p>
                  }
                </div>
              </li>
            }
          </ol>
        </div>
      }
    </div>
  `,
  styles: `
    .step {
      display: grid;
      grid-template-columns: 2.25rem 1fr;
      gap: 0.75rem;
      padding: 1rem 0;
      border-bottom: 1px solid var(--rule);
    }
    .num {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--ink);
      border-radius: 9999px;
      font-family: var(--font-serif);
      font-weight: 600;
      font-size: 0.9375rem;
    }
    .critical .num {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--accent-ink);
    }
    .critical h4 {
      color: var(--accent);
    }
    .duration {
      display: inline-flex;
      align-items: center;
      padding: 0.0625rem 0.5rem;
      border: 1px solid var(--rule-strong);
      border-radius: 2px;
      font-size: 0.8125rem;
      font-weight: 700;
      background: var(--panel);
    }
    .critical .duration {
      border-color: var(--accent);
      background: var(--accent-tint);
    }
  `,
})
export class RoadmapTimeline {
  readonly steps = input.required<RoadmapStep[]>();
  readonly lang = input.required<Locale>();
  protected readonly groups = computed(() =>
    PHASES.map((phase) => ({ phase, steps: this.steps().filter((s) => s.phase === phase) })).filter(
      (g) => g.steps.length,
    ),
  );
}
