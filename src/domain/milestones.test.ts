import { describe, expect, it } from 'vitest';
import {
  diffMilestone,
  dueMilestones,
  freeMilestones,
  milestonesOfProject,
  moveMilestone,
  parseMilestone,
  rememberMilestoneReminders,
  sortMilestones,
} from './milestones';
import type { Milestone } from './types';

const notes: Milestone[] = [
  { id: 'b', date: '2026-11-20', title: 'Demo', colorId: 'purple', projectId: 'p1', remind: true },
  { id: 'a', date: '2026-11-02', title: 'Kick-off', colorId: 'yellow', projectId: 'p1' },
  { id: 'c', date: '2026-12-18', title: 'Code freeze', colorId: 'red', remind: true },
];

describe('the notes on the timeline', () => {
  it('are sorted by day, split by project, and moved by any day', () => {
    expect(sortMilestones(notes).map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(milestonesOfProject(notes, 'p1').map((item) => item.id)).toEqual(['a', 'b']);
    expect(freeMilestones(notes).map((item) => item.id)).toEqual(['c']);
    expect(moveMilestone(notes[1]!, 5).date).toBe('2026-11-07');
    expect(moveMilestone(notes[1]!, 0)).toBe(notes[1]);
  });

  it('read their data, repairing the color and refusing what is not a note', () => {
    expect(
      parseMilestone('x', {
        date: '2026-11-02',
        title: 'Kick-off',
        colorId: 'teal',
        body: ' ',
        projectId: 'p1',
        remind: true,
      }),
    ).toEqual({
      id: 'x',
      date: '2026-11-02',
      title: 'Kick-off',
      colorId: 'teal',
      projectId: 'p1',
      remind: true,
    });
    expect(
      parseMilestone('x', { date: '2026-11-02', title: 'T', colorId: 'rainbow' })?.colorId,
    ).toBe('yellow');
    expect(parseMilestone('x', { date: '2026-13-02', title: 'T', colorId: 'red' })).toBeNull();
    expect(parseMilestone('x', { date: '2026-11-02', title: '  ', colorId: 'red' })).toBeNull();
    expect(
      parseMilestone('x', { date: '2026-11-02', title: 'T', colorId: 'red', remind: false }),
    ).toBeNull();
    expect(
      parseMilestone('x', {
        date: '2026-11-02',
        title: 'T',
        colorId: 'red',
        body: 'x'.repeat(2001),
      }),
    ).toBeNull();
    expect(parseMilestone('x', 'nope')).toBeNull();
  });

  it('tell the fields that change, blanks removing the optional ones', () => {
    expect(
      diffMilestone(notes[0]!, {
        date: '2026-11-21',
        title: ' Demo finale ',
        colorId: 'purple',
        body: 'Con il cliente',
      }),
    ).toEqual({
      date: '2026-11-21',
      title: 'Demo finale',
      body: 'Con il cliente',
      projectId: null,
      remind: null,
    });
    expect(
      diffMilestone(notes[2]!, {
        date: '2026-12-18',
        title: 'Code freeze',
        colorId: 'red',
        remind: true,
      }),
    ).toEqual({});
  });

  it('come due on their day, once per browser', () => {
    expect(dueMilestones(notes, '2026-11-20', {}).map((item) => item.id)).toEqual(['b']);
    expect(dueMilestones(notes, '2026-12-18', {}).map((item) => item.id)).toEqual(['b', 'c']);
    const seen = rememberMilestoneReminders({ gone: '2026-01-01' }, [notes[0]!], notes);
    expect(seen).toEqual({ b: '2026-11-20' });
    expect(dueMilestones(notes, '2026-11-20', seen)).toEqual([]);
  });
});
