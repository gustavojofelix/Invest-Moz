import { Injectable, PendingTasks, computed, inject, signal } from '@angular/core';
import { tracked } from '../pending';
import { nextEnquiryRef } from '../../domain/refs';
import type { Enquiry, EnquiryStatus } from '../../domain/types';
import { EnquiryRepository, type EnquiryDraft } from '../../ports';
import { SafeStorage } from '../safe-storage';

interface Patch {
  status?: EnquiryStatus;
  notes?: Enquiry['notes'];
}

const ADDED = 'enquiries.added';
const PATCHES = 'enquiries.patches';
const SEEN = 'enquiries.seen';

/**
 * Seeded enquiries (JSON) with a localStorage overlay holding enquiries
 * submitted during the demo, status changes and internal notes.
 */
@Injectable()
export class JsonEnquiryRepository extends EnquiryRepository {
  private readonly storage = inject(SafeStorage);
  private readonly tasks = inject(PendingTasks);
  private readonly seed = signal<Enquiry[]>([]);
  private readonly added = signal<Enquiry[]>([]);
  private readonly patches = signal<Record<string, Patch>>({});
  private readonly seen = signal<string[]>([]);
  private readonly _loaded = signal(false);
  private loading?: Promise<void>;

  readonly loaded = this._loaded.asReadonly();
  readonly enquiries = computed(() => {
    const patches = this.patches();
    return [...this.added(), ...this.seed()]
      .map((e) => ({ ...e, ...patches[e.ref], notes: patches[e.ref]?.notes ?? e.notes }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  load(): Promise<void> {
    this.readOverlay();
    this.loading ??= tracked(this.tasks, async () => {
      const m = await import('../../../../assets/data/enquiries.json');
      this.seed.set(m.default.enquiries as Enquiry[]);
      this._loaded.set(true);
    });
    return this.loading;
  }

  async get(ref: string): Promise<Enquiry | null> {
    await this.load();
    return this.enquiries().find((e) => e.ref === ref) ?? null;
  }

  async create(draft: EnquiryDraft): Promise<Enquiry> {
    await this.load();
    const now = new Date();
    const enquiry: Enquiry = {
      ...draft,
      ref: nextEnquiryRef(
        this.enquiries().map((e) => e.ref),
        now.getFullYear(),
      ),
      createdAt: now.toISOString(),
      status: 'new',
      notes: [],
      submittedInDemo: true,
    };
    this.added.update((list) => [enquiry, ...list]);
    this.storage.set(ADDED, this.added());
    return enquiry;
  }

  async updateStatus(ref: string, status: EnquiryStatus): Promise<void> {
    this.patch(ref, { status });
  }

  async addNote(ref: string, text: string): Promise<void> {
    const current = this.enquiries().find((e) => e.ref === ref);
    if (!current || !text.trim()) return;
    this.patch(ref, { notes: [...current.notes, { at: new Date().toISOString(), text: text.trim() }] });
  }

  markSeen(ref: string): void {
    if (this.seen().includes(ref)) return;
    this.seen.update((s) => [...s, ref]);
    this.storage.set(SEEN, this.seen());
  }

  isUnseen(ref: string): boolean {
    const e = this.enquiries().find((x) => x.ref === ref);
    return !!e?.submittedInDemo && !this.seen().includes(ref);
  }

  /** Re-reads the overlay (after a demo reset). */
  reload(): void {
    this.readOverlay();
  }

  private patch(ref: string, patch: Patch): void {
    this.patches.update((p) => ({ ...p, [ref]: { ...p[ref], ...patch } }));
    this.storage.set(PATCHES, this.patches());
  }

  private readOverlay(): void {
    this.added.set(this.storage.get<Enquiry[]>(ADDED, []));
    this.patches.set(this.storage.get<Record<string, Patch>>(PATCHES, {}));
    this.seen.set(this.storage.get<string[]>(SEEN, []));
  }
}
