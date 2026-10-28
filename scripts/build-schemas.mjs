// Generates src/assets/data/schema/*.schema.json (JSON Schema draft-07).
// The schemas mirror src/app/core/domain/types.ts and rule-set.ts; the future
// Python engine validates the same files with them.
// Usage: node scripts/build-schemas.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/assets/data/schema';
mkdirSync(DIR, { recursive: true });

const write = (name, schema) =>
  writeFileSync(
    join(DIR, `${name}.schema.json`),
    JSON.stringify(
      { $schema: 'http://json-schema.org/draft-07/schema#', $id: `${name}.schema.json`, ...schema },
      null,
      2,
    ) + '\n',
  );

const ref = (def) => ({ $ref: `common.schema.json#/definitions/${def}` });
const obj = (properties, required = Object.keys(properties), extra = {}) => ({
  type: 'object',
  additionalProperties: false,
  required,
  properties,
  ...extra,
});
const arr = (items, extra = {}) => ({ type: 'array', items, ...extra });
const str = { type: 'string', minLength: 1 };
const refs = arr({ type: 'string', pattern: '^[a-z0-9-]+$' });
const rule = (then) => obj({ id: str, when: arr(ref('condition')), then });
const LT = ref('localizedText');
const day = {
  oneOf: [{ type: 'integer', minimum: 1, maximum: 31 }, { const: 'last-working-day' }],
};

write('common', {
  definitions: {
    // The eight Tiva locales. PT/EN/FR are reviewed; ZH/AR/HI/SW/AF are machine translations.
    localizedText: obj({ pt: str, en: str, fr: str, zh: str, ar: str, hi: str, sw: str, af: str }),
    // Matching keywords: PT/EN/FR required, the other locales optional.
    localizedKeywords: obj(
      {
        pt: arr({ type: 'string' }),
        en: arr({ type: 'string' }),
        fr: arr({ type: 'string' }),
        zh: arr({ type: 'string' }),
        ar: arr({ type: 'string' }),
        hi: arr({ type: 'string' }),
        sw: arr({ type: 'string' }),
        af: arr({ type: 'string' }),
      },
      ['pt', 'en', 'fr'],
    ),
    condition: obj({ field: str, op: { enum: ['eq', 'in', 'gte', 'lt', 'between'] }, value: {} }),
    topic: {
      enum: [
        'companies',
        'licensing',
        'investment',
        'tax',
        'labour',
        'immigration',
        'exchange',
        'customs',
        'incentives',
        'compliance',
        'land',
        'local_content',
      ],
    },
    province: {
      enum: [
        'niassa',
        'cabo_delgado',
        'nampula',
        'zambezia',
        'tete',
        'manica',
        'sofala',
        'inhambane',
        'gaza',
        'maputo_provincia',
        'maputo_cidade',
      ],
    },
    vehicle: { enum: ['lda', 'sa', 'sas', 'branch'] },
    isoDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    note: obj({ id: str, title: LT, text: LT, refs }),
    projectInput: obj({
      idea: str,
      province: ref('province'),
      capital: { enum: ['foreign', 'mixed', 'mozambican'] },
      investorCountry: { type: 'string', pattern: '^[A-Z]{2}$' },
      investmentUsd: { type: 'number', minimum: 0 },
      workers: { type: 'integer', minimum: 0 },
      foreignWorkers: { type: 'integer', minimum: 0 },
      importsGoods: { type: 'boolean' },
      exports: { type: 'boolean' },
      needsLand: { type: 'boolean' },
      shareholderLoan: { type: 'boolean' },
      feesAbroad: { type: 'boolean' },
      temporaryImport: { type: 'boolean' },
    }),
  },
});

write(
  'projects',
  obj({
    projects: arr(
      obj({
        ref: { type: 'string', pattern: '^TA-IM-EX\\d{2}$' },
        example: { const: true },
        title: LT,
        sector: LT,
        summary: LT,
        input: ref('projectInput'),
      }),
      { minItems: 5 },
    ),
  }),
);

