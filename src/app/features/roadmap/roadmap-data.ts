import { Injectable, PendingTasks, computed, inject, signal } from '@angular/core';
import { tracked } from '@core/adapters/pending';
import { SafeStorage } from '@core/adapters/safe-storage';
import {
  ROADMAP_STEP_IDS,
  roadmapProgressKey,
  type RoadmapStepId,
} from '@core/domain/roadmap-steps';
import type { Assessment, LocalizedText, Project, RefId } from '@core/domain/types';
import { AssessmentService, KnowledgeBase, ProjectRepository } from '@core/ports';

/** One of the nine steps as written in `assets/data/roadmap/steps.json`. */
export interface RoadmapStepDef {
  id: RoadmapStepId;
  title: LocalizedText;
  /** Compact title for the PDF table and summaries. */
  short: LocalizedText;
  who: LocalizedText;
  summary: LocalizedText;
  /** The step as a next action ("Request the name reservation certificate"). */
  action: LocalizedText;
  documents: LocalizedText[];
  refs: RefId[];
}

/**
 * A line of project-specific detail from the rules engine. `label` is a key
 * under `roadmap.detail.*`; `key` replaces `text` with a UI sentence.
 */
export interface StepDetail {
  title?: LocalizedText;
  label?: string;
  text?: LocalizedText;
  key?: string;
}

export interface RoadmapStepView extends RoadmapStepDef {
  n: number;
  details: StepDetail[];
  duration?: LocalizedText;
  /** False when the facts given suggest the step may not apply (still listed). */
  applies: boolean;
}

export type RoadmapState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'missing'; ref: string }
  | { status: 'error' }
  | { status: 'ready'; project: Project; assessment: Assessment; steps: RoadmapStepView[] };

@Injectable({ providedIn: 'root' })
export class RoadmapSteps {
  private readonly tasks = inject(PendingTasks);
  private defsP?: Promise<RoadmapStepDef[]>;

  defs(): Promise<RoadmapStepDef[]> {
    this.defsP ??= tracked(this.tasks, () =>
      import('../../../assets/data/roadmap/steps.json').then((m) => {
        const byId = new Map(
          (m.default.steps as unknown as RoadmapStepDef[]).map((s) => [s.id, s]),
        );
        return ROADMAP_STEP_IDS.map((id) => byId.get(id)).filter((s): s is RoadmapStepDef => !!s);
      }),
    );
    return this.defsP;
  }
}

/** Combines the nine step texts with the rules-engine output for one project. */
export function buildSteps(
  defs: RoadmapStepDef[],
  project: Project,
  a: Assessment,
): RoadmapStepView[] {
  const input = project.input;
  const step = (id: string) => a.roadmap.find((s) => s.id === id);
  const trigger = (kind: string) => a.factTriggers.filter((t) => t.trigger === kind);
  const licences = (kind: string) => a.licences.filter((l) => l.kind === kind);
  const asDetail = (x: { title: LocalizedText; detail: LocalizedText }): StepDetail => ({
    title: x.title,
    text: x.detail,
  });
  const fromTrigger = (x: { fact: LocalizedText; text: LocalizedText }): StepDetail => ({
    title: x.fact,
    text: x.text,
  });
  const note = (id: string): StepDetail[] => {
    const s = step(id);
    return s && s.note.en ? [{ text: s.note }] : [];
  };
  const foreign = input.capital !== 'mozambican';

  const extra: Record<
    RoadmapStepId,
    { details: StepDetail[]; duration?: LocalizedText; applies?: boolean; refs?: RefId[] }
  > = {
    entity: {
      details: [
        { label: 'recommended', text: a.vehicle.recommendedName },
        { text: a.vehicle.reasoning },
      ],
    },
    incorporate: {
      details: note('incorporation'),
      duration: step('incorporation')?.duration,
      refs: step('incorporation')?.refs,
    },
    apiex: {
      details: [
        { label: 'decides', text: a.investmentRegime.authority },
        { text: a.investmentRegime.path },
        ...note('apiex-meeting'),
      ],
      duration: step('project-registration')?.duration,
      refs: a.investmentRegime.refs,
    },
    land: input.needsLand
      ? {
          details: [...licences('duat').map(asDetail), ...trigger('land').map(fromTrigger)],
        }
      : { details: [{ key: 'noLand' }], applies: false },
    environment: {
      details: [...licences('environmental').map(asDetail), ...note('env-land-pre')],
      duration: step('env-licence')?.duration ?? step('env-land-pre')?.duration,
    },
    licence: {
      details: [...licences('bau').map(asDetail), ...licences('sector').map(asDetail)],
      duration: step('sector-licence')?.duration,
      refs: licences('sector').flatMap((l) => l.refs),
    },
    capital: foreign
      ? {
          details: [
            { label: 'guarantee', text: a.investmentRegime.fdiGuarantee },
            ...trigger('loan').map(fromTrigger),
            ...trigger('treaty').map(fromTrigger),
            ...trigger('exports').map(fromTrigger),
          ],
          duration: step('fdi-registration')?.duration,
        }
      : { details: [{ key: 'noForeignCapital' }], applies: false },
    people: {
      details:
        input.foreignWorkers > 0
          ? trigger('quota').map(fromTrigger)
          : [{ key: 'noForeignWorkers' }, ...trigger('quota').map(fromTrigger)],
      duration: step('work-permits')?.duration,
    },
    tax: {
      details: [
        ...trigger('fees_abroad').map(fromTrigger),
        ...trigger('temporary_import').map(fromTrigger),
        ...a.obligations.slice(0, 3).map((o) => ({ title: o.title, text: o.frequency })),
      ],
      duration: step('temporary-import')?.duration,
    },
  };

  return defs.map((d, i) => {
    const x = extra[d.id];
    return {
      ...d,
      n: i + 1,
      refs: [...new Set([...d.refs, ...(x.refs ?? [])])],
      details: x.details.filter((dt) => dt.key || dt.text?.en),
      duration: x.duration?.en ? x.duration : undefined,
      applies: x.applies ?? true,
    };
  });
}

