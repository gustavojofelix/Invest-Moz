import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import type { QaAnswer, QaTopic } from '@core/domain/types';
import { QaService } from '@core/ports';

export interface QaData {
  topics: QaTopic[];
  answers: QaAnswer[];
}

/**
 * Loads topics and answers before the page renders, so the first client render
 * matches the prerendered HTML (no flash or late repaint after hydration).
 */
export const qaDataResolver: ResolveFn<QaData> = async () => {
  const qa = inject(QaService);
  const [topics, answers] = await Promise.all([qa.topics(), qa.answers()]);
  return { topics, answers };
};
