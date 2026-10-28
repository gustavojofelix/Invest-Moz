import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { RULE_SET } from '@core/domain/rule-set.data';
import { classifySector } from '@core/domain/rules-engine';
import { pickText } from '@core/domain/text';
import { PROVINCES, type ProvinceCode, type SectorId } from '@core/domain/types';
import { LocPipe } from '@core/i18n/format';
import { LocaleService } from '@core/i18n/locale.service';
import { ProjectRepository } from '@core/ports';
import { MozMap, type MapMarker } from '@features/landing/map/moz-map';
import { Icon } from '@shared/ui/icon';
import { RefTag } from '@shared/ui/ref-tag';
import { OpportunityData } from './opportunities';

export const MAP_SECTORS: readonly SectorId[] = [
  'agro_industry',
  'tourism',
  'energy',
  'logistics',
  'mining',
  'oil_gas',
  'services',
];

function asProvince(v: string | undefined): ProvinceCode | null {
  return (PROVINCES as readonly string[]).includes(v ?? '') ? (v as ProvinceCode) : null;
}

function asSector(v: string | undefined): SectorId | null {
  return (MAP_SECTORS as readonly string[]).includes(v ?? '') ? (v as SectorId) : null;
}

/** 7 · Opportunity map: provinces, corridors, economic zones and a province card. */
@Component({
  selector: 'im-map-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, RouterLink, TranslocoDirective, LocPipe, MozMap, RefTag],
  template: `
    <ng-container *transloco="let t">
      <div class="bg-surface-alt pb-12">
        <header class="border-b border-rule bg-paper">
          <div class="container-page py-6 sm:py-8">
            <p class="eyebrow text-brand">{{ t('map.eyebrow') }}</p>
            <h1 class="mt-1 font-serif text-2xl sm:text-3xl">{{ t('map.title') }}</h1>
            <p class="mt-2 max-w-2xl text-muted">{{ t('map.intro') }}</p>
            <div
              role="group"
              [attr.aria-label]="t('map.filter')"
              class="pills -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
            >
              <button
                type="button"
                class="pill shrink-0"
                [attr.aria-pressed]="!chosenSector()"
                (click)="setSector(null)"
              >
                {{ t('map.all') }}
              </button>
              @for (s of sectors; track s) {
                <button
                  type="button"
                  class="pill shrink-0"
                  [attr.aria-pressed]="chosenSector() === s"
                  (click)="setSector(s)"
                >
                  {{ t('map.sectors.' + s) }}
                </button>
              }
            </div>
          </div>
        </header>

        <div class="container-page mt-6 grid gap-6 lg:grid-cols-12">
          <section class="min-w-0 lg:col-span-7" [attr.aria-label]="t('map.mapLabel')">
            <div class="card p-4 sm:p-6">
              <label class="field-label" for="map-province">{{ t('map.pick') }}</label>
              <select
                id="map-province"
                class="input mt-1.5"
                [value]="chosenProvince() ?? ''"
                (change)="pick($any($event.target).value)"
              >
                <option value="" disabled>{{ t('map.hint') }}</option>
                @for (p of provinceOptions(); track p.code) {
                  <option [value]="p.code">{{ p.name }}</option>
                }
              </select>
              @if (chosenSector()) {
                <p class="mt-2 text-sm text-muted" role="status">
                  {{ t('map.matches', { count: emphasis().length }) }}
                </p>
              }
              <div class="mx-auto mt-4 max-w-md">
                <im-moz-map
                  [selectable]="true"
                  [(selected)]="chosenProvince"
                  [emphasis]="emphasis()"
                  [activeCorridor]="corridorId()"
                  [markers]="markers()"
                  [label]="t('map.mapLabel')"
                  [hint]="t('map.hint')"
                  [portsLabel]="t('map.legend.ports')"
                  [citiesLabel]="t('map.legend.cities')"
                  [corridorsLabel]="t('map.legend.corridors')"
                  [zonesLabel]="t('map.legend.zones')"
                  [rovumaLabel]="t('map.legend.rovuma')"
                />
              </div>
              <p class="mt-3 text-xs text-muted">{{ t('map.note') }}</p>
            </div>
          </section>

          <section
            class="min-w-0 lg:col-span-5"
            aria-live="polite"
            [attr.aria-label]="t('map.card.region')"
          >
            @if (card(); as c) {
              <article class="card rounded-xl p-5 sm:p-6">
                <p class="eyebrow text-brand">
                  {{ c.corridor ? (c.corridor.name | loc: lang()) : t('map.card.noCorridor') }}
                </p>
                <h2 class="mt-1 font-serif text-2xl">{{ c.name }}</h2>

                @if (c.highlights.length) {
                  <h3 class="label-caps mt-5 text-muted">{{ t('map.card.highlights') }}</h3>
                  <ul class="mt-2 space-y-2 text-ink-soft" role="list">
                    @for (h of c.highlights; track $index) {
                      <li class="flex gap-2.5">
                        <span class="font-bold text-brand" aria-hidden="true">·</span>
                        <span>{{ h | loc: lang() }}</span>
                      </li>
                    }
                  </ul>
                }

                <h3 class="label-caps mt-5 text-muted">{{ t('map.card.sectors') }}</h3>
                <ul class="mt-2 flex flex-wrap gap-2" role="list">
                  @for (s of c.sectors; track s) {
                    <li>
                      <button
                        type="button"
                        class="pill"
                        [attr.aria-pressed]="chosenSector() === s"
                        (click)="setSector(s)"
                      >
                        {{ t('map.sectors.' + s) }}
                      </button>
                    </li>
                  }
                </ul>

                <h3 class="label-caps mt-5 text-muted">{{ t('map.card.zones') }}</h3>
                @if (c.zones.length) {
                  <ul class="mt-2 divide-y divide-rule-soft" role="list">
                    @for (z of c.zones; track z.id) {
                      <li class="py-2.5">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="font-bold">{{ z.name | loc: lang() }}</span>
                          <span
                            class="tag"
                            [class.tag-warn]="z.kind === 'sez' || z.kind === 'ifz'"
                            [class.tag-neutral]="z.kind !== 'sez' && z.kind !== 'ifz'"
                            >{{ t('map.kind.' + z.kind) }}</span
                          >
                        </div>
                        <p class="mt-0.5 text-sm text-muted">{{ z.detail | loc: lang() }}</p>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="mt-2 text-sm text-muted">{{ t('map.card.noZones') }}</p>
                }

                @if (c.note; as n) {
                  <div class="mt-5 rounded-md bg-surface p-4">
                    <h3 class="label-caps text-muted">{{ n.title | loc: lang() }}</h3>
                    <p class="mt-1.5 text-sm">{{ n.text | loc: lang() }}</p>
                    <div class="mt-2 flex flex-wrap gap-2">
                      @for (r of n.refs; track r) {
                        <im-ref-tag [refId]="r" />
                      }
                    </div>
                  </div>
                }

                <div class="mt-6 grid gap-2 sm:grid-cols-2">
                  <a
                    class="btn btn-primary"
                    [routerLink]="['/', lang(), 'incentives']"
                    [queryParams]="{ province: c.code, sector: chosenSector() ?? c.sectors[0] }"
                  >
                    <svg imIcon="percent" [size]="18" aria-hidden="true"></svg
                    >{{ t('map.card.incentives') }}
                  </a>
                  <a
                    class="btn btn-outline"
                    [routerLink]="['/', lang(), 'chat']"
                    [queryParams]="{ q: t('map.card.askQuestion', { province: c.name }) }"
                  >
                    <svg imIcon="message-circle" [size]="18" aria-hidden="true"></svg
                    >{{ t('map.card.ask') }}
                  </a>
                  <a
                    class="btn btn-ghost sm:col-span-2"
                    [routerLink]="['/', lang(), 'library', 'sectors']"
                  >
                    <svg imIcon="book-open" [size]="18" aria-hidden="true"></svg
                    >{{ t('map.card.profile') }}
                  </a>
                </div>
              </article>
            } @else {
              <div class="card p-6 text-muted">
                <svg imIcon="map-pin" [size]="22" class="text-brand" aria-hidden="true"></svg>
                <p class="mt-2">{{ t('map.card.empty') }}</p>
              </div>
            }
          </section>
        </div>
      </div>
    </ng-container>
  `,
  styles: `
    .pills {
      scrollbar-width: none;
    }
    .pills::-webkit-scrollbar {
      display: none;
    }
  `,
})
export class MapPage {
  /** Optional `?province=` and `?sector=` (bound by withComponentInputBinding). */
  readonly province = input<string>();
  readonly sector = input<string>();
  private readonly projects = inject(ProjectRepository);
  private readonly opportunities = inject(OpportunityData);
  protected readonly lang = inject(LocaleService).lang;
  protected readonly sectors = MAP_SECTORS;

