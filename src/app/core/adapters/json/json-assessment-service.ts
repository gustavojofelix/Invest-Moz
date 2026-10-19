import { Injectable, inject } from '@angular/core';
import type { Assessment, Project } from '../../domain/types';
import { AssessmentService, ReferenceData } from '../../ports';

/** Today's date in Maputo (CAT, UTC+2) as YYYY-MM-DD. */
export function maputoToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo' }).format(now);
}

/** Runs the pure TypeScript rules engine in the browser. */
@Injectable()
export class JsonAssessmentService extends AssessmentService {
  private readonly reference = inject(ReferenceData);

  async assess(project: Project): Promise<Assessment> {
    // Engine and rule tables load lazily, outside the initial bundle.
    const [countries, holidays, { RULE_SET }, { assess }] = await Promise.all([
      this.reference.countries(),
      this.reference.holidays(),
      import('../../domain/rule-set.data'),
      import('../../domain/rules-engine'),
    ]);
    return assess(project, RULE_SET, { today: maputoToday(), countries, holidays });
  }
}
