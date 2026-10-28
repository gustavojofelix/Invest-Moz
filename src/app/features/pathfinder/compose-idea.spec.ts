import { RULE_SET } from '@core/domain/rule-set.data';
import { classifySector } from '@core/domain/rules-engine';
import type { SectorId } from '@core/domain/types';
import { composeIdea } from './compose-idea';

const classify = (text: string) => classifySector(text, RULE_SET.sectors).id;
const SECTORS: SectorId[] = [
  'agro_industry',
  'energy',
  'tourism',
  'logistics',
  'mining',
  'oil_gas',
  'services',
  'general',
];

describe('composeIdea', () => {
  it('builds an idea the rules engine reads as the chosen sector when none is given', () => {
    for (const s of SECTORS) expect(classify(composeIdea('', s, 'nampula', classify))).toBe(s);
  });

  it('keeps an idea that already matches the chosen sector', () => {
    const idea = 'A cashew-processing plant in Nampula.';
    expect(composeIdea(idea, 'agro_industry', 'nampula', classify)).toBe(idea);
  });

  it('adds the sector to an idea without sector words', () => {
    const out = composeIdea('Ein kleines Projekt in Maputo', 'tourism', 'maputo_cidade', classify);
    expect(out).toContain('Ein kleines Projekt');
    expect(classify(out)).toBe('tourism');
  });

  it('lets the chosen sector win over a conflicting idea', () => {
    const out = composeIdea(
      'Solar-powered eco lodge. Eight bungalows.',
      'tourism',
      'inhambane',
      classify,
    );
    expect(classify(out)).toBe('tourism');
    expect(out).toContain('Eight bungalows');
  });
});
