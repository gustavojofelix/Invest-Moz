import { dueDateInMonth, fromIso, isWorkingDay, nextDueDates, previousWorkingDay, toIso } from './calendar';
import { HOLIDAYS, TODAY } from './testing/fixtures';

const holidays = new Set(HOLIDAYS.map((h) => h.date));

describe('deadline calendar', () => {
  it('recognises weekends and Mozambican public holidays', () => {
    expect(isWorkingDay(fromIso('2026-10-19'), holidays)).toBe(true); // Monday
    expect(isWorkingDay(fromIso('2026-10-24'), holidays)).toBe(false); // Saturday
    expect(isWorkingDay(fromIso('2026-06-25'), holidays)).toBe(false); // Independence Day
    expect(isWorkingDay(fromIso('2026-10-05'), holidays)).toBe(false); // observed Monday
  });

  it('moves weekend deadlines to the previous working day and flags them', () => {
    // 20 Dec 2026 is a Sunday → Friday 18 Dec
    expect(dueDateInMonth(2026, 11, 20, holidays)).toEqual({ date: '2026-12-18', nominal: '2026-12-20', shifted: true });
    // 10 Jan 2027 is a Sunday → Friday 8 Jan
    expect(dueDateInMonth(2027, 0, 10, holidays).date).toBe('2027-01-08');
  });

  it('moves holiday deadlines to the previous working day', () => {
    // 25 Dec 2026 (Family Day, Friday) → 24 Dec
    expect(dueDateInMonth(2026, 11, 25, holidays)).toEqual({ date: '2026-12-24', nominal: '2026-12-25', shifted: true });
    // 5 Oct 2026 observed holiday (Monday) → Friday 2 Oct
    expect(dueDateInMonth(2026, 9, 5, holidays).date).toBe('2026-10-02');
  });

  it('does not flag dates that are already working days', () => {
    expect(dueDateInMonth(2026, 10, 10, holidays)).toEqual({ date: '2026-11-10', nominal: '2026-11-10', shifted: false });
  });

  it('clamps day-of-month to short months', () => {
    expect(dueDateInMonth(2027, 1, 31, holidays).nominal).toBe('2027-02-28');
  });

  it('computes the last working day of a month (never flagged)', () => {
    // 31 Jul 2027 is a Saturday
    expect(dueDateInMonth(2027, 6, 'last-working-day', holidays)).toEqual({ date: '2027-07-30', nominal: '2027-07-30', shifted: false });
    expect(dueDateInMonth(2027, 4, 'last-working-day', holidays).date).toBe('2027-05-31');
  });

  it('lists the next monthly due dates from today, including shifted ones', () => {
    const withholding = nextDueDates({ kind: 'monthly', day: 20 }, TODAY, holidays, 3);
    expect(withholding.map((d) => d.date)).toEqual(['2026-10-20', '2026-11-20', '2026-12-18']);
    expect(withholding[2].shifted).toBe(true);
    const inss = nextDueDates({ kind: 'monthly', day: 10 }, TODAY, holidays, 3);
    expect(inss.map((d) => d.date)).toEqual(['2026-11-10', '2026-12-10', '2027-01-08']);
  });

  it('lists annual due dates in the given months', () => {
    const poa = nextDueDates({ kind: 'annual', months: [5, 7, 9], day: 'last-working-day' }, TODAY, holidays, 3);
    expect(poa.map((d) => d.date)).toEqual(['2027-05-31', '2027-07-30', '2027-09-30']);
    const m20 = nextDueDates({ kind: 'annual', months: [6], day: 'last-working-day' }, TODAY, holidays, 1);
    expect(m20.map((d) => d.date)).toEqual(['2027-06-30']);
  });

  it('includes a due date falling on today', () => {
    expect(nextDueDates({ kind: 'monthly', day: 19 }, TODAY, holidays, 1)[0].date).toBe('2026-10-19');
  });

  it('returns nothing for text schedules', () => {
    expect(nextDueDates({ kind: 'text' }, TODAY, holidays)).toEqual([]);
  });

  it('round-trips ISO dates and steps back across holidays', () => {
    expect(toIso(fromIso('2027-02-03'))).toBe('2027-02-03');
    expect(toIso(previousWorkingDay(fromIso('2027-02-03'), holidays))).toBe('2027-02-02');
  });
});
