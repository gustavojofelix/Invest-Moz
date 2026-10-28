import countriesJson from '../../../../assets/data/countries.json';
import holidaysJson from '../../../../assets/data/holidays.json';
import projectsJson from '../../../../assets/data/projects.json';
import type { EngineContext } from '../rules-engine';
import type { Country, Holiday, Project, ProjectInput } from '../types';
import { fillText } from '../text';

export const TODAY = '2026-10-19';
export const COUNTRIES = countriesJson.countries as Country[];
export const HOLIDAYS = holidaysJson.holidays as Holiday[];
export const PROJECTS = projectsJson.projects as Project[];
export const CTX: EngineContext = { today: TODAY, holidays: HOLIDAYS, countries: COUNTRIES };

export function example(ref: string): Project {
  const p = PROJECTS.find((x) => x.ref === ref);
  if (!p) throw new Error(`missing example ${ref}`);
  return p;
}

export function custom(overrides: Partial<ProjectInput>): Project {
  const input: ProjectInput = {
    idea: 'Comércio geral de bens de consumo',
    province: 'maputo_cidade',
    capital: 'mozambican',
    investorCountry: 'MZ',
    investmentUsd: 50000,
    workers: 5,
    foreignWorkers: 0,
    importsGoods: false,
    exports: false,
    needsLand: false,
    shareholderLoan: false,
    feesAbroad: false,
    temporaryImport: false,
    ...overrides,
  };
  return {
    ref: 'TA-IM-P26-TEST',
    example: false,
    title: fillText({ pt: 't', en: 't', fr: 't' }),
    sector: fillText({ pt: 's', en: 's', fr: 's' }),
    summary: fillText({ pt: 's', en: 's', fr: 's' }),
    input,
  };
}
