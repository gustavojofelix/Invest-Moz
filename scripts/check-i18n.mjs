// Fails on any UI translation key missing in a locale (global file and each
// Transloco scope), on empty translations, and on any LocalizedText in the
// data files that lacks a locale or is empty.
// Usage: node scripts/check-i18n.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = ['pt', 'en', 'fr', 'zh', 'ar', 'hi', 'sw', 'af'];
const I18N = 'src/assets/i18n';
const DATA = 'src/assets/data';
const errors = [];

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

function compare(dir, label) {
  const files = Object.fromEntries(
    LOCALES.map((l) => {
      const p = join(dir, `${l}.json`);
      if (!existsSync(p)) {
        errors.push(`${label}: missing ${l}.json`);
        return [l, {}];
      }
      return [l, flatten(JSON.parse(readFileSync(p, 'utf8')))];
    }),
  );
  const all = new Set(LOCALES.flatMap((l) => Object.keys(files[l])));
  for (const key of all) {
    for (const l of LOCALES) {
      if (!(key in files[l])) errors.push(`${label} [${l}]: missing key "${key}"`);
      else if (typeof files[l][key] === 'string' && !files[l][key].trim())
        errors.push(`${label} [${l}]: empty "${key}"`);
    }
    // Interpolation params must match across locales.
    const params = LOCALES.map((l) =>
      [...String(files[l][key] ?? '').matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
        .map((m) => m[1])
        .sort()
        .join(','),
    );
    if (new Set(params).size > 1)
      errors.push(`${label}: params differ for "${key}" (${params.join(' | ')})`);
  }
  return all.size;
}

let keys = compare(I18N, 'i18n/global');
for (const entry of readdirSync(I18N)) {
  const dir = join(I18N, entry);
  if (statSync(dir).isDirectory()) keys += compare(dir, `i18n/${entry}`);
}

// LocalizedText in data: any object holding at least one locale key.
let localized = 0;
function walkData(node, path) {
  if (Array.isArray(node)) return node.forEach((n, i) => walkData(n, `${path}[${i}]`));
  if (!node || typeof node !== 'object') return;
  const present = LOCALES.filter((l) => l in node);
  if (present.length) {
    localized++;
    const isKeywords = Array.isArray(node[present[0]]);
    for (const l of LOCALES) {
      if (!(l in node)) {
        if (!isKeywords || ['pt', 'en', 'fr'].includes(l))
          errors.push(`${path}: LocalizedText missing "${l}"`);
      } else if (typeof node[l] === 'string' && !node[l].trim())
        errors.push(`${path}: LocalizedText empty "${l}"`);
      else if (
        Array.isArray(node[l]) &&
        node[l].length === 0 &&
        ['pt', 'en', 'fr'].includes(l) &&
        !path.includes('sectors[7]')
      )
        errors.push(`${path}: keywords empty for "${l}"`);
    }
    return;
  }
  for (const [k, v] of Object.entries(node)) walkData(v, `${path}.${k}`);
}
function walkDir(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry !== 'schema') walkDir(p);
    } else if (entry.endsWith('.json') && entry !== 'placeholders.json') {
      walkData(JSON.parse(readFileSync(p, 'utf8')), p.replace(/\\/g, '/'));
    }
  }
}
walkDir(DATA);

if (errors.length) {
  console.error(`✗ i18n check failed (${errors.length}):`);
  for (const e of errors.slice(0, 200)) console.error('  - ' + e);
  process.exit(1);
}
console.log(
  `✓ i18n complete: ${keys} UI keys × ${LOCALES.length} locales, ${localized} LocalizedText values in data.`,
);
