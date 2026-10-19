// Builds the Mozambique map (provinces, cities, ports, corridors) from
// Natural Earth 1:10m admin-1 boundaries (public domain, naturalearthdata.com).
//
// Usage:
//   curl -L -o ne_admin1.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
//   node scripts/build-map.mjs ne_admin1.geojson
//
// Outputs:
//   src/app/features/landing/map/map-data.ts  (path data for the interactive map)
//   src/assets/map/mozambique.svg             (static reference rendering)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const source = process.argv[2];
if (!source) {
  console.error('Usage: node scripts/build-map.mjs <ne_10m_admin_1_states_provinces.geojson>');
  process.exit(1);
}

const all = JSON.parse(readFileSync(source, 'utf8'));
const features = all.features.filter((f) => f.properties.adm0_a3 === 'MOZ');

// --- projection: equirectangular, corrected at the country's mid-latitude ----
const LON0 = 30.1;
const LAT_TOP = -10.3;
const K = Math.cos((18.5 * Math.PI) / 180);
const SCALE = 52; // px per degree
const project = ([lon, lat]) => [(lon - LON0) * K * SCALE, (LAT_TOP - lat) * SCALE];

// --- Douglas–Peucker simplification -----------------------------------------
function simplify(points, tolerance) {
  if (points.length < 4) return points;
  const sq = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0;
    let idx = -1;
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy || 1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
      const ex = ax + t * dx - px;
      const ey = ay + t * dy - py;
      const d = ex * ex + ey * ey;
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > sq && idx > 0) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

const ringArea = (pts) => {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    s += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  return s / 2;
};
const ringCentroid = (pts) => {
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const f = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    x += (pts[j][0] + pts[i][0]) * f;
    y += (pts[j][1] + pts[i][1]) * f;
    a += f;
  }
  return [x / (3 * a), y / (3 * a)];
};
const fmt = (n) => Math.round(n * 10) / 10;

function polygonsOf(geometry) {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

// --- provinces ----------------------------------------------------------------
const NAME_TO_CODE = {
  Niassa: 'niassa',
  'Cabo Delgado': 'cabo_delgado',
  Nampula: 'nampula',
  Zambezia: 'zambezia',
  Tete: 'tete',
  Manica: 'manica',
  Sofala: 'sofala',
  Inhambane: 'inhambane',
  Gaza: 'gaza',
};

const maputos = features
  .filter((f) => f.properties.name === 'Maputo')
  .map((f) => ({
    f,
    area: polygonsOf(f.geometry).reduce((s, p) => s + Math.abs(ringArea(p[0])), 0),
  }))
  .sort((a, b) => a.area - b.area);

const provinces = [];
for (const f of features) {
  let code = NAME_TO_CODE[f.properties.name];
  if (f.properties.name === 'Maputo')
    code = f === maputos[0].f ? 'maputo_cidade' : 'maputo_provincia';
  if (!code) throw new Error(`Unknown province ${f.properties.name}`);
  let d = '';
  let largest = { area: 0, ring: [] };
  for (const poly of polygonsOf(f.geometry)) {
    poly.forEach((ring, ri) => {
      const pts = simplify(ring.map(project), code === 'maputo_cidade' ? 0.15 : 0.7);
      if (pts.length < 3) return;
      const area = Math.abs(ringArea(pts));
      if (area < 1.2 && code !== 'maputo_cidade') return; // drop tiny islets
      if (ri === 0 && area > largest.area) largest = { area, ring: pts };
      d += 'M' + pts.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L') + 'Z';
    });
  }
  const [lx, ly] = ringCentroid(largest.ring);
  provinces.push({ code, d, label: [fmt(lx), fmt(ly)] });
}
provinces.sort((a, b) => (a.code === 'maputo_cidade' ? 1 : b.code === 'maputo_cidade' ? -1 : 0));

// --- cities, ports, corridors -----------------------------------------------
const CITIES = [
  ['Maputo', -25.9692, 32.5732, true],
  ['Xai-Xai', -25.0519, 33.6442, false],
  ['Inhambane', -23.865, 35.3833, false],
  ['Beira', -19.8436, 34.8389, true],
  ['Chimoio', -19.1164, 33.4833, false],
  ['Tete', -16.1564, 33.5867, false],
  ['Quelimane', -17.8786, 36.8883, false],
  ['Mocuba', -16.8392, 36.9856, false],
  ['Nampula', -15.1165, 39.2666, false],
  ['Nacala', -14.5428, 40.6728, true],
  ['Pemba', -12.974, 40.5178, true],
  ['Lichinga', -13.3128, 35.2406, false],
].map(([name, lat, lon, port]) => {
  const [x, y] = project([lon, lat]);
  return { name, x: fmt(x), y: fmt(y), port };
});

const CORRIDORS = {
  maputo: [
    [32.5732, -25.9692],
    [32.25, -25.75],
    [31.99, -25.44],
  ],
  beira: [
    [34.8389, -19.8436],
    [34.2, -19.55],
    [33.4833, -19.1164],
    [32.72, -18.97],
  ],
  nacala: [
    [40.6728, -14.5428],
    [39.9, -14.85],
    [39.2666, -15.1165],
    [38.2, -14.95],
    [36.54, -14.8],
    [35.86, -14.83],
  ],
};
const corridors = Object.entries(CORRIDORS).map(([id, pts]) => ({
  id,
  d: 'M' + pts.map((p) => project(p).map(fmt).join(' ')).join('L'),
}));

// bounds
let maxX = 0;
let maxY = 0;
for (const p of provinces)
  for (const m of p.d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)) {
    maxX = Math.max(maxX, +m[1]);
    maxY = Math.max(maxY, +m[2]);
  }