write(
  'enquiries',
  obj({
    enquiries: arr(
      obj(
        {
          ref: { type: 'string', pattern: '^TA-IM-\\d{4}-\\d{4}$' },
          createdAt: str,
          locale: { enum: ['pt', 'en', 'fr', 'zh', 'ar', 'hi', 'sw', 'af'] },
          name: str,
          company: str,
          email: { type: 'string', format: 'email' },
          phone: str,
          areas: arr(ref('topic'), { minItems: 1 }),
          message: str,
          projectSnapshot: obj({
            projectRef: str,
            vehicle: ref('vehicle'),
            summary: LT,
            input: ref('projectInput'),
          }),
          status: { enum: ['new', 'in_review', 'quoted', 'won'] },
          notes: arr(obj({ at: str, text: str })),
          expertId: str,
          consent: obj({ shareSummary: { type: 'boolean' }, at: str }),
          callSlot: str,
          channel: { enum: ['web', 'app', 'whatsapp'] },
        },
        [
          'ref',
          'createdAt',
          'locale',
          'name',
          'company',
          'email',
          'areas',
          'message',
          'status',
          'notes',
        ],
      ),
      { minItems: 8 },
    ),
  }),
);

write(
  'holidays',
  obj({
    status: { enum: ['illustrative', 'verified'] },
    note: str,
    holidays: arr(obj({ date: ref('isoDate'), name: LT })),
  }),
);

write(
  'countries',
  obj({
    countries: arr(
      obj(
        {
          code: { type: 'string', pattern: '^[A-Z]{2}$' },
          name: LT,
          treaty: { type: 'boolean' },
          status: { enum: ['illustrative', 'verified'] },
        },
        ['code', 'name', 'treaty'],
        {
          if: { properties: { treaty: { const: true } } },
          then: { required: ['status'] },
        },
      ),
    ),
  }),
);

write(
  'knowledge-base',
  obj({
    references: arr(
      obj(
        {
          id: { type: 'string', pattern: '^[a-z0-9-]+$' },
          topic: ref('topic'),
          instrument: str,
          title: LT,
          summary: LT,
          excerpt: LT,
          lastReviewed: ref('isoDate'),
          status: { enum: ['illustrative', 'verified'] },
        },
        ['id', 'topic', 'instrument', 'title', 'summary', 'lastReviewed', 'status'],
      ),
    ),
  }),
);

write(
  'qa-topics',
  obj({
    topics: arr(obj({ id: ref('topic'), label: LT, refLabel: str, refId: str, intro: LT }), {
      minItems: 12,
      maxItems: 12,
    }),
  }),
);

write(
  'qa-answers',
  obj({
    answers: arr(
      obj({
        id: { type: 'string', pattern: '^[a-z_]+-\\d+$' },
        topic: ref('topic'),
        question: LT,
        keywords: ref('localizedKeywords'),
        body: LT,
        refs,
        whenToTalk: LT,
      }),
    ),
  }),
);

write(
  'rules-sectors',
  obj({
    fallback: str,
    sectors: arr(
      obj({
        id: str,
        label: LT,
        envCategory: { enum: ['A', 'B', 'C'] },
        keywords: ref('localizedKeywords'),
      }),
    ),
  }),
);

write(
  'rules-vehicles',
  obj({
    options: arr(obj({ vehicle: ref('vehicle'), name: LT, whenToChoose: LT })),
    rules: arr(
      rule(obj({ recommended: ref('vehicle'), alternatives: arr(ref('vehicle')), reasoning: LT })),
    ),
    comparisonWhen: arr(ref('condition')),
    comparison: arr(obj({ id: str, label: LT, company: LT, branch: LT, refs })),
  }),
);

write(
  'rules-apiex',
  obj({
    fxUsdMzn: { type: 'number', exclusiveMinimum: 0 },
    fdiMinimumMzn: { type: 'number', exclusiveMinimum: 0 },
    regime: arr(rule(obj({ threshold: LT, authority: LT, path: LT, refs }))),
    fdiGuarantee: arr(rule(obj({ text: LT }))),
  }),
);

write(
  'rules-treaties',
  obj({
    noTreatyRate: LT,
    unknownTreatyRate: LT,
    entries: arr(obj({ country: { type: 'string', pattern: '^[A-Z]{2}$' }, dividends: LT, refs })),
  }),
);

write(
  'rules-quotas',
  obj({
    minPercent: { type: 'number' },
    maxPercent: { type: 'number' },
    bands: arr(obj({ minWorkers: { type: 'integer', minimum: 0 }, percent: { type: 'number' } }), {
      minItems: 1,
    }),
  }),
);

