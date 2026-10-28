import { Injectable, PendingTasks, inject } from '@angular/core';
import type { DirectoryData } from './directory.types';

/** Directory listings (JSON seed, read-only). */
@Injectable({ providedIn: 'root' })
export class DirectoryService {
  private readonly tasks = inject(PendingTasks);
  private dataP?: Promise<DirectoryData>;

  load(): Promise<DirectoryData> {
    this.dataP ??= (() => {
      const done = this.tasks.add();
      return import('../../../assets/data/directory/listings.json')
        .then((m) => m.default as unknown as DirectoryData)
        .finally(done);
    })();
    return this.dataP;
  }
}