// Extra room on the east for coastal city labels (Pemba, Nacala).
const viewBox = `-6 -6 ${Math.ceil(maxX) + 82} ${Math.ceil(maxY) + 12}`;

// --- write --------------------------------------------------------------------
mkdirSync('src/app/features/landing/map', { recursive: true });
writeFileSync(
  'src/app/features/landing/map/map-data.ts',
  `// Generated by scripts/build-map.mjs from Natural Earth 1:10m admin-1 boundaries
// (public domain, https://www.naturalearthdata.com). Do not edit by hand.
import type { ProvinceCode } from '@core/domain/types';

export interface MapProvince {
  code: ProvinceCode;
  d: string;
  label: [number, number];
}

export const MAP_VIEWBOX = '${viewBox}';
export const MAP_PROVINCES: MapProvince[] = ${JSON.stringify(provinces)};
export const MAP_CITIES = ${JSON.stringify(CITIES)};
export const MAP_CORRIDORS = ${JSON.stringify(corridors)};
`,
);

mkdirSync('src/assets/map', { recursive: true });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
<title>Mozambique — provinces, main cities, ports and corridors (Natural Earth, public domain)</title>
<g fill="#F1F6F4" stroke="#007168" stroke-width="0.8" stroke-linejoin="round">${provinces.map((p) => `<path id="${p.code}" d="${p.d}"/>`).join('')}</g>
<g fill="none" stroke="#D21034" stroke-width="2" stroke-dasharray="5 3">${corridors.map((c) => `<path id="corridor-${c.id}" d="${c.d}"/>`).join('')}</g>
<g font-family="Lato, sans-serif" font-size="9" fill="#111">${CITIES.map((c) => `<circle cx="${c.x}" cy="${c.y}" r="${c.port ? 3.5 : 2.5}" fill="${c.port ? '#111' : '#fff'}" stroke="#111"/><text x="${c.x + 5}" y="${c.y + 3}">${c.name}</text>`).join('')}</g>
</svg>
`;
writeFileSync('src/assets/map/mozambique.svg', svg);
console.log(
  `✓ Map written: ${provinces.length} provinces, ${CITIES.length} cities, viewBox ${viewBox}`,
);