write(
  'rules-roadmap',
  obj({
    steps: arr(
      rule(
        obj({
          id: str,
          phase: { enum: ['explore', 'establish', 'operate'] },
          title: LT,
          authority: LT,
          duration: LT,
          note: LT,
          critical: { type: 'boolean' },
          refs,
        }),
      ),
    ),
    timeToOperate: arr(rule(obj({ text: LT }))),
  }),
);

write(
  'rules-licences',
  obj({
    licences: arr(
      rule(
        obj(
          {
            id: str,
            kind: { enum: ['bau', 'sector', 'environmental', 'duat', 'other'] },
            title: LT,
            detail: LT,
            authority: LT,
            category: str,
            refs,
          },
          ['id', 'kind', 'title', 'detail', 'authority', 'refs'],
        ),
      ),
    ),
  }),
);

write(
  'rules-triggers',
  obj({
    triggers: arr(
      rule(
        obj({
          trigger: {
            enum: [
              'treaty',
              'loan',
              'fees_abroad',
              'temporary_import',
              'quota',
              'land',
              'exports',
              'local_content',
            ],
          },
          fact: LT,
          text: LT,
          severity: { enum: ['info', 'attention'] },
          refs,
        }),
      ),
    ),
    watchPoints: arr(rule(obj({ text: LT, refs }, ['text']))),
  }),
);

write(
  'rules-incentives',
  obj({ incentives: arr(rule(obj({ id: str, title: LT, detail: LT, conditions: LT, refs }))) }),
);

write(
  'rules-obligations',
  obj({
    obligations: arr(
      rule(
        obj(
          {
            id: str,
            title: LT,
            frequency: LT,
            schedule: {
              oneOf: [
                obj({ kind: { const: 'monthly' }, day }),
                obj({
                  kind: { const: 'annual' },
                  months: arr({ type: 'integer', minimum: 1, maximum: 12 }, { minItems: 1 }),
                  day,
                }),
                obj({ kind: { const: 'text' } }),
              ],
            },
            note: LT,
            refs,
          },
          ['id', 'title', 'frequency', 'schedule', 'refs'],
        ),
      ),
    ),
  }),
);

write(
  'rules-zones',
  obj({
    corridors: {
      type: 'object',
      propertyNames: ref('province'),
      additionalProperties: { enum: ['nacala', 'beira', 'maputo', 'none'] },
    },
    location: arr(rule(ref('note'))),
    financing: arr(rule(ref('note'))),
    esg: arr(rule(ref('note'))),
  }),
);

const GUIDE_CHAPTERS = [
  'at-a-glance',
  'why-mozambique',
  'sectors',
  'investment-law',
  'company-setup',
  'roadmap',
  'zones',
  'tax',
  'people',
  'exchange',
  'land-esg',
  'protection',
];
const kebab = { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$' };

write(
  'guide-index',
  obj({
    lastReviewed: ref('isoDate'),
    sources: arr(
      obj(
        {
          id: kebab,
          title: str,
          publisher: LT,
          date: { type: 'string', pattern: '^\\d{4}(-\\d{2})?$' },
          refId: { type: 'string', pattern: '^[a-z0-9-]+$' },
        },
        ['id', 'title', 'publisher', 'date'],
      ),
      { minItems: 1 },
    ),
    chapters: arr(
      obj(
        {
          id: { enum: GUIDE_CHAPTERS },
          title: LT,
          summary: LT,
          sources: arr(kebab),
          topic: ref('topic'),
        },
        ['id', 'title', 'summary', 'sources'],
      ),
      { minItems: GUIDE_CHAPTERS.length, maxItems: GUIDE_CHAPTERS.length },
    ),
  }),
);

write(
  'guide-chapter',
  obj({
    id: { enum: GUIDE_CHAPTERS },
    sections: arr(
      obj(
        {
          id: kebab,
          title: LT,
          body: LT,
          facts: arr(obj({ value: LT, label: LT }), { minItems: 1 }),
          steps: arr(obj({ title: LT, text: LT, where: LT, time: LT }, ['title', 'text']), {
            minItems: 1,
          }),
          table: obj(
            { caption: LT, columns: arr(LT, { minItems: 2 }), rows: arr(arr(LT)), note: LT },
            ['caption', 'columns', 'rows'],
          ),
        },
        ['id', 'title'],
      ),
      { minItems: 1 },
    ),
  }),
);

console.log(`✓ Schemas written to ${DIR}`);
