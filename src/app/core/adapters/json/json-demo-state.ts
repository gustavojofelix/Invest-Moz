import { Injectable, inject } from '@angular/core';
import { AuthService, DemoStateService, EnquiryRepository, ProjectRepository } from '../../ports';
import { SafeStorage } from '../safe-storage';
import { JsonEnquiryRepository } from './json-enquiry-repository';
import { JsonProjectRepository } from './json-project-repository';

/** Clears the localStorage overlay and restores the seeded demo data. */
@Injectable()
export class JsonDemoStateService extends DemoStateService {
  private readonly storage = inject(SafeStorage);
  private readonly enquiries = inject(EnquiryRepository);
  private readonly projects = inject(ProjectRepository);
  private readonly auth = inject(AuthService);

  async reset(): Promise<void> {
    // Keep presentation preferences (language and theme).
    this.storage.clearAll(['lang', 'theme']);
    this.auth.logout();
    if (this.enquiries instanceof JsonEnquiryRepository) this.enquiries.reload();
    if (this.projects instanceof JsonProjectRepository) this.projects.reload();
  }
}
