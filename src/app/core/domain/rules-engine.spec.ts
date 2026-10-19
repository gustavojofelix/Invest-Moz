import { RULE_SET } from './rule-set.data';
import {
  assess,
  classifySector,
  deriveFacts,
  describeProject,
  quotaStatus,
  treatyRate,
} from './rules-engine';
import { COUNTRIES, CTX, custom, example } from './testing/fixtures';
import type { Assessment } from './types';

const run = (ref: string): Assessment => assess(example(ref), RULE_SET, CTX);
const ids = <T extends { id: string }>(xs: T[]) => xs.map((x) => x.id);

describe('rules engine — example projects', () => {
  describe('EX01 cashew processing, Nampula (flagship)', () => {
    const a = run('TA-IM-EX01');

    it('classifies the sector and recommends an Lda for mixed capital', () => {
      expect(a.sector).toBe('agro_industry');
      expect(a.vehicle.recommended).toBe('lda');
      expect(a.vehicle.alternatives.map((x) => x.vehicle)).toEqual(['sa', 'sas']);
      expect(a.vehicle.reasoning.pt).toContain('Índia');
      expect(a.companyVsBranch).toHaveLength(8);
    });

    it('reproduces the deck roadmap: 6 steps, environmental licence on the critical path', () => {
      expect(a.roadmap.map((s) => s.id)).toEqual([
        'apiex-meeting',
        'env-land-pre',
        'incorporation',
        'project-registration',
        'fdi-registration',
        'env-licence',
      ]);
      expect(a.roadmap.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(a.roadmap.map((s) => s.duration.pt)).toEqual([
        '1–4 semanas',
        '2–8 semanas',
        '3–10 dias',
        'mín. 3 dias úteis',
        'até 90 dias',
        '2–4 meses',
      ]);
      expect(a.roadmap.filter((s) => s.critical).map((s) => s.id)).toEqual(['env-licence']);
      expect(a.roadmap[5].note.pt).toContain('DUAT');
      expect(a.roadmap[5].title.pt).toContain('categoria B');
      expect(a.timeToOperate.pt).toContain('4–6 meses');
      expect(a.timeToOperate.pt).toContain('24 meses');
    });

    it('fires the fact triggers for treaty, loan, fees, quota, exports and land', () => {
      const t = ids(a.factTriggers);
      expect(t).toEqual([
        'treaty',
        'shareholder-loan',
        'fees-abroad',
        'quota-within',
        'exports',
        'land',
      ]);
      const treaty = a.factTriggers.find((x) => x.id === 'treaty');
      expect(treaty?.fact.pt).toBe('País do investidor: Índia');
      // India has a treaty but no confirmed rate in the brief → to-confirm placeholder
      expect(treaty?.text.pt).toContain('{{TREATY_DIVIDEND_RATES}}');
      const quota = a.factTriggers.find((x) => x.id === 'quota-within');
      expect(quota?.fact.pt).toContain('(5%)');
      expect(quota?.fact.en).toContain('4 foreign out of 80 workers');
    });

    it('lists licences, incentives, obligations and location notes', () => {
      expect(ids(a.licences)).toEqual(['bau', 'sector', 'environmental', 'duat']);
      expect(a.licences.find((l) => l.kind === 'environmental')?.category).toBe('B');
      expect(ids(a.incentives)).toEqual(['class-k', 'itc', 'accelerated-depreciation', 'training']);
      expect(ids(a.obligations)).toContain('modelo-20');
      expect(ids(a.obligations)).toContain('permit-renewals');
      // Soonest deadline first (withholding on 20 Oct 2026); undated obligations last.
      expect(a.obligations[0].id).toBe('withholding-stamp');
      expect(a.obligations.at(-1)?.next).toEqual([]);
      expect(ids(a.location)).toEqual(['corridor-nacala', 'sez-ifz']);
      expect(ids(a.financing)).toEqual(['shareholder-loan', 'gapi', 'funpi', 'dfi']);
      expect(ids(a.esg)).toEqual(['eia-category', 'community', 'ifc']);
      expect(a.esg[0].text.pt).toContain('Categoria provável B');
    });

    it('meets the FDI minimum for the export-of-profits guarantee', () => {
      expect(a.investmentRegime.fdiGuarantee.pt).toContain('supera o IDE mínimo');
      expect(a.investmentRegime.threshold).toBe('{{APIEX_APPROVAL_THRESHOLDS}}');
      expect(a.investmentRegime.path.en).toContain('up to 90 days');
    });

    it('collects every cited reference once', () => {
      expect(new Set(a.refs).size).toBe(a.refs.length);
      expect(a.refs).toEqual(
        expect.arrayContaining([
          'lei-8-2023',
          'lei-11-2009',
          'lei-19-97',
          'aia-regulation',
          'lei-4-2009',
        ]),
      );
    });

    it('produces watch points for land, loan and transfer pricing', () => {
      expect(a.watchPoints.length).toBeGreaterThanOrEqual(3);
      expect(a.watchPoints[0].pt).toContain('24 meses');
    });
  });

  describe('EX02 solar EPC, Maputo Cidade (branch vs company)', () => {
    const a = run('TA-IM-EX02');

    it('recommends a branch and shows the company/branch comparison', () => {
      expect(a.sector).toBe('energy');
      expect(a.vehicle.recommended).toBe('branch');
      expect(a.vehicle.reasoning.pt).toContain('África do Sul');
      expect(a.companyVsBranch?.find((r) => r.id === 'profits-abroad')?.branch.pt).toContain(
        'sem retenção',
      );
    });

    it('applies the South African treaty rate', () => {
      expect(a.factTriggers.find((t) => t.id === 'treaty')?.text.pt).toContain('8% ou 15%');
    });

    it('flags the quota as exceeded (6 of 35 = 17.1%)', () => {
      const q = a.factTriggers.find((t) => t.trigger === 'quota');
      expect(q?.id).toBe('quota-over');
      expect(q?.severity).toBe('attention');
      expect(q?.fact.en).toContain('17.1%');
    });

    it('puts FDI registration on the critical path when there is no environmental gate', () => {
      expect(a.roadmap.find((s) => s.id === 'fdi-registration')?.critical).toBe(true);
      expect(ids(a.roadmap)).not.toContain('env-land-pre');
      expect(ids(a.roadmap)).toContain('sector-licence');
      expect(ids(a.roadmap)).toContain('work-permits');
      expect(a.roadmap.find((s) => s.id === 'incorporation')?.duration.pt).toBe(
        '{{BRANCH_REGISTRATION_TIME}}',
      );
      expect(a.timeToOperate.pt).toContain('90 dias');
      expect(ids(a.location)).toEqual(['corridor-maputo']);
      expect(a.watchPoints.some((w) => w.pt.includes('sociedade-mãe'))).toBe(true);
    });
  });

  describe('EX03 logistics, Beira corridor', () => {
    const a = run('TA-IM-EX03');

    it('applies 20% withholding without a treaty (China)', () => {
      expect(a.sector).toBe('logistics');
      const t = a.factTriggers.find((x) => x.trigger === 'treaty');
      expect(t?.id).toBe('no-treaty');
      expect(t?.text.pt).toContain('20%');
    });

    it('handles temporary import, shareholder loan and a large headcount within quota', () => {
      expect(ids(a.factTriggers)).toEqual(
        expect.arrayContaining(['temporary-import', 'shareholder-loan', 'quota-within']),
      );
      expect(ids(a.roadmap)).toContain('temporary-import');
      expect(a.timeToOperate.pt).toContain('3–5 meses');
      expect(ids(a.location)).toEqual(['corridor-beira']);
      expect(a.vehicle.recommended).toBe('lda');
    });
  });

  describe('EX04 eco-lodge, Inhambane (small investment)', () => {
    const a = run('TA-IM-EX04');

    it('falls below the FDI minimum of MZN 6.5 million', () => {
      expect(a.sector).toBe('tourism');
      expect(a.investmentRegime.fdiGuarantee.pt).toContain('abaixo do IDE mínimo');
      expect(a.watchPoints.some((w) => w.pt.includes('6,5 milhões'))).toBe(true);
    });

    it('focuses on land and environment and skips DFI notes', () => {
      expect(ids(a.licences)).toContain('duat');
      expect(ids(a.incentives)).not.toContain('class-k');
      expect(ids(a.financing)).not.toContain('dfi');
      expect(ids(a.location)).toEqual(['inhambane-coast']);
      expect(a.watchPoints.some((w) => w.pt.includes('costeira'))).toBe(true);
    });
  });

  describe('EX05 oil & gas supply, Pemba', () => {
    const a = run('TA-IM-EX05');

    it('recommends a local Lda for local content and registers as a supplier', () => {
      expect(a.sector).toBe('oil_gas');
      expect(a.vehicle.recommended).toBe('lda');
      expect(ids(a.factTriggers)).toContain('local-content');
      expect(ids(a.roadmap)).toContain('supplier-registration');
      expect(ids(a.location)).toEqual(['pemba']);
      expect(a.watchPoints.some((w) => w.pt.includes('Cabo Delgado'))).toBe(true);
    });

    it('treats exactly 15% foreign workers as within quota', () => {
      expect(a.factTriggers.find((t) => t.trigger === 'quota')?.id).toBe('quota-within');
    });
  });
});

describe('rules engine — custom input', () => {
  it('handles a small Mozambican project with no foreign facts', () => {
    const a = assess(custom({}), RULE_SET, CTX);
    expect(a.sector).toBe('general');
    expect(a.vehicle.recommended).toBe('lda');
    expect(a.vehicle.alternatives.map((x) => x.vehicle)).toEqual(['sas', 'sa']);
    expect(a.companyVsBranch).toBeUndefined();
    expect(a.factTriggers).toEqual([]);
    expect(a.investmentRegime.fdiGuarantee.pt).toContain('não se aplica');
    expect(a.investmentRegime.path.pt).toContain('{{APIEX_REGISTRATION_THRESHOLD}}');
    expect(a.timeToOperate.pt).toContain('2–4 semanas');
    expect(ids(a.obligations)).not.toContain('modelo-20');
    expect(ids(a.obligations)).not.toContain('permit-renewals');
  });

  it('puts a category A environmental licence on the critical path for mining', () => {
    const a = assess(
      custom({ idea: 'Mineração de grafite em Cabo Delgado', province: 'cabo_delgado' }),
      RULE_SET,
      CTX,
    );
    expect(a.sector).toBe('mining');
    const env = a.roadmap.find((s) => s.id === 'env-licence');
    expect(env?.critical).toBe(true);
    expect(env?.title.pt).toContain('categoria A');
    expect(a.timeToOperate.pt).toContain('{{ENV_LICENCE_CAT_A_DURATION}}');
  });

  it('uses a category C licence in parallel with the DUAT for light activities needing land', () => {
    const a = assess(custom({ needsLand: true }), RULE_SET, CTX);
    const env = a.roadmap.find((s) => s.id === 'env-licence');
    expect(env?.critical).toBe(false);
    expect(env?.title.pt).toContain('categoria C');
  });

  it('recommends a Lda for a foreign general project and an SA/SAS step when chosen by rules', () => {
    const a = assess(
      custom({ capital: 'foreign', investorCountry: 'GB', investmentUsd: 200000 }),
      RULE_SET,
      CTX,
    );
    expect(a.vehicle.recommended).toBe('lda');
    expect(a.vehicle.alternatives.map((x) => x.vehicle)).toEqual(['branch', 'sa', 'sas']);
    expect(a.factTriggers[0].id).toBe('no-treaty');
  });

  it('builds the incorporation step for SA/SAS vehicles', () => {
    const rules = {
      ...RULE_SET,
      vehicles: {
        ...RULE_SET.vehicles,
        rules: [
          {
            id: 'sa',
            when: [],
            then: {
              recommended: 'sa' as const,
              alternatives: ['lda' as const],
              reasoning: { pt: 'x', en: 'x', fr: 'x' },
            },
          },
        ],
      },
    };
    const a = assess(custom({}), rules, CTX);
    expect(a.roadmap.find((s) => s.id === 'incorporation')?.title.pt).toContain('sociedade');
  });

  it('throws when the vehicle table has no catch-all rule', () => {
    const rules = { ...RULE_SET, vehicles: { ...RULE_SET.vehicles, rules: [] } };
    expect(() => assess(custom({}), rules, CTX)).toThrow();
  });

  it('degrades gracefully when optional tables are empty', () => {
    const rules = {
      ...RULE_SET,
      apiex: { ...RULE_SET.apiex, regime: [], fdiGuarantee: [] },
      roadmap: { ...RULE_SET.roadmap, timeToOperate: [] },
      vehicles: { ...RULE_SET.vehicles, options: [] },
    };
    const a = assess(custom({}), rules, CTX);
    expect(a.investmentRegime.authority.pt).toBe('');
    expect(a.investmentRegime.fdiGuarantee.pt).toBe('');
    expect(a.timeToOperate.pt).toBe('');
    expect(a.vehicle.recommendedName.pt).toBe('');
    expect(a.vehicle.alternatives).toEqual([]);
  });
});

describe('facts', () => {
  it('classifies sectors in any of the three languages', () => {
    expect(classifySector('Cashew kernel processing plant', RULE_SET.sectors).id).toBe(
      'agro_industry',
    );
    expect(classifySector('Hôtel et écolodge sur la côte', RULE_SET.sectors).id).toBe('tourism');
    expect(classifySector('Exportação de entrepôts', RULE_SET.sectors).id).toBe('logistics');
    expect(classifySector('', RULE_SET.sectors).id).toBe('general');
  });

  it('falls back to the last sector when the fallback id is unknown', () => {
    const table = { ...RULE_SET.sectors, fallback: 'nope' as never };
    expect(classifySector('xyz', table).id).toBe('general');
  });

  it('computes quota status', () => {
    expect(quotaStatus({ workers: 10, foreignWorkers: 0 }, 15)).toBe('none');
    expect(quotaStatus({ workers: 0, foreignWorkers: 2 }, 15)).toBe('over');
    expect(quotaStatus({ workers: 20, foreignWorkers: 3 }, 15)).toBe('within');
    expect(quotaStatus({ workers: 20, foreignWorkers: 4 }, 15)).toBe('over');
  });

  it('derives FDI in MZN and a zero ratio without workers', () => {
    const f = deriveFacts(custom({ workers: 0, investmentUsd: 100000 }).input, RULE_SET, COUNTRIES);
    expect(f['investmentMzn']).toBe(6390000);
    expect(f['fdiMinimumMet']).toBe(false);
    expect(f['foreignRatio']).toBe(0);
    expect(f['corridor']).toBe('maputo');
  });

  it('returns treaty rates: known, unknown and none', () => {
    expect(treatyRate('ZA', COUNTRIES, RULE_SET).pt).toContain('8% ou 15%');
    expect(treatyRate('PT', COUNTRIES, RULE_SET).pt).toContain('{{TREATY_DIVIDEND_RATES}}');
    expect(treatyRate('CN', COUNTRIES, RULE_SET).pt).toContain('20%');
    expect(treatyRate('XX', COUNTRIES, RULE_SET).en).toContain('20%');
  });

  it('describes a visitor project with title, sector and summary', () => {
    const p = describeProject(
      'TA-IM-P26-ABCD',
      custom({
        idea: 'Fábrica de sumos de fruta em Manica. Segunda frase.',
        investmentUsd: 300000,
        province: 'manica',
      }).input,
      RULE_SET,
      '2026-10-19T10:00:00Z',
    );
    expect(p.title.pt).toBe('Fábrica de sumos de fruta em Manica.');
    expect(p.sector.pt).toBe('Indústria agro-alimentar');
    expect(p.summary.en).toContain('Manica');
    expect(p.summary.en).toContain('US$300,000');
    expect(p.example).toBe(false);
  });

  it('truncates long titles and falls back to the sector label', () => {
    const long = describeProject('R', custom({ idea: 'x'.repeat(100) }).input, RULE_SET, '');
    expect(long.title.pt.endsWith('…')).toBe(true);
    const empty = describeProject('R', custom({ idea: '   ' }).input, RULE_SET, '');
    expect(empty.title.fr).toBe('Activité commerciale générale');
  });
});
