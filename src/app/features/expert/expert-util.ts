import type { Holiday, Locale } from '@core/domain/types';

/** Call times offered (Africa/Maputo, UTC+2 all year). */
export const CALL_TIMES = ['09:00', '11:00', '14:30', '16:00'] as const;

/** `YYYY-MM-DD` of a date in Maputo. */
function maputoDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo' }).format(date);
}

/** The next `count` working days after `from` (weekends and public holidays skipped). */
export function callSlots(from: Date, holidays: readonly Holiday[], count = 5): string[] {
  const closed = new Set(holidays.map((h) => h.date));
  const out: string[] = [];
  const d = new Date(`${maputoDay(from)}T12:00:00Z`);
  while (out.length < count) {
    d.setUTCDate(d.getUTCDate() + 1);
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6 && !closed.has(iso)) out.push(iso);
  }
  return out;
}

/** Where "Back" goes, from `?from=`. */
export function backLink(
  from: string | undefined,
  lang: Locale,
  projectRef: string | null,
): string[] {
  switch (from) {
    case 'chat':
    case 'incentives':
    case 'map':
    case 'library':
    case 'documents':
    case 'directory':
    case 'whatsapp':
      return ['/', lang, from];
    case 'roadmap':
      return projectRef ? ['/', lang, 'roadmap', projectRef] : ['/', lang, 'roadmap'];
    default:
      return ['/', lang];
  }
}
