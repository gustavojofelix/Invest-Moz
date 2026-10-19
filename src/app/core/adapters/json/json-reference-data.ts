import { Injectable, PendingTasks, inject } from '@angular/core';
import { tracked } from '../pending';
import type { Country, Holiday } from '../../domain/types';
import { ReferenceData } from '../../ports';

@Injectable()
export class JsonReferenceData extends ReferenceData {
  private readonly tasks = inject(PendingTasks);
  private countriesP?: Promise<Country[]>;
  private holidaysP?: Promise<Holiday[]>;

  countries(): Promise<Country[]> {
    this.countriesP ??= tracked(this.tasks, () =>
      import('../../../../assets/data/countries.json').then(
        (m) => m.default.countries as Country[],
      ),
    );
    return this.countriesP;
  }

  holidays(): Promise<Holiday[]> {
    this.holidaysP ??= tracked(this.tasks, () =>
      import('../../../../assets/data/holidays.json').then((m) => m.default.holidays as Holiday[]),
    );
    return this.holidaysP;
  }
}
