import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { ProvinceCode } from '@core/domain/types';
import { PROVINCE_NAMES } from '@core/domain/provinces';
import { LocaleService } from '@core/i18n/locale.service';
import { MAP_CITIES, MAP_CORRIDORS, MAP_PROVINCES, MAP_VIEWBOX } from './map-data';

/**
 * Mozambique: provinces, main cities, ports and the Maputo, Beira and Nacala
 * corridors. Hover, tap or focus a province to see its name.
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
        <g class="provinces">
          @for (p of provinces; track p.code) {
            <path
              [attr.d]="p.d"
              class="prov"
              [class.on]="active() === p.code"
              [class.city]="p.code === 'maputo_cidade'"
              tabindex="0"
              role="button"
              [attr.aria-label]="names()[p.code]"
              [attr.aria-pressed]="active() === p.code"
              (keydown.enter)="active.set(p.code)"
              (keydown.space)="$event.preventDefault(); active.set(p.code)"
              (mouseenter)="active.set(p.code)"
              (focus)="active.set(p.code)"
              (blur)="active.set(null)"
              (click)="active.set(p.code)"
            />
          }
        </g>
        <g class="corridors" aria-hidden="true">
          @for (c of corridors; track c.id) {
            <path [attr.d]="c.d" class="corridor" />
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
              [attr.x]="
                c.name === 'Maputo' ||
                c.name === 'Xai-Xai' ||
                c.name === 'Chimoio' ||
                c.name === 'Tete' ||
                c.name === 'Lichinga'
                  ? c.x - 8
                  : c.x + 8
              "
              [attr.y]="c.y + 4"
              [attr.text-anchor]="
                c.name === 'Maputo' ||
                c.name === 'Xai-Xai' ||
                c.name === 'Chimoio' ||
                c.name === 'Tete' ||
                c.name === 'Lichinga'
                  ? 'end'
                  : 'start'
              "
              class="lbl"
              [class.port-lbl]="c.port"
            >
              {{ c.name }}
            </text>
          }
        </g>
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
      transition: fill 160ms;
      outline: none;
    }
    .prov:hover,
    .prov.on {
      fill: color-mix(in srgb, var(--brand) 22%, var(--panel));
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
    }
    .port {
      fill: var(--ink);
    }
    .town {
      fill: var(--paper);
      stroke: var(--ink);
      stroke-width: 1.4;
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
    .port-lbl {
      font-weight: 700;
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
  `,
})
export class MozMap {
  readonly label = input('Moçambique');
  readonly portsLabel = input('Portos');
  readonly citiesLabel = input('Cidades');
  readonly corridorsLabel = input('Corredores');
  readonly hint = input('');
  private readonly lang = inject(LocaleService).lang;

  protected readonly viewBox = MAP_VIEWBOX;
  protected readonly provinces = MAP_PROVINCES;
  protected readonly cities = MAP_CITIES;
  protected readonly corridors = MAP_CORRIDORS;
  protected readonly active = signal<ProvinceCode | null>(null);

  protected readonly names = computed(() => {
    const l = this.lang();
    return Object.fromEntries(Object.entries(PROVINCE_NAMES).map(([k, v]) => [k, v[l]])) as Record<
      ProvinceCode,
      string
    >;
  });
  protected readonly activeName = computed(() => {
    const a = this.active();
    return a ? this.names()[a] : this.hint();
  });
}
