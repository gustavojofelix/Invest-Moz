/**
 * Assembles the RuleSet from the JSON rule tables. Bundled via static import:
 * the tables are small and needed together, and this keeps the engine usable
 * in tests, prerendering and (later) as a fixture for the Python engine.
 */
import apiex from '../../../assets/data/rules/apiex.json';
import incentives from '../../../assets/data/rules/incentives.json';
import licences from '../../../assets/data/rules/licences.json';
import obligations from '../../../assets/data/rules/obligations.json';
import quotas from '../../../assets/data/rules/quotas.json';
import roadmap from '../../../assets/data/rules/roadmap.json';
import sectors from '../../../assets/data/rules/sectors.json';
import treaties from '../../../assets/data/rules/treaties.json';
import triggers from '../../../assets/data/rules/triggers.json';
import vehicles from '../../../assets/data/rules/vehicles.json';
import zones from '../../../assets/data/rules/zones.json';
import type { RuleSet } from './rule-set';

export const RULE_SET = {
  apiex,
  incentives,
  licences,
  obligations,
  quotas,
  roadmap,
  sectors,
  treaties,
  triggers,
  vehicles,
  zones,
} as unknown as RuleSet;
