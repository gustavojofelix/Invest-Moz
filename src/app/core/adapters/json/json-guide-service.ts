import { Injectable, PendingTasks, inject } from '@angular/core';
import { tracked } from '../pending';
import type { GuideChapterBody, GuideChapterId, GuideIndex } from '../../domain/guide';
import { GuideService } from '../../ports';

/** One lazy chunk per chapter, so a chapter page loads only its own text. */
const CHAPTERS: Record<GuideChapterId, () => Promise<{ default: unknown }>> = {
  'at-a-glance': () => import('../../../../assets/data/guide/chapters/at-a-glance.json'),
  'why-mozambique': () => import('../../../../assets/data/guide/chapters/why-mozambique.json'),
  sectors: () => import('../../../../assets/data/guide/chapters/sectors.json'),
  'investment-law': () => import('../../../../assets/data/guide/chapters/investment-law.json'),
  'company-setup': () => import('../../../../assets/data/guide/chapters/company-setup.json'),
  roadmap: () => import('../../../../assets/data/guide/chapters/roadmap.json'),
  tax: () => import('../../../../assets/data/guide/chapters/tax.json'),
  people: () => import('../../../../assets/data/guide/chapters/people.json'),
  exchange: () => import('../../../../assets/data/guide/chapters/exchange.json'),
  zones: () => import('../../../../assets/data/guide/chapters/zones.json'),
  'land-esg': () => import('../../../../assets/data/guide/chapters/land-esg.json'),
  protection: () => import('../../../../assets/data/guide/chapters/protection.json'),
};

@Injectable()
export class JsonGuideService extends GuideService {
  private readonly tasks = inject(PendingTasks);
  private indexP?: Promise<GuideIndex>;
  private readonly chapters = new Map<GuideChapterId, Promise<GuideChapterBody>>();

  index(): Promise<GuideIndex> {
    this.indexP ??= tracked(this.tasks, () =>
      import('../../../../assets/data/guide/index.json').then((m) => m.default as GuideIndex),
    );
    return this.indexP;
  }

  chapter(id: GuideChapterId): Promise<GuideChapterBody> {
    let p = this.chapters.get(id);
    if (!p) {
      p = tracked(this.tasks, () => CHAPTERS[id]().then((m) => m.default as GuideChapterBody));
      this.chapters.set(id, p);
    }
    return p;
  }
}
