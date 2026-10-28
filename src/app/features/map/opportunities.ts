import { Injectable, PendingTasks, inject } from '@angular/core';
import { tracked } from '@core/adapters/pending';
import type { LocalizedText, ProvinceCode, SectorId } from '@core/domain/types';

export type CorridorId = 'maputo' | 'beira' | 'nacala' | 'rovuma';
export type ZoneKind = 'sez' | 'ifz' | 'park' | 'tourism';

export interface Corridor {
  id: CorridorId;
  name: LocalizedText;
  /** Id of the matching location note in `rules/zones.json` (description and refs). */
  rule: string;
}

export interface EconomicZone {
  id: string;
  kind: ZoneKind;
  province: ProvinceCode;
  name: LocalizedText;
  detail: LocalizedText;
  /** Marker position in the map's SVG coordinates (omitted when not mapped). */
  x?: number;
  y?: number;
}

export interface ProvinceProfile {
  code: ProvinceCode;
  corridor: CorridorId | null;
  sectors: SectorId[];
  highlights: LocalizedText[];
}

export interface Opportunities {
  corridors: Corridor[];
  zones: EconomicZone[];
  provinces: ProvinceProfile[];
}

/** Map of opportunities: corridors, economic zones and province profiles (`data/map`). */
@Injectable({ providedIn: 'root' })
export class OpportunityData {
  private readonly tasks = inject(PendingTasks);
  private data?: Promise<Opportunities>;

  load(): Promise<Opportunities> {
    this.data ??= tracked(this.tasks, () =>
      import('../../../assets/data/map/opportunities.json').then(
        (m) => m.default as unknown as Opportunities,
      ),
    );
    return this.data;
  }
}