/**
 * Loads a project, runs the rules engine and builds the nine steps. Provided
 * per page (roadmap and PDF).
 */
@Injectable()
export class RoadmapFacade {
  private readonly projects = inject(ProjectRepository);
  private readonly engine = inject(AssessmentService);
  private readonly kb = inject(KnowledgeBase);
  private readonly defs = inject(RoadmapSteps);
  readonly state = signal<RoadmapState>({ status: 'idle' });
  private requested = '';

  async load(ref: string): Promise<void> {
    if (ref === this.requested && this.state().status === 'ready') return;
    this.requested = ref;
    this.state.set({ status: 'loading' });
    try {
      const [project, defs] = await Promise.all([
        this.projects.get(ref),
        this.defs.defs(),
        this.kb.all(),
      ]);
      if (ref !== this.requested) return;
      if (!project) {
        this.state.set({ status: 'missing', ref });
        return;
      }
      const assessment = await this.engine.assess(project);
      if (ref !== this.requested) return;
      this.projects.setCurrent(project.ref);
      this.state.set({
        status: 'ready',
        project,
        assessment,
        steps: buildSteps(defs, project, assessment),
      });
    } catch (e) {
      console.error(e);
      this.state.set({ status: 'error' });
    }
  }

  reset(): void {
    this.requested = '';
    this.state.set({ status: 'idle' });
  }
}

/** Ticked-off step ids for one project, kept in localStorage. */
@Injectable()
export class RoadmapProgress {
  private readonly storage = inject(SafeStorage);
  private ref = '';
  private readonly _done = signal<ReadonlySet<RoadmapStepId>>(new Set());
  readonly done = this._done.asReadonly();
  readonly count = computed(() => this._done().size);

  load(ref: string): void {
    this.ref = ref;
    const ids = this.storage.get<string[]>(roadmapProgressKey(ref), []);
    this._done.set(
      new Set(
        (Array.isArray(ids) ? ids : []).filter((id): id is RoadmapStepId =>
          (ROADMAP_STEP_IDS as readonly string[]).includes(id),
        ),
      ),
    );
  }

  toggle(id: RoadmapStepId): void {
    const next = new Set(this._done());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this._done.set(next);
    if (this.ref) this.storage.set(roadmapProgressKey(this.ref), [...next]);
  }

  /** The first step not ticked off, in roadmap order. */
  current(): RoadmapStepId | null {
    return ROADMAP_STEP_IDS.find((id) => !this._done().has(id)) ?? null;
  }
}
