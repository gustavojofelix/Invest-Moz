import { Injectable, PendingTasks, inject } from '@angular/core';
import { tracked } from '@core/adapters/pending';
import type { LocalizedText, TopicId } from '@core/domain/types';

export interface Expert {
  id: string;
  /** `partner`: paid expert partner; `public`: free public body. */
  kind: 'partner' | 'public';
  fee: 'paid' | 'free';
  name: string;
  /** Path under `public/`. */
  logo?: string;
  /** Enquiry areas preselected when this expert is chosen. */
  areas: TopicId[];
  role: LocalizedText;
  helps: LocalizedText;
}

/** Who Tiva can hand a project to (`data/expert/experts.json`). */
@Injectable({ providedIn: 'root' })
export class ExpertDirectory {
  private readonly tasks = inject(PendingTasks);
  private data?: Promise<Expert[]>;

  all(): Promise<Expert[]> {
    this.data ??= tracked(this.tasks, () =>
      import('../../../assets/data/expert/experts.json').then(
        (m) => m.default.experts as unknown as Expert[],
      ),
    );
    return this.data;
  }

  async get(id: string | undefined): Promise<Expert | null> {
    if (!id) return null;
    return (await this.all()).find((e) => e.id === id) ?? null;
  }
}