  protected readonly data = resource({ loader: () => this.opportunities.load() });
  private readonly project = resource({
    params: () => this.projects.currentRef(),
    loader: async ({ params: ref }) => (ref ? this.projects.get(ref) : null),
  });

  protected readonly chosenProvince = linkedSignal<ProvinceCode | null>(
    () => asProvince(this.province()) ?? this.project.value()?.input.province ?? 'nampula',
  );
  protected readonly chosenSector = linkedSignal<SectorId | null>(() => {
    const fromParam = asSector(this.sector());
    if (fromParam) return fromParam;
    const p = this.project.value();
    if (!p) return null;
    return asSector(classifySector(p.input.idea, RULE_SET.sectors).id);
  });

  protected readonly provinceOptions = computed(() => {
    const l = this.lang();
    return PROVINCES.map((code) => ({ code, name: pickText(PROVINCE_NAMES[code], l) }));
  });

  protected readonly emphasis = computed<ProvinceCode[]>(() => {
    const s = this.chosenSector();
    const d = this.data.value();
    if (!s || !d) return [];
    return d.provinces.filter((p) => p.sectors.includes(s)).map((p) => p.code);
  });

  protected readonly markers = computed<MapMarker[]>(() => {
    const d = this.data.value();
    const sel = this.chosenProvince();
    const l = this.lang();
    if (!d) return [];
    return d.zones
      .filter((z) => z.x !== undefined && z.y !== undefined)
      .map((z) => ({
        id: z.id,
        x: z.x!,
        y: z.y!,
        kind: z.kind === 'sez' || z.kind === 'ifz' ? 'zone' : 'site',
        label: z.province === sel && z.kind !== 'tourism' ? pickText(z.name, l) : undefined,
      }));
  });

  protected readonly card = computed(() => {
    const code = this.chosenProvince();
    const d = this.data.value();
    if (!code || !d) return null;
    const profile = d.provinces.find((p) => p.code === code);
    const corridor = d.corridors.find((c) => c.id === profile?.corridor) ?? null;
    const noteId = corridor?.rule ?? (code === 'inhambane' ? 'inhambane-coast' : null);
    const note = RULE_SET.zones.location.find((r) => r.id === noteId)?.then ?? null;
    return {
      code,
      name: pickText(PROVINCE_NAMES[code], this.lang()),
      corridor,
      highlights: profile?.highlights ?? [],
      sectors: profile?.sectors ?? [],
      zones: d.zones.filter((z) => z.province === code),
      note,
    };
  });

  protected readonly corridorId = computed(() => this.card()?.corridor?.id ?? null);

  /** A sector that excludes the selected province moves the card to the first match. */
  protected setSector(s: SectorId | null): void {
    this.chosenSector.set(s);
    const e = this.emphasis();
    const p = this.chosenProvince();
    if (e.length && (!p || !e.includes(p))) this.chosenProvince.set(e[0]);
  }

  protected pick(value: string): void {
    const p = asProvince(value);
    if (p) this.chosenProvince.set(p);
  }
}
