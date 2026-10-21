import { describe, expect, it } from 'vitest';
import { defaultRoadmapConfig } from './roadmapConfig';
import { planTeam } from './teamPlan';
import type { Assignment } from './types';

const config = defaultRoadmapConfig();
const project = { id: 'p1', startDate: '2026-11-02' };

describe('the plan of the team of a project', () => {
  it('keeps split assignments and all reserve segments when saving the project', () => {
    const reserve = {
      startDate: '2026-11-12',
      manDays: 2,
      note: 'First',
      segments: [{ id: 'reserve-2', startDate: '2026-11-23', manDays: 3, note: 'After the pause' }],
    };
    const existing: Assignment[] = [
      {
        id: 'a1',
        projectId: 'p1',
        stakeholderId: 'server-1',
        startDate: '2026-11-02',
        manDays: 2,
        note: 'First',
      },
      {
        id: 'a2',
        projectId: 'p1',
        stakeholderId: 'server-1',
        startDate: '2026-11-09',
        manDays: 2,
        note: 'After the pause',
      },
    ];
    const plan = planTeam(
      { ...project, arrangement: 'manual', contingency: reserve },
      existing,
      existing.map((item) => ({
        assignmentId: item.id,
        stakeholderId: item.stakeholderId,
        manDays: item.manDays,
      })),
      2,
      config,
    );
    expect(plan.contingency).toEqual(reserve);
    expect(plan.update).toEqual([]);
    expect(plan.remove).toEqual([]);
    expect(plan.create).toEqual([]);
  });

  it('adds the rows as assignments placed by the arrangement, with the contingency after them', () => {
    const plan = planTeam(
      project,
      [],
      [
        { stakeholderId: 'ba-1', manDays: 5 },
        { stakeholderId: 'server-1', manDays: 12 },
        { stakeholderId: 'qa-1', manDays: 0 },
      ],
      3,
      config,
    );
    expect(plan.create).toEqual([
      { projectId: 'p1', stakeholderId: 'ba-1', startDate: '2026-11-02', manDays: 5 },
      { projectId: 'p1', stakeholderId: 'server-1', startDate: '2026-11-09', manDays: 12 },
    ]);
    expect(plan.update).toEqual([]);
    expect(plan.remove).toEqual([]);
    expect(plan.contingency).toEqual({ startDate: '2026-11-25', manDays: 3 });
  });

  it('changes the days of a row, moves the bars that follow and removes the rows that are gone', () => {
    const existing: Assignment[] = [
      { id: 'a1', projectId: 'p1', stakeholderId: 'ba-1', startDate: '2026-11-02', manDays: 5 },
      {
        id: 'a2',
        projectId: 'p1',
        stakeholderId: 'server-1',
        startDate: '2026-11-09',
        manDays: 12,
      },
      { id: 'a3', projectId: 'p1', stakeholderId: 'qa-1', startDate: '2026-11-25', manDays: 3 },
    ];
    const plan = planTeam(
      project,
      existing,
      [
        { assignmentId: 'a1', stakeholderId: 'ba-1', manDays: 3 },
        { assignmentId: 'a2', stakeholderId: 'server-1', manDays: 12 },
      ],
      null,
      config,
    );
    expect(plan.update).toEqual([
      { id: 'a1', changes: { manDays: 3 } },
      { id: 'a2', changes: { startDate: '2026-11-05' } },
    ]);
    expect(plan.remove).toEqual(['a3']);
    expect(plan.create).toEqual([]);
    expect(plan.contingency).toBeNull();
  });

  it('keeps the bars of a manual arrangement, and its contingency, where they are', () => {
    const existing: Assignment[] = [
      { id: 'a1', projectId: 'p1', stakeholderId: 'ba-1', startDate: '2026-11-04', manDays: 5 },
    ];
    const plan = planTeam(
      {
        ...project,
        arrangement: 'manual',
        contingency: { startDate: '2026-12-01', manDays: 2 },
      },
      existing,
      [
        { assignmentId: 'a1', stakeholderId: 'ba-1', manDays: 5 },
        { stakeholderId: 'server-1', manDays: 4 },
      ],
      2,
      config,
    );
    expect(plan.update).toEqual([]);
    expect(plan.create).toEqual([
      { projectId: 'p1', stakeholderId: 'server-1', startDate: '2026-11-02', manDays: 4 },
    ]);
    expect(plan.contingency).toEqual({ startDate: '2026-12-01', manDays: 2 });
  });
});
