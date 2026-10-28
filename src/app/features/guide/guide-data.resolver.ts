import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { isGuideChapter, type GuideChapterBody, type GuideIndex } from '@core/domain/guide';
import { GuideService } from '@core/ports';

/** Resolvers run before render, so prerendered HTML and the first client render match. */
export const guideIndexResolver: ResolveFn<GuideIndex> = () => inject(GuideService).index();

/** The chapter body for `:chapter`, or null for an unknown id (the page shows "not found"). */
export const guideChapterResolver: ResolveFn<GuideChapterBody | null> = (route) => {
  const id = route.paramMap.get('chapter');
  return isGuideChapter(id) ? inject(GuideService).chapter(id) : null;
};
