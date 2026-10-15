import { describe, expect, it } from 'vitest';
import { dayRuns, sharedDays, stackBars, worksOn } from './peopleWork';
import type { PersonBar } from './peopleWork';

const bar = (
  id: string,
  start: string,
  end: string,
  workDays: string[] = [start, end],
): PersonBar => ({
  id,
  schedule: { start, end, workDays },
});

describe('stackBars', () => {
  it('puts the bars that share days on lines of their own, the others back on the first', () => {
    const { placed, lines } = stackBars([
      bar('late', '2026-10-26', '2026-10-30'),
      bar('first', '2026-10-15', '2026-10-27'),
      bar('after', '2026-10-28', '2026-11-02'),
    ]);
    expect(lines).toBe(2);
    expect(placed.map(({ bar: item, line }) => [item.id, line])).toEqual([
      ['first', 0],
      ['late', 1],
      ['after', 0],
    ]);
  });

  it('keeps one line for a person without work', () => {
    expect(stackBars([])).toEqual({ placed: [], lines: 1 });
  });
});

describe('the days with more than one project', () => {
  const app = bar('app', '2026-10-15', '2026-10-21', [
    '2026-10-15',
    '2026-10-16',
    '2026-10-19',
    '2026-10-20',
    '2026-10-21',
  ]);
  const loyalty = bar('loyalty', '2026-10-20', '2026-10-23', [
    '2026-10-20',
    '2026-10-21',
    '2026-10-23',
  ]);

  it('are the working days two bars share, not the days off between them', () => {
    expect(sharedDays([app, loyalty])).toEqual(['2026-10-20', '2026-10-21']);
    expect(sharedDays([app])).toEqual([]);
  });

  it('make runs of consecutive days', () => {
    expect(dayRuns(['2026-10-20', '2026-10-21', '2026-10-23'])).toEqual([
      { start: '2026-10-20', end: '2026-10-21' },
      { start: '2026-10-23', end: '2026-10-23' },
    ]);
    expect(dayRuns([])).toEqual([]);
  });

  it('tell whether a bar works on a day', () => {
    expect(worksOn(loyalty, '2026-10-21')).toBe(true);
    expect(worksOn(loyalty, '2026-10-22')).toBe(false);
  });
});
