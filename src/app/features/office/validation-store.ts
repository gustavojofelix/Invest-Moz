import { Injectable, computed, inject, signal } from '@angular/core';
import { SafeStorage } from '@core/adapters/safe-storage';
import { pickText } from '@core/domain/text';
import { LOCALES, type Locale, type LocalizedText } from '@core/domain/types';
import { AuthService } from '@core/ports';
import { OfficeData, type AuditAction, type AuditEntry, type QueueDraft } from './office-data';

export type Decision = 'approved' | 'rejected';

interface Overlay {
  decisions: Record<string, Decision>;
  /** Reviewer edits of the AI summary, per draft and language. */
  edits: Record<string, Partial<LocalizedText>>;
  log: AuditEntry[];
  uploads: QueueDraft[];
}

const KEY = 'office.queue';
const EMPTY: Overlay = { decisions: {}, edits: {}, log: [], uploads: [] };

function blankText(): LocalizedText {
  return Object.fromEntries(LOCALES.map((l) => [l, ''])) as LocalizedText;
}

/**
 * Validation queue state: seed drafts plus a localStorage overlay holding the
 * decisions, edits, uploads and the audit log, so they survive a reload.
 */
@Injectable({ providedIn: 'root' })
export class ValidationStore {
  private readonly data = inject(OfficeData);
  private readonly storage = inject(SafeStorage);
  private readonly auth = inject(AuthService);

  private readonly seedDrafts = signal<QueueDraft[]>([]);
  private readonly seedLog = signal<AuditEntry[]>([]);
  private readonly overlay = signal<Overlay>(EMPTY);
  readonly loaded = signal(false);

  readonly drafts = computed(() => [...this.overlay().uploads, ...this.seedDrafts()]);
  readonly decisions = computed(() => this.overlay().decisions);
  readonly pending = computed(() => this.drafts().filter((d) => !this.decisions()[d.id]));
  readonly reviewed = computed(() => this.drafts().filter((d) => !!this.decisions()[d.id]));
  readonly log = computed(() =>
    [...this.seedLog(), ...this.overlay().log].sort((a, b) => b.at.localeCompare(a.at)),
  );

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.reload();
    const seed = await this.data.queue();
    this.seedDrafts.set(seed.drafts);
    this.seedLog.set(seed.log);
    this.loaded.set(true);
  }

  /** Re-reads the overlay (after a demo reset). */
  reload(): void {
    this.overlay.set({ ...EMPTY, ...this.storage.get<Partial<Overlay>>(KEY, {}) });
  }

  version(id: string): number {
    return this.log()
      .filter((e) => e.draftId === id)
      .reduce((v, e) => Math.max(v, e.version), 1);
  }

  summary(draft: QueueDraft, lang: Locale): string {
    return this.overlay().edits[draft.id]?.[lang] || pickText(draft.summary, lang);
  }

  edited(id: string): boolean {
    return !!this.overlay().edits[id];
  }

  approve(id: string, note: string): void {
    this.decide(id, 'approved', note);
  }

  reject(id: string, note: string): void {
    this.decide(id, 'rejected', note);
  }

  saveEdit(id: string, lang: Locale, text: string, note: string): void {
    const version = this.version(id) + 1;
    this.write((o) => ({
      ...o,
      edits: { ...o.edits, [id]: { ...o.edits[id], [lang]: text.trim() } },
      log: [...o.log, this.entry(id, 'edited', version, note)],
    }));
  }

  /** Simulated upload: adds a draft that the AI "is preparing". */
  upload(instrument: string): QueueDraft {
    const now = new Date().toISOString();
    const draft: QueueDraft = {
      id: `q-up-${Date.now()}`,
      kind: 'law_summary',
      refId: '',
      instrument: instrument.trim(),
      createdAt: now,
      effective: null,
      affectsRoadmaps: false,
      meta: blankText(),
      context: blankText(),
      summary: blankText(),
      official: '',
    };
    this.write((o) => ({
      ...o,
      uploads: [draft, ...o.uploads],
      log: [...o.log, this.entry(draft.id, 'uploaded', 1, '')],
    }));
    return draft;
  }

  private decide(id: string, decision: Decision, note: string): void {
    this.write((o) => ({
      ...o,
      decisions: { ...o.decisions, [id]: decision },
      log: [...o.log, this.entry(id, decision, this.version(id), note)],
    }));
  }

  private entry(draftId: string, action: AuditAction, version: number, note: string): AuditEntry {
    const reviewer = this.auth.user()?.name ?? 'Tax Advisory';
    return {
      at: new Date().toISOString(),
      draftId,
      action,
      reviewer,
      version,
      ...(note.trim() ? { note: note.trim() } : {}),
    };
  }

  private write(fn: (o: Overlay) => Overlay): void {
    this.overlay.update(fn);
    this.storage.set(KEY, this.overlay());
  }
}
