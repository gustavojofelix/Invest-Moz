/** Experts a lead can ask for (screen 9). Tax Advisory is the paid expert partner. */
const NAMES: Record<string, string> = {
  'tax-advisory': 'Tax Advisory',
  apiex: 'APIEX',
  bau: 'BAU',
  'e-bau': 'e-BAU',
  cta: 'CTA',
};

export function expertName(id: string): string {
  return NAMES[id] ?? id.replace(/-/g, ' ').toUpperCase();
}

/** Anything other than the paid expert partner is a free public body. */
export function isPublicExpert(id: string): boolean {
  return id !== 'tax-advisory';
}
