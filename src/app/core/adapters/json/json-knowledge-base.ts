import { Injectable, PendingTasks, inject, signal } from '@angular/core';
import { tracked } from '../pending';
import type { LegalReference, RefId } from '../../domain/types';
import { KnowledgeBase } from '../../ports';

@Injectable()
export class JsonKnowledgeBase extends KnowledgeBase {
  private readonly tasks = inject(PendingTasks);
  private readonly byId = new Map<RefId, LegalReference>();
  private promise?: Promise<LegalReference[]>;
  private readonly _loaded = signal(false);
  readonly loaded = this._loaded.asReadonly();

  all(): Promise<LegalReference[]> {
    this.promise ??= tracked(this.tasks, async () => {
      const m = await import('../../../../assets/data/knowledge-base.json');
      const refs = m.default.references as LegalReference[];
      refs.forEach((r) => this.byId.set(r.id, r));
      this._loaded.set(true);
      return refs;
    });
    return this.promise;
  }

  lookup(id: RefId): LegalReference | undefined {
    if (!this.promise) void this.all();
    return this.byId.get(id);
  }
}
