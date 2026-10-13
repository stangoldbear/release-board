import { describe, expect, it } from 'vitest';
import { projectSpan } from '../../domain/projectSpan';
import { defaultRoadmapConfig } from '../../domain/roadmapConfig';
import type { Assignment, Project } from '../../domain/types';
import { workItemsOf } from './barRendering';
import { deadlineOverrun } from './deadlineOverrun';

const config = defaultRoadmapConfig();
const project: Project = {
  id: 'p1',
  title: 'Prova',
  startDate: '2026-11-02',
  colorId: 'blue',
  status: 'planned',
  deadline: '2026-11-27',
  contingency: { startDate: '2026-11-30', manDays: 2 },
};
const assignments: Assignment[] = [
  { id: 'a-qa', projectId: 'p1', stakeholderId: 'qa-1', startDate: '2026-11-25', manDays: 3 },
];

describe('deadlineOverrun', () => {
  it('tells the working days past the deadline and the bars that end after it', () => {
    const span = projectSpan(project, assignments, config);
    const overrun = deadlineOverrun(project, span, workItemsOf(project, span, config), []);
    // The contingency works Monday the 30th and Tuesday the 1st, after the weekend.
    expect(overrun).toMatchObject({ deadline: '2026-11-27', end: '2026-12-01', workingDays: 2 });
    expect(overrun?.late.map((item) => item.name)).toEqual(['Contingency']);
  });

  it('leaves out the holidays, and is null in time or without a deadline', () => {
    const planned = { ...project, contingency: undefined };
    const longer = [{ ...assignments[0]!, manDays: 12 }];
    const span = projectSpan(planned, longer, config);
    // Twelve days from the 25th end on the 11th, past the 8th of December, a holiday: from the
    // 30th to the 11th, ten working days but the holiday.
    expect(deadlineOverrun(planned, span, workItemsOf(planned, span, config), [])).toMatchObject({
      end: '2026-12-11',
      workingDays: 9,
    });
    const inTime = { ...project, contingency: undefined };
    const spanInTime = projectSpan(inTime, assignments, config);
    expect(deadlineOverrun(inTime, spanInTime, [], [])).toBeNull();
    const free = { ...project, deadline: undefined };
    expect(deadlineOverrun(free, projectSpan(free, assignments, config), [], [])).toBeNull();
  });
});
