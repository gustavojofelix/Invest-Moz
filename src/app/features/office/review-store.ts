import { Injectable, computed, inject, signal } from '@angular/core';
import { SafeStorage } from '@core/adapters/safe-storage';
import type { TopicId } from '@core/domain/types';
import { AuthService } from '@core/ports';
import { OfficeData, type ReviewConversation } from './office-data';

export type ReviewAction = 'corrected' | 'approved' | 'escalated';

export interface ReviewDecision {
  action: ReviewAction;
  correction: string;
  notify: boolean;
  at: string;
  reviewer: string;
}

export interface KbGap {
  at: string;
  conversationId: string;
  topic: TopicId;
  text: string;
}

interface Overlay {
  decisions: Record<string, ReviewDecision>;
  gaps: KbGap[];
}

const KEY = 'office.review';

/** Conversation review: seed conversations plus reviewer decisions and logged KB gaps. */
@Injectable({ providedIn: 'root' })
export class ReviewStore {
  private readonly data = inject(OfficeData);
  private readonly storage = inject(SafeStorage);
  private readonly auth = inject(AuthService);

  readonly conversations = signal<ReviewConversation[]>([]);
  readonly loaded = signal(false);
  private readonly overlay = signal<Overlay>({ decisions: {}, gaps: [] });

  readonly decisions = computed(() => this.overlay().decisions);
  readonly gaps = computed(() => [...this.overlay().gaps].sort((a, b) => b.at.localeCompare(a.at)));
  readonly open = computed(() => this.conversations().filter((c) => !this.decisions()[c.id]));

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.reload();
    const seed = await this.data.conversations();
    this.conversations.set(
      [...seed.conversations].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    );
    this.loaded.set(true);
  }

  reload(): void {
    this.overlay.set({ decisions: {}, gaps: [], ...this.storage.get<Partial<Overlay>>(KEY, {}) });
  }

  decide(c: ReviewConversation, action: ReviewAction, correction: string, notify: boolean): void {
    const decision: ReviewDecision = {
      action,
      correction: correction.trim(),
      notify,
      at: new Date().toISOString(),
      reviewer: this.auth.user()?.name ?? 'Tax Advisory',
    };
    this.write((o) => ({ ...o, decisions: { ...o.decisions, [c.id]: decision } }));
  }

  logGap(c: ReviewConversation, text: string): void {
    const t = text.trim();
    if (!t || this.overlay().gaps.some((g) => g.conversationId === c.id && g.text === t)) return;
    const gap: KbGap = {
      at: new Date().toISOString(),
      conversationId: c.id,
      topic: c.topic,
      text: t,
    };
    this.write((o) => ({ ...o, gaps: [...o.gaps, gap] }));
  }

  reopen(id: string): void {
    this.write((o) => {
      const decisions = { ...o.decisions };
      delete decisions[id];
      return { ...o, decisions };
    });
  }

  private write(fn: (o: Overlay) => Overlay): void {
    this.overlay.update(fn);
    this.storage.set(KEY, this.overlay());
  }
}
