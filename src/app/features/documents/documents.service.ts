import { Injectable, PendingTasks, inject, signal } from '@angular/core';
import { SafeStorage } from '@core/adapters/safe-storage';
import type { ChecklistData, UploadedFile } from './documents.types';

/** Checklists (JSON seed) and the simulated uploads (localStorage, metadata only). */
@Injectable({ providedIn: 'root' })
export class DocumentsService {
  private readonly storage = inject(SafeStorage);
  private readonly tasks = inject(PendingTasks);
  private dataP?: Promise<ChecklistData>;
  private readonly version = signal(0);

  checklists(): Promise<ChecklistData> {
    this.dataP ??= (() => {
      const done = this.tasks.add();
      return import('../../../assets/data/documents/checklists.json')
        .then((m) => m.default as unknown as ChecklistData)
        .finally(done);
    })();
    return this.dataP;
  }

  /** Uploads for a project (or the guest), keyed by document id. Reactive. */
  uploads(owner: string): Record<string, UploadedFile> {
    this.version();
    return this.storage.get<Record<string, UploadedFile>>(this.key(owner), {});
  }

  upload(owner: string, docId: string, file: Pick<File, 'name' | 'size' | 'type'>): void {
    const entry: UploadedFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      at: new Date().toISOString(),
    };
    this.storage.set(this.key(owner), { ...this.uploads(owner), [docId]: entry });
    this.version.update((v) => v + 1);
  }

  remove(owner: string, docId: string): void {
    const next = { ...this.uploads(owner) };
    delete next[docId];
    this.storage.set(this.key(owner), next);
    this.version.update((v) => v + 1);
  }

  private key(owner: string): string {
    return `documents:${owner}`;
  }
}
