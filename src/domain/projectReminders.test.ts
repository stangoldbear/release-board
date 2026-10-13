import { describe, expect, it } from 'vitest';
import {
  describeRemindDays,
  dueProjects,
  isRemindDays,
  rememberProjectReminders,
} from './projectReminders';
import type { Project } from './types';

const project = (id: string, extra: Partial<Project>): Project => ({
  id,
  title: id,
  startDate: '2026-10-01',
  colorId: 'blue',
  status: 'planned',
  ...extra,
});

describe('the alerts of the projects', () => {
  const projects = [
    project('deadline', { deadline: '2026-10-20', remindDaysBefore: 7 }),
    project('go-live', { remindDaysBefore: 1 }),
    project('later', { deadline: '2026-11-30', remindDaysBefore: 3 }),
    project('silent', { deadline: '2026-10-12' }),
    project('done', { deadline: '2026-10-12', remindDaysBefore: 0, status: 'completed' }),
  ];
  // The end of the work of each project; "go-live" has no deadline.
  const ends: Record<string, string> = { 'go-live': '2026-10-14' };
  const endOf = (item: Project) => ends[item.id] ?? item.startDate;

  it('come the days before the deadline, or the end of the work, once per browser', () => {
    const due = dueProjects(projects, endOf, '2026-10-13', {});
    expect(due.map((item) => [item.project.id, item.date, item.deadline])).toEqual([
      ['deadline', '2026-10-20', true],
      ['go-live', '2026-10-14', false],
    ]);
    // The day before the alerts begin: nothing yet.
    expect(dueProjects(projects, endOf, '2026-10-12', {})).toEqual([]);
    const seen = rememberProjectReminders({ gone: '2026-01-01' }, due, projects);
    expect(seen).toEqual({ deadline: '2026-10-20', 'go-live': '2026-10-14' });
    expect(dueProjects(projects, endOf, '2026-10-13', seen)).toEqual([]);
    // The day moved: the alert comes again.
    expect(
      dueProjects(projects, endOf, '2026-10-13', { ...seen, 'go-live': '2026-10-13' }).map(
        (item) => item.project.id,
      ),
    ).toEqual(['go-live']);
  });

  it('take whole days within a year, and say them', () => {
    expect(isRemindDays(0)).toBe(true);
    expect(isRemindDays(365)).toBe(true);
    expect(isRemindDays(1.5)).toBe(false);
    expect(isRemindDays(-1)).toBe(false);
    expect(isRemindDays('3')).toBe(false);
    expect(describeRemindDays(0)).toBe('il giorno stesso');
    expect(describeRemindDays(1)).toBe('1 giorno prima');
    expect(describeRemindDays(7)).toBe('7 giorni prima');
  });
});
