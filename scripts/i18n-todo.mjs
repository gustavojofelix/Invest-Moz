// Translation helper for the five machine-translated locales (zh, ar, hi, sw, af).
//
//   node scripts/i18n-todo.mjs export <file.json> <lang> [out.json]
//     Lists what is missing in <lang> as { "<path>": { "en": "…", "pt": "…" } }.
//     - Data files (src/assets/data/**): every LocalizedText without <lang>.
//     - UI files (src/assets/i18n/**/en.json or the folder): every key of en.json
//       missing from <lang>.json.
//
//   node scripts/i18n-todo.mjs apply <file.json> <lang> <translations.json>
//     Writes { "<path>": "translated text" } back into the file (data files) or
//     into <lang>.json (UI files), keeping key order and 2-space JSON.
//
// Paths are JSON-pointer style ("chapters/0/sections/2/title"). Keep every
// {{variable}}, {{UPPER_PLACEHOLDER}}, [ref:id], **bold** marker and "- " bullet
// exactly as in the English text.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ORDER = ['pt', 'en', 'fr', 'zh', 'ar', 'hi', 'sw', 'af'];
const [mode, target, lang, third] = process.argv.slice(2);
if (!['export', 'apply'].includes(mode) || !target || !ORDER.includes(lang)) {
  console.error('Usage: i18n-todo.mjs export|apply <file.json|i18n-folder> <lang> [file]');
  process.exit(2);
}

const norm = target.replace(/\\/g, '/');
const isUi = norm.includes('assets/i18n');
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const write = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n');

function uiFiles() {
  const dir = norm.endsWith('.json') ? dirname(norm) : norm;
  return { en: join(dir, 'en.json'), pt: join(dir, 'pt.json'), out: join(dir, `${lang}.json`) };
}

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}/${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

function isLocalized(node) {
  return (
    node &&
    typeof node === 'object' &&
    !Array.isArray(node) &&
    typeof node.en === 'string' &&
    'pt' in node
  );
}

function walk(node, path, visit) {
  if (Array.isArray(node)) return node.forEach((n, i) => walk(n, [...path, i], visit));
  if (!node || typeof node !== 'object') return;
  if (isLocalized(node)) return visit(node, path);
  for (const [k, v] of Object.entries(node)) walk(v, [...path, k], visit);
}

function withLang(node, value) {
  const out = {};
  for (const l of ORDER) {
    if (l === lang) out[l] = value;
    else if (l in node) out[l] = node[l];
  }
  for (const [k, v] of Object.entries(node)) if (!(k in out)) out[k] = v;
  return out;
}

if (mode === 'export') {
  const todo = {};
  if (isUi) {
    const f = uiFiles();
    const en = flatten(read(f.en));
    const pt = existsSync(f.pt) ? flatten(read(f.pt)) : {};
    const have = existsSync(f.out) ? flatten(read(f.out)) : {};
    for (const [k, v] of Object.entries(en)) {
      if (typeof have[k] !== 'string' || !have[k].trim()) todo[k] = { en: v, pt: pt[k] };
    }
  } else {
    walk(read(norm), [], (node, path) => {
      if (typeof node[lang] !== 'string' || !node[lang].trim())
        todo[path.join('/')] = { en: node.en, pt: node.pt };
    });
  }
  const json = JSON.stringify(todo, null, 2) + '\n';
  if (third) writeFileSync(third, json);
  else process.stdout.write(json);
  console.error(`${Object.keys(todo).length} item(s) missing in ${lang}`);
} else {
  // Several translators may write to the same file: serialise read-modify-write with a lock dir.
  const lock = `${norm.endsWith('.json') ? norm : join(norm, 'x')}.lock`;
  const started = Date.now();
  for (;;) {
    try {
      mkdirSync(lock);
      break;
    } catch {
      if (Date.now() - started > 60_000) rmSync(lock, { recursive: true, force: true });
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  process.on('exit', () => rmSync(lock, { recursive: true, force: true }));
  const tr = read(third);
  let applied = 0;
  if (isUi) {
    const f = uiFiles();
    const en = read(f.en);
    const have = existsSync(f.out) ? flatten(read(f.out)) : {};
    // Rebuild <lang>.json with the structure and key order of en.json.
    const build = (node, prefix) => {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        const key = prefix ? `${prefix}/${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = build(v, key);
        else if (typeof tr[key] === 'string') {
          out[k] = tr[key];
          applied++;
        } else if (key in have) out[k] = have[key];
      }
      return out;
    };
    write(f.out, build(en, ''));
  } else {
    const data = read(norm);
    const setAt = (root, path, value) => {
      let parent = root;
      for (const seg of path.slice(0, -1)) parent = parent[seg];
      const last = path[path.length - 1];
      parent[last] = withLang(parent[last], value);
    };
    for (const [p, value] of Object.entries(tr)) {
      if (typeof value !== 'string' || !value.trim()) continue;
      const path = p.split('/').map((s) => (/^\d+$/.test(s) ? Number(s) : s));
      setAt(data, path, value);
      applied++;
    }
    write(norm, data);
  }
  console.error(`applied ${applied} translation(s) to ${lang}`);
}
