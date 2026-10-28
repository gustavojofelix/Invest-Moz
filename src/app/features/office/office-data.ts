import { Injectable, PendingTasks, inject } from '@angular/core';
import type { LocalizedText, RefId, SectorId, TopicId } from '@core/domain/types';
import type { DirectoryData } from '@features/directory/directory.types';

/**
 * Back-office seed data (`src/assets/data/office/*.json`). Everything here is
 * illustrative demo data: the screens label it as such.
 */

export type DraftKind = 'law_summary' | 'answer_template' | 'roadmap_rule' | 'flagged_answer';

export interface QueueDraft {
  id: string;
  kind: DraftKind;
  refId: RefId;
  instrument: string;
  createdAt: string;
  effective: string | null;
  affectsRoadmaps: boolean;
  conversationId?: string;
  meta: LocalizedText;
  context: LocalizedText;
  summary: LocalizedText;
  /** Official text (Portuguese, as published in the Boletim da República). Illustrative. */
  official: string;
}

export type AuditAction =
  'drafted' | 'flagged' | 'commented' | 'edited' | 'approved' | 'rejected' | 'uploaded';

export interface AuditEntry {
  at: string;
  draftId: string;
  action: AuditAction;
  reviewer: string;
  version: number;
  note?: string;
}

export type DiplomaStatus = 'active' | 'amended' | 'under_review' | 'revoked';

export interface DiplomaVersion {
  refId: RefId;
  version: number;
  status: DiplomaStatus;
  effective?: string;
  revokes?: RefId;
  revokedBy?: string;
}

export interface ExtraDiploma extends DiplomaVersion {
  instrument: string;
  topic: TopicId;
  title: LocalizedText;
}

export interface ScanItem {
  instrument: string;
  outcome: 'queued' | 'published' | 'no_impact';
  note: LocalizedText;
}

export interface DiplomaSeed {
  versions: DiplomaVersion[];
  extra: ExtraDiploma[];
  scan: { lastScan: string; nextScan: string; issuesRead: number; items: ScanItem[] };
}

export type ReviewReason = 'low_confidence' | 'user_flagged' | 'law_changed';

export interface ReviewConversation {
  id: string;
  chat: string;
  locale: string;
  channel: 'web' | 'app' | 'whatsapp';
  topic: TopicId;
  reason: ReviewReason;
  confidence: number;
  receivedAt: string;
  refs: RefId[];
  question: string;
  answer: string;
  questionTranslation: LocalizedText;
  answerTranslation: LocalizedText;
  gap: LocalizedText | null;
}

export interface IntelPeriod {
  id: string;
  from: string;
  to: string;
  conversations: number;
  investors: number;
  roadmaps: number;
  citationRate: number;
  sectors: { sector: SectorId; roadmaps: number }[];
  origins: { country: string; investors: number }[];
}

export interface UnansweredQuestion {
  id: string;
  topic: TopicId;
  asked: number;
  text: LocalizedText;
}

export interface IntelSeed {
  periods: IntelPeriod[];
  unanswered: UnansweredQuestion[];
}

export type PartnerContract =
  'founding_sponsor' | 'sponsor' | 'expert_partner' | 'partner' | 'verified_listing';

export interface PartnerContractSeed {
  listingId: string;
  contract: PartnerContract;
  contractRef: string | null;
  docs: 'complete' | 'pending' | 'expired';
  placements: ('landing_footer' | 'directory' | 'expert')[];
}

export interface PartnerSeed {
  rules: { maxSponsoredPerCategory: number; publicBodiesFirst: boolean };
  contracts: PartnerContractSeed[];
}

/** Loads each seed file once (dynamic import, so it stays out of the main bundle). */
@Injectable({ providedIn: 'root' })
export class OfficeData {
  private readonly tasks = inject(PendingTasks);
  private readonly cache = new Map<string, Promise<unknown>>();

  queue(): Promise<{ drafts: QueueDraft[]; log: AuditEntry[] }> {
    return this.once('queue', () => import('../../../assets/data/office/queue.json'));
  }

  diplomas(): Promise<DiplomaSeed> {
    return this.once('diplomas', () => import('../../../assets/data/office/diplomas.json'));
  }

  conversations(): Promise<{ conversations: ReviewConversation[] }> {
    return this.once(
      'conversations',
      () => import('../../../assets/data/office/conversations.json'),
    );
  }

  intelligence(): Promise<IntelSeed> {
    return this.once('intelligence', () => import('../../../assets/data/office/intelligence.json'));
  }

  partners(): Promise<PartnerSeed> {
    return this.once('partners', () => import('../../../assets/data/office/partners.json'));
  }

  directory(): Promise<DirectoryData> {
    return this.once('directory', () => import('../../../assets/data/directory/listings.json'));
  }

  private once<T>(key: string, load: () => Promise<{ default: unknown }>): Promise<T> {
    let p = this.cache.get(key) as Promise<T> | undefined;
    if (!p) {
      const done = this.tasks.add();
      p = load()
        .then((m) => m.default as T)
        .finally(done);
      this.cache.set(key, p);
    }
    return p;
  }
}
