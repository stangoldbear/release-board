import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  formatDateToISO,
  formatDateToIT,
  getDaysInMonth,
  getEasterSunday,
  getItalianHolidayName,
  getWeekDays,
  isIsoDate,
  parseISODate,
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
  ])('knows %s', (date, name) => {
    expect(getItalianHolidayName(parseISODate(date))).toBe(name);
  });

  it('returns null on a working day', () => {
    expect(getItalianHolidayName(parseISODate('2026-09-28'))).toBeNull();
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

  it('starts weeks on Monday', () => {
    const week = getWeekDays(parseISODate('2026-09-27')).map(formatDateToISO);
    expect(week[0]).toBe('2026-09-21');
    expect(week[6]).toBe('2026-09-27');
  });
});
