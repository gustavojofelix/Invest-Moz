import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { PROVINCES, type ProvinceCode } from '@core/domain/types';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { pickText } from '@core/domain/text';
import { LocaleService } from '@core/i18n/locale.service';
import { MAP_CITIES, MAP_CORRIDORS, MAP_PROVINCES, MAP_VIEWBOX } from './map-data';

/** A point drawn on the map (economic zones on the opportunity map). */
export interface MapMarker {
  id: string;
  x: number;
  y: number;
  /** `zone` (SEZ/IFZ: diamond) or `site` (parks, tourism zones: small dot). */
  kind: 'zone' | 'site';
  /** Drawn next to the marker when set. */
  label?: string;
}

/** Cities whose label sits to the left of the dot. */
const LABEL_LEFT = new Set(['Maputo', 'Xai-Xai', 'Chimoio', 'Tete', 'Lichinga']);

/** Offshore Rovuma basin, north-east of Pemba (approximate, for orientation only). */
const ROVUMA = { cx: 552, cy: 78, rx: 30, ry: 52 };

/**
 * Mozambique: provinces, main cities, ports and the Maputo, Beira and Nacala
 * corridors. Hover, tap or focus a province to see its name.
 *
 * With `selectable`, a click, Enter or Space selects a province (`selected`,
 * two-way) and the selection stays when focus moves on. `emphasis` dims every
 * other province, `activeCorridor` highlights one corridor, `markers` adds
 * zone markers and `rovumaLabel` draws the offshore Rovuma basin.
 */
