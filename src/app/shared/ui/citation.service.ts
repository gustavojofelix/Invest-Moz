import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { KnowledgeBase } from '@core/ports';
import { SheetService } from './sheet';

/**
 * Opens the citation sheet for a knowledge-base reference. The sheet is loaded
 * lazily, which also keeps ref-tag free of a static dependency cycle.
 */
@Injectable({ providedIn: 'root' })
export class CitationService {
  private readonly sheet = inject(SheetService);
  private readonly kb = inject(KnowledgeBase);
  private readonly transloco = inject(TranslocoService);

  openLabel(): string {
    return this.transloco.translate('ui.citation.open');
  }

  async open(refId: string): Promise<void> {
    const [{ CitationSheet }] = await Promise.all([import('./citation-sheet'), this.kb.all()]);
    const ref = this.kb.lookup(refId);
    if (!ref) return;
    this.sheet.open(CitationSheet, { data: ref, label: ref.instrument });
  }
}
