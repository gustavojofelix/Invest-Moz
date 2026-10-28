// Validates every data file against its JSON Schema, then runs cross-file
// integrity checks (references, placeholders, rule facts, answer coverage).
// Usage: node scripts/validate-data.mjs
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DATA = 'src/assets/data';
const SCHEMA = join(DATA, 'schema');
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));

const FILES = {
  'projects.json': 'projects',
  'enquiries.json': 'enquiries',
  'holidays.json': 'holidays',
  'countries.json': 'countries',
  'knowledge-base.json': 'knowledge-base',
  'qa/topics.json': 'qa-topics',
  'qa/answers.json': 'qa-answers',
  'rules/sectors.json': 'rules-sectors',
  'rules/vehicles.json': 'rules-vehicles',
  'rules/apiex.json': 'rules-apiex',
  'rules/treaties.json': 'rules-treaties',
  'rules/quotas.json': 'rules-quotas',
  'rules/roadmap.json': 'rules-roadmap',
  'rules/licences.json': 'rules-licences',
  'rules/triggers.json': 'rules-triggers',
  'rules/incentives.json': 'rules-incentives',
  'rules/obligations.json': 'rules-obligations',
  'rules/zones.json': 'rules-zones',
  'guide/index.json': 'guide-index',
};
for (const f of readdirSync(join(DATA, 'guide', 'chapters')))
  if (f.endsWith('.json')) FILES[`guide/chapters/${f}`] = 'guide-chapter';

// Facts the engine provides to rule conditions (see core/domain/rules-engine.ts).
const KNOWN_FACTS = new Set([
  'idea',
  'province',
  'capital',
  'investorCountry',
  'investmentUsd',
  'workers',
  'foreignWorkers',
  'importsGoods',
  'exports',
  'needsLand',
  'shareholderLoan',
  'feesAbroad',
  'temporaryImport',
  'sector',
  'envCategory',
  'envRelevant',
  'foreignOwned',
  'treaty',
  'investmentMzn',
  'fdiMinimumMet',
  'foreignRatio',
  'hasForeignWorkers',
  'quotaStatus',
  'relatedParties',
  'corridor',
  'vehicle',
]);
const KNOWN_VARS = new Set([
  'fact.country',
  'fact.countryCode',
  'fact.treatyRate',
  'fact.ratio',
  'fact.workers',
  'fact.foreignWorkers',
  'fact.investmentMzn',
  'fact.investmentUsd',
  'fact.province',
  'fact.sector',
  'fact.envCategory',
  'fact.minQuota',
  'fact.maxQuota',
  'fact.quota',
  'ctx.projectTitle',
  'ctx.investorCountry',
  'ctx.treatyRate',
  'ctx.province',
  'ctx.vehicle',
  'ctx.workers',
  'ctx.foreignWorkers',
  'ctx.investment',
]);

const errors = [];
const fail = (msg) => errors.push(msg);

// 1. Schemas -----------------------------------------------------------------
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
for (const f of readdirSync(SCHEMA)) ajv.addSchema(read(join(SCHEMA, f)));

const data = {};
for (const [file, schema] of Object.entries(FILES)) {
  data[file] = read(join(DATA, file));
  const validate = ajv.getSchema(`${schema}.schema.json`);
  if (!validate) {
    fail(`${file}: schema ${schema}.schema.json not found`);
    continue;
  }
  if (!validate(data[file])) {
    for (const e of validate.errors ?? []) fail(`${file}${e.instancePath}: ${e.message}`);
  }
}

// 2. Walk all strings ----------------------------------------------------------
function walk(node, path, visit) {
  if (typeof node === 'string') visit(node, path);
  else if (Array.isArray(node)) node.forEach((n, i) => walk(n, `${path}[${i}]`, visit));
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`, visit);
}

const kbIds = new Set(data['knowledge-base.json'].references.map((r) => r.id));
const documented = new Set(
  read(join(DATA, 'placeholders.json')).groups.flatMap((g) => Object.keys(g.items)),
);
const usedPlaceholders = new Set();

for (const [file, json] of Object.entries(data)) {
  walk(json, file, (s, path) => {
    for (const m of s.matchAll(/\[ref:([a-z0-9-]+)\]/g))
      if (!kbIds.has(m[1])) fail(`${path}: unknown inline ref "${m[1]}"`);
    for (const m of s.matchAll(/\{\{([A-Z][A-Z0-9_]*)\}\}/g)) {
      usedPlaceholders.add(m[1]);
      if (!documented.has(m[1]))
        fail(`${path}: placeholder {{${m[1]}}} is not listed in placeholders.json`);
    }
    for (const m of s.matchAll(/\{\{([a-z][\w.]*)\}\}/g))
      if (!KNOWN_VARS.has(m[1])) fail(`${path}: unknown variable {{${m[1]}}}`);
    const open = (s.match(/\{\{[#^]ctx\}\}/g) ?? []).length;
    const close = (s.match(/\{\{\/ctx\}\}/g) ?? []).length;
    if (open !== close) fail(`${path}: unbalanced {{#ctx}} sections`);
  });
  // refs arrays + rule conditions
  walk(json, file, () => {});
  (function scan(node, path) {
    if (Array.isArray(node)) return node.forEach((n, i) => scan(n, `${path}[${i}]`));
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node.refs))
      for (const r of node.refs) if (!kbIds.has(r)) fail(`${path}.refs: unknown ref "${r}"`);
    if (Array.isArray(node.when))
      for (const c of node.when)
        if (!KNOWN_FACTS.has(c.field)) fail(`${path}.when: unknown fact "${c.field}"`);
    for (const [k, v] of Object.entries(node)) scan(v, `${path}.${k}`);
  })(json, file);
}
for (const p of documented)
  if (!usedPlaceholders.has(p)) fail(`placeholders.json: {{${p}}} is documented but never used`);

