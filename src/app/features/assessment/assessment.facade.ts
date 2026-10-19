import { Injectable, inject, signal } from '@angular/core';
import type { Assessment, Project } from '@core/domain/types';
import { AssessmentService, KnowledgeBase, ProjectRepository } from '@core/ports';

export type AssessmentState =
  | { status: 'loading' }
  | { status: 'missing'; ref: string }
  | { status: 'error' }
  | { status: 'ready'; project: Project; assessment: Assessment };

/** Loads a project and runs the rules engine on it. Provided per page. */
@Injectable()
export class AssessmentFacade {
  private readonly projects = inject(ProjectRepository);
  private readonly engine = inject(AssessmentService);
  private readonly kb = inject(KnowledgeBase);
  readonly state = signal<AssessmentState>({ status: 'loading' });
  private requested = '';

  async load(ref: string): Promise<void> {
    if (ref === this.requested && this.state().status === 'ready') return;
    this.requested = ref;
    this.state.set({ status: 'loading' });
    try {
      const [project] = await Promise.all([this.projects.get(ref), this.kb.all()]);
      if (ref !== this.requested) return;
      if (!project) {
        this.state.set({ status: 'missing', ref });
        return;
      }
      const assessment = await this.engine.assess(project);
      if (ref !== this.requested) return;
      this.projects.setCurrent(project.ref);
      this.state.set({ status: 'ready', project, assessment });
    } catch (e) {
      console.error(e);
      this.state.set({ status: 'error' });
    }
  }
}
