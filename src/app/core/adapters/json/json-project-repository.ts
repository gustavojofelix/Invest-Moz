import { Injectable, PendingTasks, inject, signal } from '@angular/core';
import { tracked } from '../pending';
import { newProjectRef } from '../../domain/refs';
import type { Project, ProjectInput } from '../../domain/types';
import { ProjectRepository } from '../../ports';
import { SafeStorage } from '../safe-storage';

const CUSTOM_KEY = 'projects';
const CURRENT_KEY = 'currentProject';

/** Seeded examples (JSON) + visitor projects (localStorage overlay). */
@Injectable()
export class JsonProjectRepository extends ProjectRepository {
  private readonly storage = inject(SafeStorage);
  private readonly tasks = inject(PendingTasks);
  private examplesP?: Promise<Project[]>;
  private readonly _current = signal<string | null>(this.storage.get<string | null>(CURRENT_KEY, null));
  readonly currentRef = this._current.asReadonly();

  examples(): Promise<Project[]> {
    this.examplesP ??= tracked(this.tasks, () =>
      import('../../../../assets/data/projects.json').then((m) => m.default.projects as Project[]),
    );
    return this.examplesP;
  }

  async get(ref: string): Promise<Project | null> {
    const example = (await this.examples()).find((p) => p.ref === ref);
    return example ?? this.custom()[ref] ?? null;
  }

  async create(input: ProjectInput): Promise<Project> {
    const [{ RULE_SET }, { describeProject }] = await Promise.all([
      import('../../domain/rule-set.data'),
      import('../../domain/rules-engine'),
    ]);
    const now = new Date();
    const project = describeProject(newProjectRef(now.getFullYear()), input, RULE_SET, now.toISOString());
    this.storage.set(CUSTOM_KEY, { ...this.custom(), [project.ref]: project });
    return project;
  }

  setCurrent(ref: string | null): void {
    this._current.set(ref);
    if (ref) this.storage.set(CURRENT_KEY, ref);
    else this.storage.remove(CURRENT_KEY);
  }

  /** Re-reads state after the demo data was reset. */
  reload(): void {
    this._current.set(this.storage.get<string | null>(CURRENT_KEY, null));
  }

  private custom(): Record<string, Project> {
    return this.storage.get<Record<string, Project>>(CUSTOM_KEY, {});
  }
}
