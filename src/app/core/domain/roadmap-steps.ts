/**
 * The nine ordered steps of the Tiva investment roadmap (screen pack, screens 2
 * and 6). Shared by the roadmap, documents and forms, regulatory watch and the
 * PDF export, so a step id means the same thing everywhere.
 */
export const ROADMAP_STEP_IDS = [
  'entity', // 1 Choose entity and reserve the name (Conservatória do Registo de Entidades Legais)
  'incorporate', // 2 Incorporate and get a NUIT (registry, Autoridade Tributária)
  'apiex', // 3 Register the project with APIEX (Lei n.º 8/2023, Decreto n.º 8/2024)
  'land', // 4 Secure land use: DUAT or lease (cadastre services)
  'environment', // 5 Environmental licence (category set at screening)
  'licence', // 6 Activity / industrial licence via e-BAU (Decretos n.º 40/2026 and 41/2026)
  'capital', // 7 Register foreign capital with Banco de Moçambique (Lei n.º 11/2009)
  'people', // 8 Hire staff, expatriate quota, work permits and DIRE (Lei n.º 13/2023)
  'tax', // 9 Tax and customs set-up: IVA, IRPC, INSS, importer registration
] as const;

export type RoadmapStepId = (typeof ROADMAP_STEP_IDS)[number];

/** localStorage key holding the ticked-off step ids for a project reference. */
export function roadmapProgressKey(projectRef: string): string {
  return `roadmap-progress:${projectRef}`;
}
