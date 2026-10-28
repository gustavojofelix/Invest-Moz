import { ROADMAP_STEP_IDS } from '@core/domain/roadmap-steps';
import { RULE_SET } from '@core/domain/rule-set.data';
import { assess } from '@core/domain/rules-engine';
import { CTX, custom, example } from '@core/domain/testing/fixtures';
import stepsJson from '../../../assets/data/roadmap/steps.json';
import { buildSteps, type RoadmapStepDef } from './roadmap-data';

const DEFS = stepsJson.steps as unknown as RoadmapStepDef[];

describe('roadmap steps data', () => {
  it('has the nine step ids in order, every text in all eight locales', () => {
    expect(DEFS.map((s) => s.id)).toEqual([...ROADMAP_STEP_IDS]);
    const locales = ['pt', 'en', 'fr', 'zh', 'ar', 'hi', 'sw', 'af'];
    for (const s of DEFS) {
      for (const text of [s.title, s.short, s.who, s.summary, s.action, ...s.documents]) {
        for (const l of locales) expect(text[l as 'en'], `${s.id} ${l}`).toBeTruthy();
      }
    }
  });
});

describe('buildSteps', () => {
  it('combines the cashew example with the rules engine', () => {
    const p = example('TA-IM-EX01');
    const steps = buildSteps(DEFS, p, assess(p, RULE_SET, CTX));
    expect(steps.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
    expect(byId['entity'].details[0].label).toBe('recommended');
    expect(byId['land'].applies).toBe(true);
    expect(byId['capital'].applies).toBe(true);
    expect(byId['apiex'].refs).toContain('lei-8-2023');
    expect(steps.every((s) => s.details.length > 0)).toBe(true);
  });

  it('flags the steps that may not apply to a Mozambican project without land', () => {
    const p = custom({
      capital: 'mozambican',
      investorCountry: 'MZ',
      needsLand: false,
      foreignWorkers: 0,
    });
    const steps = buildSteps(DEFS, p, assess(p, RULE_SET, CTX));
    const byId = Object.fromEntries(steps.map((s) => [s.id, s]));
    expect(byId['land'].applies).toBe(false);
    expect(byId['capital'].applies).toBe(false);
    expect(byId['people'].details[0].key).toBe('noForeignWorkers');
  });
});