@Component({
  selector: 'im-moz-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="relative m-0">
      <svg
        [attr.viewBox]="viewBox"
        class="block h-auto w-full"
        role="group"
        [attr.aria-label]="label()"
        (mouseleave)="active.set(null)"
      >
        @if (rovumaLabel()) {
          <g aria-hidden="true">
            <ellipse
              [attr.cx]="rovuma.cx"
              [attr.cy]="rovuma.cy"
              [attr.rx]="rovuma.rx"
              [attr.ry]="rovuma.ry"
              class="basin"
            />
            <text
              [attr.x]="rovuma.cx + rovuma.rx - 2"
              [attr.y]="rovuma.cy + rovuma.ry + 18"
              text-anchor="end"
              class="lbl basin-lbl"
            >
              {{ rovumaLabel() }}
            </text>
          </g>
        }
        <g class="provinces">
          @for (p of provinces; track p.code) {
            <path
              [attr.d]="p.d"
              class="prov"
              [class.on]="isOn(p.code)"
              [class.sel]="selectable() && selected() === p.code"
              [class.dim]="isDim(p.code)"
              [class.city]="p.code === 'maputo_cidade'"
              tabindex="0"
              role="button"
              [attr.aria-label]="names()[p.code]"
              [attr.aria-pressed]="selectable() ? selected() === p.code : active() === p.code"
              (keydown.enter)="choose(p.code)"
              (keydown.space)="$event.preventDefault(); choose(p.code)"
              (mouseenter)="active.set(p.code)"
              (focus)="active.set(p.code)"
              (blur)="active.set(null)"
              (click)="choose(p.code)"
            />
          }
        </g>
        <g class="corridors" aria-hidden="true">
          @for (c of corridors; track c.id) {
            <path
              [attr.d]="c.d"
              class="corridor"
              [class.corridor--on]="activeCorridor() === c.id"
              [class.corridor--off]="!!activeCorridor() && activeCorridor() !== c.id"
            />
          }
        </g>
        <g aria-hidden="true">
          @for (c of cities; track c.name) {
            @if (c.port) {
              <rect [attr.x]="c.x - 4" [attr.y]="c.y - 4" width="8" height="8" class="port" />
            } @else {
              <circle [attr.cx]="c.x" [attr.cy]="c.y" r="3.2" class="town" />
            }
            <text
              [attr.x]="leftLabel.has(c.name) ? c.x - 8 : c.x + 8"
              [attr.y]="c.y + 4"
              [attr.text-anchor]="leftLabel.has(c.name) ? 'end' : 'start'"
              class="lbl"
              [class.port-lbl]="c.port"
            >
              {{ c.name }}
            </text>
          }
        </g>
        @if (markers().length) {
          <g aria-hidden="true">
            @for (m of markers(); track m.id) {
              @if (m.kind === 'zone') {
                <rect
                  [attr.x]="m.x - 6"
                  [attr.y]="m.y - 6"
                  width="12"
                  height="12"
                  [attr.transform]="'rotate(45 ' + m.x + ' ' + m.y + ')'"
                  class="zone"
                />
              } @else {
                <circle [attr.cx]="m.x" [attr.cy]="m.y" r="5" class="site" />
              }
              @if (m.label) {
                <text
                  [attr.x]="m.x - 10"
                  [attr.y]="m.y - 10"
                  text-anchor="end"
                  class="lbl zone-lbl"
                >
                  {{ m.label }}
                </text>
              }
            }
          </g>
        }
      </svg>

      <figcaption class="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span class="min-h-6 font-serif text-lg font-semibold" aria-live="polite">{{
          activeName()
        }}</span>
        <span class="flex flex-wrap gap-x-4 gap-y-1 text-muted">
          <span class="inline-flex items-center gap-1.5"
            ><span class="lg-port" aria-hidden="true"></span>{{ portsLabel() }}</span
          >
          <span class="inline-flex items-center gap-1.5"
            ><span class="lg-town" aria-hidden="true"></span>{{ citiesLabel() }}</span
          >
          <span class="inline-flex items-center gap-1.5"
            ><span class="lg-corr" aria-hidden="true"></span>{{ corridorsLabel() }}</span
          >
          @if (zonesLabel()) {
            <span class="inline-flex items-center gap-1.5"
              ><span class="lg-zone" aria-hidden="true"></span>{{ zonesLabel() }}</span
            >
          }
          @if (rovumaLabel()) {
            <span class="inline-flex items-center gap-1.5"
              ><span class="lg-basin" aria-hidden="true"></span>{{ rovumaLabel() }}</span
            >
          }
        </span>
      </figcaption>
    </figure>
  `,
  styles: `
    .prov {
      fill: var(--panel);
      stroke: var(--brand);
      stroke-width: 1;
      stroke-linejoin: round;
      cursor: pointer;
      transition:
        fill 160ms,
        opacity 160ms;
      outline: none;
    }
    .prov:hover,
    .prov.on {
      fill: color-mix(in srgb, var(--brand) 22%, var(--panel));
    }
    .prov.sel {
      fill: color-mix(in srgb, var(--brand) 40%, var(--panel));
      stroke-width: 2;
    }
    .prov.dim {
      fill: var(--surface);
      opacity: 0.6;
    }
    .prov:focus-visible {
      stroke: var(--ink);
      stroke-width: 2.5;
    }
    .prov.city {
      fill: var(--brand);
    }
    .corridor {
      fill: none;
      stroke: var(--accent);
      stroke-width: 3;
      stroke-dasharray: 7 4;
      stroke-linecap: round;
      pointer-events: none;
    }
    .corridor--on {
      stroke: var(--brand-deep);
      stroke-width: 5;
      stroke-dasharray: none;
    }
    .corridor--off {
      stroke: var(--brand-line);
      opacity: 0.7;
    }
    .basin {
      fill: color-mix(in srgb, var(--brand) 10%, transparent);
      stroke: var(--brand-line);
      stroke-width: 1.5;
      stroke-dasharray: 4 4;
    }
    .port {
      fill: var(--ink);
    }
    .town {
      fill: var(--paper);
      stroke: var(--ink);
      stroke-width: 1.4;
    }
    .zone {
      fill: var(--highlight);
      stroke: var(--ink);
      stroke-width: 1.5;
    }
    .site {
      fill: var(--brand);
      stroke: var(--paper);
      stroke-width: 1.5;
    }
    .lbl {
      font-family: var(--font-sans);
      font-size: 15px;
      fill: var(--ink);
      paint-order: stroke;
      stroke: var(--surface);
      stroke-width: 4px;
      stroke-linejoin: round;
      pointer-events: none;
    }
    .port-lbl,
    .zone-lbl {
      font-weight: 700;
    }
    .basin-lbl {
      font-size: 13px;
      fill: var(--muted);
    }
    .lg-port {
      width: 0.6rem;
      height: 0.6rem;
      background: var(--ink);
    }
    .lg-town {
      width: 0.6rem;
      height: 0.6rem;
      border: 1.5px solid var(--ink);
      border-radius: 9999px;
    }
    .lg-corr {
      width: 1.25rem;
      border-top: 3px dashed var(--accent);
    }
    .lg-zone {
      width: 0.6rem;
      height: 0.6rem;
      background: var(--highlight);
      border: 1px solid var(--ink);
      transform: rotate(45deg);
    }
    .lg-basin {
      width: 1rem;
      height: 0.6rem;
      border: 1.5px dashed var(--brand-line);
      border-radius: 9999px;
    }
    @media (prefers-reduced-motion: reduce) {
      .prov {
        transition: none;
      }
    }
  `,
})
export class MozMap {
  readonly label = input('Moçambique');
  readonly portsLabel = input('Portos');
  readonly citiesLabel = input('Cidades');
  readonly corridorsLabel = input('Corredores');
  readonly hint = input('');
  /** Click/Enter/Space selects a province (two-way `selected`). */
  readonly selectable = input(false);
  readonly selected = model<ProvinceCode | null>(null);
  /** Provinces to emphasise; the others are dimmed. Empty: none dimmed. */
  readonly emphasis = input<readonly ProvinceCode[]>([]);
  readonly activeCorridor = input<string | null>(null);
  readonly markers = input<readonly MapMarker[]>([]);
  readonly zonesLabel = input('');
  readonly rovumaLabel = input('');
  private readonly lang = inject(LocaleService).lang;

  protected readonly viewBox = MAP_VIEWBOX;
  protected readonly provinces = MAP_PROVINCES;
  protected readonly cities = MAP_CITIES;
  protected readonly corridors = MAP_CORRIDORS;
  protected readonly leftLabel = LABEL_LEFT;
  protected readonly rovuma = ROVUMA;
  protected readonly active = signal<ProvinceCode | null>(null);

  protected readonly names = computed(() => {
    const l = this.lang();
    return Object.fromEntries(PROVINCES.map((k) => [k, pickText(PROVINCE_NAMES[k], l)])) as Record<
      ProvinceCode,
      string
    >;
  });
  protected readonly activeName = computed(() => {
    const a = this.active() ?? (this.selectable() ? this.selected() : null);
    return a ? this.names()[a] : this.hint();
  });

  protected isOn(code: ProvinceCode): boolean {
    return this.active() === code;
  }

  protected isDim(code: ProvinceCode): boolean {
    const e = this.emphasis();
    return e.length > 0 && !e.includes(code) && !(this.selectable() && this.selected() === code);
  }

  protected choose(code: ProvinceCode): void {
    this.active.set(code);
    if (this.selectable()) this.selected.set(code);
  }
}
