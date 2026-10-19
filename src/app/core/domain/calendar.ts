import type { DueDate, ObligationSchedule } from './types';

/**
 * Deadline calendar. Dates are calendar dates (`YYYY-MM-DD`) handled in UTC
 * so results never depend on the visitor's timezone.
 *
 * Rule: a deadline falling on a Saturday, Sunday or Mozambican public holiday
 * moves to the previous working day, and is flagged as shifted.
 */

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

export function isWorkingDay(date: Date, holidays: ReadonlySet<string>): boolean {
  const dow = date.getUTCDay();
  return dow !== 0 && dow !== 6 && !holidays.has(toIso(date));
}

/** Moves a date back until it is a working day. */
export function previousWorkingDay(date: Date, holidays: ReadonlySet<string>): Date {
  const d = new Date(date.getTime());
  while (!isWorkingDay(d, holidays)) d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

/** Due date for a given month. `day` is a day of month or the last working day. */
export function dueDateInMonth(
  year: number,
  month0: number,
  day: number | 'last-working-day',
  holidays: ReadonlySet<string>,
): DueDate {
  const last = daysInMonth(year, month0);
  if (day === 'last-working-day') {
    const actual = previousWorkingDay(new Date(Date.UTC(year, month0, last)), holidays);
    // The rule itself is "last working day", so this is never a shift.
    return { date: toIso(actual), nominal: toIso(actual), shifted: false };
  }
  const nominal = new Date(Date.UTC(year, month0, Math.min(day, last)));
  const actual = previousWorkingDay(nominal, holidays);
  return { date: toIso(actual), nominal: toIso(nominal), shifted: toIso(actual) !== toIso(nominal) };
}

/**
 * The next `count` due dates on or after `today` for a schedule.
 * Text schedules (no fixed day) return an empty list.
 */
export function nextDueDates(
  schedule: ObligationSchedule,
  today: string,
  holidays: ReadonlySet<string>,
  count = 3,
): DueDate[] {
  if (schedule.kind === 'text') return [];
  const start = fromIso(today);
  const out: DueDate[] = [];
  let year = start.getUTCFullYear();
  let month0 = start.getUTCMonth();
  // Bounded scan: at most 3 years ahead.
  for (let i = 0; i < 36 && out.length < count; i++) {
    const inScope = schedule.kind === 'monthly' || schedule.months.includes(month0 + 1);
    if (inScope) {
      const due = dueDateInMonth(year, month0, schedule.day, holidays);
      if (due.date >= today) out.push(due);
    }
    month0++;
    if (month0 === 12) {
      month0 = 0;
      year++;
    }
  }
  return out;
}
