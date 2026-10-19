import type { Provider } from '@angular/core';
import {
  AssessmentService,
  AuthService,
  DemoStateService,
  EnquiryRepository,
  KnowledgeBase,
  ProjectRepository,
  QaService,
  ReferenceData,
} from '../../ports';
import { JsonAssessmentService } from './json-assessment-service';
import { JsonAuthService } from './json-auth-service';
import { JsonDemoStateService } from './json-demo-state';
import { JsonEnquiryRepository } from './json-enquiry-repository';
import { JsonKnowledgeBase } from './json-knowledge-base';
import { JsonProjectRepository } from './json-project-repository';
import { JsonQaService } from './json-qa-service';
import { JsonReferenceData } from './json-reference-data';

/**
 * POC wiring: every port backed by JSON + localStorage. The backend phase adds
 * `provideHttpAdapters()` with the same ports and swaps it in app.config.ts.
 */
export function provideJsonAdapters(): Provider[] {
  return [
    { provide: ReferenceData, useClass: JsonReferenceData },
    { provide: KnowledgeBase, useClass: JsonKnowledgeBase },
    { provide: ProjectRepository, useClass: JsonProjectRepository },
    { provide: AssessmentService, useClass: JsonAssessmentService },
    { provide: QaService, useClass: JsonQaService },
    { provide: EnquiryRepository, useClass: JsonEnquiryRepository },
    { provide: AuthService, useClass: JsonAuthService },
    { provide: DemoStateService, useClass: JsonDemoStateService },
  ];
}
