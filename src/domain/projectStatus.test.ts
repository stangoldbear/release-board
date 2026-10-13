import { describe, expect, it } from 'vitest';
import { statusChangeOf, statusFromDates, withEffectiveStatus } from './projectStatus';
import type { ProjectStatus } from './types';

const START = '2026-10-05';
const END = '2026-10-20';

describe('the state of a project on a day', () => {
  it('puts a planned project in progress from its start to its end, and completes it after', () => {
    expect(statusFromDates('planned', START, END, '2026-10-04')).toBe('planned');
    expect(statusFromDates('planned', START, END, START)).toBe('in_progress');
    expect(statusFromDates('planned', START, END, '2026-10-12')).toBe('in_progress');
    expect(statusFromDates('planned', START, END, END)).toBe('in_progress');
    expect(statusFromDates('planned', START, END, '2026-10-21')).toBe('completed');
  });

  it('completes a project in progress once its days have gone by', () => {
    expect(statusFromDates('in_progress', START, END, '2026-10-12')).toBe('in_progress');
    expect(statusFromDates('in_progress', START, END, '2026-10-21')).toBe('completed');
    // Its start is in the future: the member knows better than the dates.
    expect(statusFromDates('in_progress', START, END, '2026-10-01')).toBe('in_progress');
  });

  it('leaves ideas, projects on hold and completed ones as they are', () => {
    for (const status of ['idea', 'on_hold', 'completed'] as ProjectStatus[]) {
      for (const today of ['2026-10-01', '2026-10-12', '2026-11-01']) {
        expect(statusFromDates(status, START, END, today)).toBe(status);
      }
    }
  });

  it('describes the change to confirm, from the day it holds', () => {
    const planned = { status: 'planned' as const, startDate: START };
    expect(statusChangeOf(planned, END, '2026-10-04')).toBeNull();
    expect(statusChangeOf(planned, END, '2026-10-12')).toEqual({
      from: 'planned',
      to: 'in_progress',
      since: START,
    });
    expect(statusChangeOf(planned, END, '2026-10-25')).toEqual({
      from: 'planned',
      to: 'completed',
      since: '2026-10-21',
    });
    expect(statusChangeOf({ status: 'in_progress', startDate: START }, END, '2026-10-25')).toEqual({
      from: 'in_progress',
      to: 'completed',
      since: '2026-10-21',
    });
  });

  it('gives a project the state of the day, keeping the rest and the same object when nothing changes', () => {
    const project = {
      id: 'p1',
      title: 'Shop',
      status: 'planned' as const,
      startDate: START,
      endDate: END,
    };
    expect(withEffectiveStatus(project, '2026-10-01')).toBe(project);
    expect(withEffectiveStatus(project, '2026-10-12')).toEqual({
      ...project,
      status: 'in_progress',
      statusChange: { from: 'planned', to: 'in_progress', since: START },
    });
  });
});
