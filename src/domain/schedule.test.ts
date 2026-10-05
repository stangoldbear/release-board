import { describe, expect, it } from 'vitest';
import {
  moveTask,
  moveTaskTo,
  placeTasks,
  rangeColumns,
  rangeDays,
  resizeTask,
  tasksOnDay,
  weekRange,
} from './schedule';

function task(id: string, startDate: string, endDate: string) {
  return { id, startDate, endDate };
}

describe('ranges', () => {
  it('lists the days of a week', () => {
    expect(rangeDays(weekRange('2026-10-01'))).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
  });

  it('cuts a range into week columns', () => {
    const columns = rangeColumns({ start: '2026-08-31', end: '2026-12-06' }, 'week');
    expect(columns).toHaveLength(14);
    expect(columns[0]).toEqual({ start: '2026-08-31', end: '2026-09-06' });
    expect(columns.at(-1)).toEqual({ start: '2026-11-30', end: '2026-12-06' });
  });

  it('keeps the last column inside the range', () => {
    expect(rangeColumns({ start: '2026-09-01', end: '2026-09-10' }, 'week')).toEqual([
      { start: '2026-09-01', end: '2026-09-07' },
      { start: '2026-09-08', end: '2026-09-10' },
    ]);
  });
});

describe('placeTasks', () => {
  const september = { start: '2026-09-01', end: '2026-09-30' };

  it('keeps only the tasks that fall in the range', () => {
    const { placed } = placeTasks(
      [
        task('before', '2026-08-01', '2026-08-31'),
        task('inside', '2026-09-10', '2026-09-12'),
        task('after', '2026-10-01', '2026-10-02'),
      ],
      september,
    );
    expect(placed.map((item) => item.task.id)).toEqual(['inside']);
    expect(placed[0]).toMatchObject({ first: 9, last: 11, track: 0 });
  });

  it('cuts tasks that cross the edges of the range', () => {
    const { placed } = placeTasks([task('long', '2026-08-20', '2026-10-05')], september);
    expect(placed[0]).toMatchObject({
      first: 0,
      last: 29,
      continuesBefore: true,
      continuesAfter: true,
    });
  });

  it('stacks overlapping tasks and reuses free rows', () => {
    const { placed, tracks } = placeTasks(
      [
        task('c', '2026-09-05', '2026-09-06'),
        task('a', '2026-09-01', '2026-09-04'),
        task('b', '2026-09-03', '2026-09-05'),
      ],
      september,
    );
    expect(placed.map((item) => [item.task.id, item.track])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 0],
    ]);
    expect(tracks).toBe(2);
  });

  it('needs no rows when nothing is visible', () => {
    expect(placeTasks([], september)).toEqual({ placed: [], tracks: 0 });
  });
});

describe('task dates', () => {
  const base = task('t', '2026-09-28', '2026-10-02');

  it('lists the tasks of a day', () => {
    const other = task('o', '2026-10-03', '2026-10-03');
    expect(tasksOnDay([base, other], '2026-10-02')).toEqual([base]);
  });

  it('moves a task keeping its length', () => {
    expect(moveTask(base, 3)).toMatchObject({ startDate: '2026-10-01', endDate: '2026-10-05' });
    expect(moveTaskTo(base, '2026-09-01')).toMatchObject({
      startDate: '2026-09-01',
      endDate: '2026-09-05',
    });
  });

  it('resizes one end without passing the other', () => {
    expect(resizeTask(base, 'end', -2)).toMatchObject({ endDate: '2026-09-30' });
    expect(resizeTask(base, 'end', -10)).toMatchObject({ endDate: '2026-09-28' });
    expect(resizeTask(base, 'start', 10)).toMatchObject({ startDate: '2026-10-02' });
    expect(resizeTask(base, 'start', -1)).toMatchObject({ startDate: '2026-09-27' });
  });
});