// 3. Specific integrity checks -------------------------------------------------
const topics = data['qa/topics.json'].topics;
for (const t of topics)
  if (!kbIds.has(t.refId)) fail(`qa/topics.json: ${t.id} refId "${t.refId}" not in knowledge base`);
const answers = data['qa/answers.json'].answers;
const answerIds = new Set();
for (const a of answers) {
  if (answerIds.has(a.id)) fail(`qa/answers.json: duplicate id ${a.id}`);
  answerIds.add(a.id);
  for (const l of ['pt', 'en', 'fr', 'zh', 'ar', 'hi', 'sw', 'af']) {
    for (const m of (a.body[l] ?? '').matchAll(/\[ref:([a-z0-9-]+)\]/g))
      if (!a.refs.includes(m[1]))
        fail(`qa/answers.json: ${a.id} [${l}] cites ${m[1]} but refs[] does not list it`);
  }
}
for (const t of topics) {
  const n = answers.filter((a) => a.topic === t.id).length;
  if (n < 3 || n > 4) fail(`qa/answers.json: topic ${t.id} has ${n} answers (expected 3–4)`);
}
if (
  !answers.some(
    (a) => a.question.pt === 'Uma empresa com sócio sul-africano pode repatriar dividendos?',
  )
)
  fail('qa/answers.json: the deck example question about South African dividends is missing');

const countries = data['countries.json'].countries;
const codes = new Set(countries.map((c) => c.code));
for (const code of ['ZA', 'PT', 'IN', 'MU', 'AE', 'IT', 'MO', 'BW', 'VN']) {
  const c = countries.find((x) => x.code === code);
  if (!c?.treaty || c.status !== 'illustrative')
    fail(`countries.json: ${code} must be a treaty country marked illustrative`);
}
for (const p of data['projects.json'].projects)
  if (!codes.has(p.input.investorCountry)) fail(`projects.json: ${p.ref} unknown country`);
for (const e of data['rules/treaties.json'].entries)
  if (!codes.has(e.country)) fail(`rules/treaties.json: unknown country ${e.country}`);
const refsSeen = new Set();
for (const e of data['enquiries.json'].enquiries) {
  if (refsSeen.has(e.ref)) fail(`enquiries.json: duplicate ref ${e.ref}`);
  refsSeen.add(e.ref);
}
for (const p of data['projects.json'].projects)
  if (p.input.foreignWorkers > p.input.workers)
    fail(`projects.json: ${p.ref} has more foreign workers than workers`);
const lastVehicleRule = data['rules/vehicles.json'].rules.at(-1);
if (lastVehicleRule?.when.length)
  fail('rules/vehicles.json: the last rule must be a catch-all (empty "when")');
for (const kb of data['knowledge-base.json'].references)
  if (kb.status !== 'illustrative')
    fail(`knowledge-base.json: ${kb.id} must stay "illustrative" in the POC`);

const guide = data['guide/index.json'];
const sourceIds = new Set(guide.sources.map((x) => x.id));
for (const x of guide.sources)
  if (x.refId && !kbIds.has(x.refId))
    fail(`guide/index.json: source ${x.id} refId "${x.refId}" not in knowledge base`);
const chapterIds = guide.chapters.map((c) => c.id);
if (new Set(chapterIds).size !== chapterIds.length) fail('guide/index.json: duplicate chapter id');
for (const c of guide.chapters) {
  for (const x of c.sources)
    if (!sourceIds.has(x)) fail(`guide/index.json: ${c.id} cites unknown source "${x}"`);
  const body = data[`guide/chapters/${c.id}.json`];
  if (!body) fail(`guide/chapters/${c.id}.json is missing`);
  else if (body.id !== c.id) fail(`guide/chapters/${c.id}.json: id is "${body.id}"`);
}
for (const [file, json] of Object.entries(data)) {
  if (!file.startsWith('guide/chapters/')) continue;
  if (!chapterIds.includes(json.id)) fail(`${file}: chapter not listed in guide/index.json`);
  const ids = new Set();
  for (const sec of json.sections) {
    if (ids.has(sec.id)) fail(`${file}: duplicate section id ${sec.id}`);
    ids.add(sec.id);
    if (!sec.body && !sec.facts && !sec.steps && !sec.table) fail(`${file}: ${sec.id} is empty`);
    for (const [i, row] of (sec.table?.rows ?? []).entries())
      if (row.length !== sec.table.columns.length)
        fail(
          `${file}: ${sec.id} table row ${i} has ${row.length} cells, expected ${sec.table.columns.length}`,
        );
  }
}

// -----------------------------------------------------------------------------
if (errors.length) {
  console.error(`✗ Data validation failed (${errors.length}):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(
  `✓ Data valid: ${Object.keys(FILES).length} files, ${kbIds.size} references, ${answers.length} answers, ` +
    `${usedPlaceholders.size} documented placeholders.`,
);
