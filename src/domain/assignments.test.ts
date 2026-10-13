import { describe, expect, it } from 'vitest';
import {
  absencesWithin,
  assignmentsOfProject,
  describeEffort,
  diffAssignment,
  isValidManDays,
  isWorkingDay,
  manDaysEndingOn,
  moveAssignment,
  parseAssignment,
  scheduleAssignment,
} from './assignments';
import type { Assignment } from './types';

const assignment: Assignment = {
  id: 'a1',
  projectId: 'p1',
  stakeholderId: 'server-1',
  startDate: '2026-12-15',
  manDays: 15,
};

describe('scheduling an assignment', () => {
  it('skips weekends, holidays and the days away, as in the example of the request', () => {
    // Three weeks from Tuesday the 15th of December 2026, away from the 20th of December to the
    // 20th of January: four days before the leave, then eleven from Thursday the 21st of January.
    const schedule = scheduleAssignment(
      assignment,
      [{ start: '2026-12-20', end: '2027-01-20', reason: 'Ferie' }],
      [],
    );
    expect(schedule.start).toBe('2026-12-15');
    expect(schedule.workDays.slice(0, 4)).toEqual([
      '2026-12-15',
      '2026-12-16',
      '2026-12-17',
      '2026-12-18',
    ]);
    expect(schedule.workDays[4]).toBe('2027-01-21');
    expect(schedule.workDays).toHaveLength(15);
    expect(schedule.end).toBe('2027-02-04');
    expect(schedule.absences).toEqual([{ start: '2026-12-20', end: '2027-01-20' }]);
    expect(schedule.truncated).toBe(false);
  });

  it('starts on the first working day and counts half days as whole ones on the bar', () => {
    const fromSaturday = scheduleAssignment({ startDate: '2026-10-10', manDays: 2.5 }, [], []);
    expect(fromSaturday.start).toBe('2026-10-12');
    expect(fromSaturday.workDays).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
    expect(fromSaturday.end).toBe('2026-10-14');
  });

  it('cuts the bar when the days away never end', () => {
    const cut = scheduleAssignment(
      { startDate: '2026-10-05', manDays: 1 },
      [{ start: '2026-01-01', end: '2099-12-31' }],
      [],
    );
    expect(cut.truncated).toBe(true);
    expect(cut.workDays).toEqual([]);
    expect(cut.start).toBe('2026-10-05');
  });

  it('clips and merges the absences within the bar', () => {
    expect(
      absencesWithin(
        [
          { start: '2026-12-28', end: '2027-01-03' },
          { start: '2026-12-20', end: '2026-12-27' },
          { start: '2026-11-01', end: '2026-11-05' },
          { start: '2027-02-10', end: '2027-02-12' },
        ],
        { start: '2026-12-15', end: '2027-02-10' },
      ),
    ).toEqual([
      { start: '2026-12-20', end: '2027-01-03' },
      { start: '2027-02-10', end: '2027-02-10' },
    ]);
  });

  it('knows the working days of the Italian calendar', () => {
    expect(isWorkingDay('2026-10-05', [])).toBe(true);
    expect(isWorkingDay('2026-10-04', [])).toBe(false); // Sunday, and San Francesco
    expect(isWorkingDay('2026-12-25', [])).toBe(false);
    expect(isWorkingDay('2027-01-06', [])).toBe(false);
  });
});

describe('the company closures', () => {
  // Closed from Monday the 10th to Friday the 21st of August 2026.
  const august = [{ start: '2026-08-10', end: '2026-08-21', reason: 'Chiusura estiva' }];

  it('are no working days, for anyone', () => {
    expect(isWorkingDay('2026-08-10', august)).toBe(false);
    expect(isWorkingDay('2026-08-21', august)).toBe(false);
    expect(isWorkingDay('2026-08-24', august)).toBe(true);
    expect(isWorkingDay('2026-08-10', [])).toBe(true);
  });

  it('are skipped by the work as weekends, without showing as days away', () => {
    // Five days from Thursday the 6th: the 6th and the 7th, then three from the 24th.
    const schedule = scheduleAssignment({ startDate: '2026-08-06', manDays: 5 }, [], august);
    expect(schedule.workDays).toEqual([
      '2026-08-06',
      '2026-08-07',
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
    ]);
    expect(schedule.absences).toEqual([]);
  });

  it('move the work and count its days across them', () => {
    expect(moveAssignment({ startDate: '2026-08-07' }, 1, august).startDate).toBe('2026-08-24');
    expect(moveAssignment({ startDate: '2026-08-24' }, -1, august).startDate).toBe('2026-08-07');
    expect(manDaysEndingOn('2026-08-03', '2026-08-28', [], august)).toBe(10);
  });
});

