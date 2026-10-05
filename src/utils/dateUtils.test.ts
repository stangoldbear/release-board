import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  addMonthsIso,
  daysBetween,
  diffDays,
  endOfMonth,
  formatDateTimeLongIT,
  formatDateToISO,
  formatDateToIT,
  getDaysInMonth,
  getEasterSunday,
  getItalianHolidayName,
  isIsoDate,
  parseISODate,
  startOfMonth,
  startOfWeek,
  timeAgo,
} from './dateUtils';

describe('getEasterSunday', () => {
  it.each([
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
  ])('finds Easter %i on %s', (year, expected) => {
    expect(formatDateToISO(getEasterSunday(year))).toBe(expected);
  });
});

describe('getItalianHolidayName', () => {
  it.each([
    ['2026-01-06', 'Epifania'],
    ['2026-04-06', "Lunedì dell'Angelo (Pasquetta)"],
    ['2026-06-02', 'Festa della Repubblica'],
    ['2026-12-25', 'Natale'],
    ['2027-10-04', "San Francesco d'Assisi"],
  ])('knows %s', (date, name) => {
    expect(getItalianHolidayName(parseISODate(date))).toBe(name);
  });

  it('returns null on a working day', () => {
    expect(getItalianHolidayName(parseISODate('2026-09-28'))).toBeNull();
  });

  it('counts 4 October as a holiday only from 2026, when it became one again', () => {
    expect(getItalianHolidayName(parseISODate('2025-10-04'))).toBeNull();
  });
});

describe('ISO dates', () => {
  it('formats local dates without shifting to UTC', () => {
    expect(formatDateToISO(new Date(2026, 8, 1))).toBe('2026-09-01');
    expect(formatDateToISO(parseISODate('2026-03-29'))).toBe('2026-03-29');
  });

  it('validates real calendar dates only', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-9-5')).toBe(false);
    expect(isIsoDate(20260905)).toBe(false);
  });

  it('formats dates the Italian way', () => {
    expect(formatDateToIT('2026-09-05')).toBe('05/09/2026');
  });
});

describe('calendar helpers', () => {
  it('lists every day of the month', () => {
    expect(getDaysInMonth(2026, 1)).toHaveLength(28);
    expect(getDaysInMonth(2028, 1)).toHaveLength(29);
    expect(getDaysInMonth(2026, 8).map(formatDateToISO).at(-1)).toBe('2026-09-30');
  });

  it('counts days inclusively across a daylight saving change', () => {
    expect(daysBetween('2026-09-10', '2026-09-10')).toBe(1);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(3);
  });
});

describe('ISO date arithmetic', () => {
  it('measures signed day differences across daylight saving changes', () => {
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(diffDays('2026-10-26', '2026-10-24')).toBe(-2);
  });

  it('adds days across months and years', () => {
    expect(addDaysIso('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDaysIso('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDaysIso('2026-03-28', 2)).toBe('2026-03-30');
  });

  it('adds months without leaving the target month', () => {
    expect(addMonthsIso('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsIso('2026-11-15', 3)).toBe('2027-02-15');
    expect(addMonthsIso('2026-03-31', -1)).toBe('2026-02-28');
  });

  it('finds the start of the week and the bounds of the month', () => {
    expect(startOfWeek('2026-09-27')).toBe('2026-09-21');
    expect(startOfWeek('2026-09-21')).toBe('2026-09-21');
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26');
    expect(startOfMonth('2026-09-29')).toBe('2026-09-01');
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
  });
});

describe('times', () => {
  const now = new Date(2026, 9, 5, 10, 52, 30);
  const before = (milliseconds: number) => new Date(now.getTime() - milliseconds);
  const MINUTE = 60_000;

  it('says how long ago a moment was', () => {
    expect(timeAgo(before(20_000), now)).toBe('meno di un minuto fa');
    expect(timeAgo(before(MINUTE), now)).toBe('1 minuto fa');
    expect(timeAgo(before(59 * MINUTE), now)).toBe('59 minuti fa');
    expect(timeAgo(before(60 * MINUTE), now)).toBe('1 ora fa');
    expect(timeAgo(before(23 * 60 * MINUTE + 59 * MINUTE), now)).toBe('23 ore fa');
    expect(timeAgo(before(24 * 60 * MINUTE), now)).toBe('1 giorno fa');
    expect(timeAgo(before(3 * 24 * 60 * MINUTE), now)).toBe('3 giorni fa');
  });

  it('treats a moment ahead of the clock as just now', () => {
    expect(timeAgo(new Date(now.getTime() + 5 * MINUTE), now)).toBe('meno di un minuto fa');
  });

  it('writes a moment in full', () => {
    expect(formatDateTimeLongIT(now)).toBe('lunedì 5 ottobre 2026 alle ore 10:52');
  });
});
