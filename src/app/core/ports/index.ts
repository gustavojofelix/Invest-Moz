/**
 * Ports — abstract services used as DI tokens. Components and facades depend
 * only on these. This phase wires the `Json*` adapters in `app.config.ts`;
 * the backend phase swaps in `Http*` adapters with no component changes.
 */
import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  Assessment,
  Country,
  Enquiry,
  EnquiryStatus,
  Holiday,
  LegalReference,
  Locale,
  Project,
  ProjectInput,
  QaAnswer,
  QaTopic,
  RefId,
  TopicId,
} from '../domain/types';

export abstract class ProjectRepository {
  abstract examples(): Promise<Project[]>;
  abstract get(ref: string): Promise<Project | null>;
  /** Saves a visitor-described project and returns it with a new reference. */
  abstract create(input: ProjectInput): Promise<Project>;
  /** The project currently "in context" (used by Q&A and the enquiry form). */
  abstract readonly currentRef: Signal<string | null>;
  abstract setCurrent(ref: string | null): void;
}

export abstract class AssessmentService {
  abstract assess(project: Project): Promise<Assessment>;
}

export abstract class KnowledgeBase {
  abstract all(): Promise<LegalReference[]>;
  /** Synchronous lookup; returns undefined until `all()` has resolved once. */
  abstract lookup(id: RefId): LegalReference | undefined;
  abstract readonly loaded: Signal<boolean>;
}

export abstract class ReferenceData {
  abstract countries(): Promise<Country[]>;
  abstract holidays(): Promise<Holiday[]>;
}

export interface QaMatch {
  answer: QaAnswer | null;
  score: number;
}

export abstract class QaService {
  abstract topics(): Promise<QaTopic[]>;
  abstract answers(topic?: TopicId): Promise<QaAnswer[]>;
  abstract match(question: string, lang: Locale): Promise<QaMatch>;
  /**
   * Streams a prepared answer body in chunks. Simulated now; the backend phase
   * maps this onto SSE from the RAG endpoint.
   */
  abstract stream(text: string, opts?: { instant?: boolean }): Observable<string>;
}

export type EnquiryDraft = Omit<
  Enquiry,
  'ref' | 'createdAt' | 'status' | 'notes' | 'submittedInDemo'
>;

export abstract class EnquiryRepository {
  abstract readonly enquiries: Signal<Enquiry[]>;
  abstract readonly loaded: Signal<boolean>;
  abstract load(): Promise<void>;
  abstract get(ref: string): Promise<Enquiry | null>;
  abstract create(draft: EnquiryDraft): Promise<Enquiry>;
  abstract updateStatus(ref: string, status: EnquiryStatus): Promise<void>;
  abstract addNote(ref: string, text: string): Promise<void>;
  abstract markSeen(ref: string): void;
  abstract isUnseen(ref: string): boolean;
}

export interface DemoUser {
  email: string;
  name: string;
}

export abstract class AuthService {
  abstract readonly user: Signal<DemoUser | null>;
  abstract login(email: string, password: string): Promise<boolean>;
  abstract logout(): void;
}

export abstract class DemoStateService {
  /** Clears every locally stored change and restores the seed data. */
  abstract reset(): Promise<void>;
}