describe('assignments', () => {
  it('move to a working day in the direction of the move', () => {
    expect(moveAssignment({ startDate: '2026-10-09' }, 1, []).startDate).toBe('2026-10-12');
    expect(moveAssignment({ startDate: '2026-10-12' }, -1, []).startDate).toBe('2026-10-09');
    expect(moveAssignment({ startDate: '2026-10-12' }, 0, []).startDate).toBe('2026-10-12');
    expect(moveAssignment({ startDate: '2026-10-12' }, 7, []).startDate).toBe('2026-10-19');
  });

  it('are listed by project and by start, and saved only where they changed', () => {
    const later = { ...assignment, id: 'a2', startDate: '2027-01-11' };
    const other = { ...assignment, id: 'a3', projectId: 'p2' };
    expect(assignmentsOfProject([later, other, assignment], 'p1').map((item) => item.id)).toEqual([
      'a1',
      'a2',
    ]);
    expect(
      diffAssignment(assignment, {
        projectId: 'p1',
        stakeholderId: 'server-2',
        startDate: '2026-12-15',
        manDays: 10,
        note: '  ',
      }),
    ).toEqual({ stakeholderId: 'server-2', manDays: 10 });
    expect(diffAssignment({ ...assignment, note: 'x' }, { ...assignment, note: '' })).toEqual({
      note: null,
    });
  });

  it('describe the effort in days and weeks', () => {
    expect(describeEffort(15)).toBe('15 giorni (3 settimane)');
    expect(describeEffort(5)).toBe('5 giorni (1 settimana)');
    expect(describeEffort(1)).toBe('1 giorno');
    expect(describeEffort(2.5)).toBe('2,5 giorni');
    expect(describeEffort(7)).toBe('7 giorni');
  });

  it('accept efforts in half days within the limit', () => {
    expect(isValidManDays(0.5)).toBe(true);
    expect(isValidManDays(500)).toBe(true);
    expect(isValidManDays(0)).toBe(false);
    expect(isValidManDays(0.25)).toBe(false);
    expect(isValidManDays(501)).toBe(false);
    expect(isValidManDays('3')).toBe(false);
  });

  it('are read from their data, and refused when they do not fit', () => {
    const { id, ...data } = assignment;
    expect(parseAssignment(id, data)).toEqual(assignment);
    expect(parseAssignment('a1', { ...data, note: 'Prima fase' })).toEqual({
      ...assignment,
      note: 'Prima fase',
    });
    expect(parseAssignment('a1', { ...data, note: '  ' })).toEqual(assignment);
    expect(parseAssignment('a1', { ...data, manDays: 0 })).toBeNull();
    expect(parseAssignment('a1', { ...data, startDate: '15/12/2026' })).toBeNull();
    expect(parseAssignment('a1', { ...data, stakeholderId: '' })).toBeNull();
  });
});

describe('manDaysEndingOn', () => {
  it('counts the working days from the start to the day, skipping those away', () => {
    // Monday the 2nd to Friday the 13th of November 2026: two weeks.
    expect(manDaysEndingOn('2026-11-02', '2026-11-13', [], [])).toBe(10);
    // The same with a day away in the middle, and the end on a Sunday.
    expect(
      manDaysEndingOn('2026-11-02', '2026-11-15', [{ start: '2026-11-04', end: '2026-11-04' }], []),
    ).toBe(9);
  });

  it('is at least a day and at most the limit', () => {
    expect(manDaysEndingOn('2026-11-07', '2026-11-08', [], [])).toBe(1);
    expect(manDaysEndingOn('2026-11-02', '2026-11-01', [], [])).toBe(1);
    expect(manDaysEndingOn('2020-01-01', '2029-12-31', [], [])).toBe(500);
  });
});
