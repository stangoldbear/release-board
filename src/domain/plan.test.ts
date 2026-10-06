import { describe, expect, it } from 'vitest';
import {
  addAssignment,
  addProject,
  addProjectNote,
  addTask,
  copyOfTask,
  createEmptyPlan,
  diffTask,
  importDailyValues,
  isPlanEmpty,
  moveNote,
  planContentSummary,
  removeAssignment,
  removeProject,
  removeProjectField,
  removeProjectNote,
  removeStakeholder,
  removeTask,
  removeTeam,
  replaceRoadmapConfig,
  saveProjectField,
  saveStakeholder,
  saveTeam,
  setMetricValues,
  setNote,
  updateAssignment,
  updateProject,
  updateProjectNote,
  updateTask,
} from './plan';
import { defaultRoadmapConfig } from './roadmapConfig';
import type { PlanSnapshot, TaskItem } from './types';

const task: TaskItem = {
  id: 'task-1',
  title: 'Nuovo carrello',
  laneId: 'lane-1',
  startDate: '2026-09-02',
  endDate: '2026-09-08',
  colorId: 'blue',
  borderStyle: 'dashed',
  status: 'in_progress',
  assignee: 'Giulia',
  deliverables: ['Revisione del codice'],
};

const plan: PlanSnapshot = { ...createEmptyPlan(), tasks: [task] };

describe('diffTask', () => {
  it('lists only the fields that changed', () => {
    const after = { ...task, title: 'Carrello', endDate: '2026-09-09' };
    expect(diffTask(task, after)).toEqual({ title: 'Carrello', endDate: '2026-09-09' });
  });

  it('compares lists by content', () => {
    expect(diffTask(task, { ...task, deliverables: ['Revisione del codice'] })).toEqual({});
    expect(diffTask(task, { ...task, deliverables: [] })).toEqual({ deliverables: [] });
  });

  it('includes optional fields that appear', () => {
    expect(diffTask(task, { ...task, description: 'Dettagli' })).toEqual({
      description: 'Dettagli',
    });
  });
});

describe('task changes', () => {
  it('adds, updates and removes tasks', () => {
    const other = { ...task, id: 'task-2' };
    const withOther = addTask(plan, other);
    expect(withOther.tasks.map((item) => item.id)).toEqual(['task-1', 'task-2']);

    const updated = updateTask(withOther, 'task-2', { status: 'completed' });
    expect(updated.tasks[1]).toEqual({ ...other, status: 'completed' });
    expect(updated.tasks[0]).toBe(task);

    expect(removeTask(updated, 'task-1').tasks.map((item) => item.id)).toEqual(['task-2']);
  });

  it('does not bring back a task that was deleted', () => {
    expect(updateTask(removeTask(plan, 'task-1'), 'task-1', { title: 'X' }).tasks).toEqual([]);
  });

  it('copies the content of a task, title included, without its id', () => {
    const { id, ...content } = task;
    expect(copyOfTask(task)).toEqual(content);
  });
});

describe('notes and values', () => {
  it('sets trimmed notes and removes blank ones', () => {
    const withNote = setNote(plan, '2026-09-15', '  Congelamento  ');
    expect(withNote.dailyNotes).toEqual({ '2026-09-15': 'Congelamento' });
    expect(setNote(withNote, '2026-09-15', '   ').dailyNotes).toEqual({});
  });

  it('moves a note to a free day, with a new text when given', () => {
    const withNote = setNote(plan, '2026-09-15', 'Congelamento');
    expect(moveNote(withNote, '2026-09-15', '2026-09-17').dailyNotes).toEqual({
      '2026-09-17': 'Congelamento',
    });
    expect(moveNote(withNote, '2026-09-15', '2026-09-17', ' Rilascio ').dailyNotes).toEqual({
      '2026-09-17': 'Rilascio',
    });
  });

  it('turns a text without a note to move into a new note', () => {
    expect(moveNote(plan, '2026-09-15', '2026-09-17', 'Rilascio').dailyNotes).toEqual({
      '2026-09-17': 'Rilascio',
    });
  });

  it('leaves the plan as it is when the move has nowhere to go or nothing to move', () => {
    const twoNotes = setNote(setNote(plan, '2026-09-15', 'A'), '2026-09-17', 'B');
    expect(moveNote(twoNotes, '2026-09-15', '2026-09-17')).toBe(twoNotes);
    expect(moveNote(twoNotes, '2026-09-15', '2026-09-15')).toBe(twoNotes);
    expect(moveNote(twoNotes, '2026-09-20', '2026-09-21')).toBe(twoNotes);
    expect(moveNote(twoNotes, '2026-09-15', '2026-09-16', '  ')).toBe(twoNotes);
  });

  it('keeps the approval light and promotions of a day when its value changes', () => {
    const imported = importDailyValues(plan, [
      { date: '2026-09-10', value: 5, approval: 'red', promoEu: 'Saldi' },
    ]);
    expect(setMetricValues(imported, [{ date: '2026-09-10', value: 7 }]).metrics).toEqual([
      { date: '2026-09-10', value: 7, approval: 'red', promoEu: 'Saldi' },
    ]);
    expect(setMetricValues(imported, [{ date: '2026-09-10', value: null }]).metrics).toEqual([]);
  });

  it('replaces whole days with an import, and leaves the other days alone', () => {
    const start = importDailyValues(plan, [
      { date: '2026-09-10', value: 5, approval: 'red', promoEu: 'Saldi' },
      { date: '2026-09-12', value: 9 },
    ]);
    expect(
      importDailyValues(start, [
        { date: '2026-09-11', value: 6 },
        { date: '2026-09-10', value: 8, approval: 'green' },
      ]).metrics,
    ).toEqual([
      { date: '2026-09-10', value: 8, approval: 'green' },
      { date: '2026-09-11', value: 6 },
      { date: '2026-09-12', value: 9 },
    ]);
  });

  it('sets and removes daily values, keeping them sorted by date', () => {
    const start = { ...plan, metrics: [{ date: '2026-09-10', value: 5 }] };
    const next = setMetricValues(start, [
      { date: '2026-09-02', value: 1 },
      { date: '2026-09-10', value: null },
      { date: '2026-09-05', value: 2.5 },
    ]);
    expect(next.metrics).toEqual([
      { date: '2026-09-02', value: 1 },
      { date: '2026-09-05', value: 2.5 },
    ]);
  });

  it('knows when a plan is empty', () => {
    expect(isPlanEmpty(createEmptyPlan())).toBe(true);
    expect(isPlanEmpty(setNote(createEmptyPlan(), '2026-09-01', 'Nota'))).toBe(false);
  });
});

describe('planContentSummary', () => {
  it('counts the content in words, without the private notes', () => {
    const plan = {
      ...createEmptyPlan(),
      lanes: [{ id: 'lane-1', name: 'Corsia' }],
      metrics: [{ date: '2026-10-05', value: 1 }],
      dailyNotes: { '2026-10-05': 'Nota' },
      memos: [
        { id: 'a', title: 'Condivisa', position: 1 },
        { id: 'b', title: 'Privata', position: 2, private: true as const },
      ],
    };
    expect(planContentSummary(plan)).toEqual([
      '1 corsia',
      '0 attività',
      '1 valore giornaliero',
      '1 nota',
      '1 nota libera',
      '0 progetti',
      '0 note dei progetti',
      '0 assegnazioni',
    ]);
    expect(planContentSummary(createEmptyPlan())).toEqual([
      '3 corsie',
      '0 attività',
      '0 valori giornalieri',
      '0 note',
      '0 note libere',
      '0 progetti',
      '0 note dei progetti',
      '0 assegnazioni',
    ]);
  });
});

describe('the projects of the roadmap', () => {
  const project = {
    id: 'p1',
    title: 'App mobile',
    startDate: '2026-11-01',
    endDate: '2027-01-31',
    colorId: 'blue' as const,
    status: 'planned' as const,
  };

  it('are added in the order of their start, changed and removed', () => {
    const early = { ...project, id: 'p0', startDate: '2026-10-01' };
    let plan = addProject(addProject(createEmptyPlan(), project), early);
    expect(plan.projects.map((item) => item.id)).toEqual(['p0', 'p1']);
    expect(isPlanEmpty(plan)).toBe(false);
    plan = updateProject(plan, 'p1', { startDate: '2026-09-01', owner: 'Giulia' });
    expect(plan.projects.map((item) => item.id)).toEqual(['p1', 'p0']);
    expect(plan.projects[0]).toMatchObject({ owner: 'Giulia' });
    plan = updateProject(plan, 'p1', { owner: null });
    expect(plan.projects[0]).not.toHaveProperty('owner');
    expect(removeProject(plan, 'p1').projects.map((item) => item.id)).toEqual(['p0']);
  });

  it('leave a project removed elsewhere as it is', () => {
    expect(updateProject(createEmptyPlan(), 'gone', { title: 'X' }).projects).toEqual([]);
  });
});

describe('the notes, the assignments and the configuration of the roadmap', () => {
  const project = {
    id: 'p1',
    title: 'App mobile',
    startDate: '2026-11-01',
    endDate: '2027-01-31',
    colorId: 'blue' as const,
    status: 'planned' as const,
  };
  const note = {
    id: 'n1',
    projectId: 'p1',
    text: 'Stima: 15 giorni',
    createdAt: '2026-10-06T09:00:00.000Z',
  };
  const assignment = {
    id: 'a1',
    projectId: 'p1',
    stakeholderId: 'ios-1',
    startDate: '2026-11-02',
    manDays: 10,
  };
  const base = addAssignment(
    addProjectNote(addProject(createEmptyPlan(), project), note),
    assignment,
  );

  it('starts with the default configuration, which does not make the plan full', () => {
    const empty = createEmptyPlan();
    expect(empty.roadmap).toEqual(defaultRoadmapConfig());
    expect(empty.roadmap.fields.length).toBeGreaterThan(0);
    expect(isPlanEmpty(empty)).toBe(true);
    expect(isPlanEmpty(addProjectNote({ ...empty, projects: [project] }, note))).toBe(false);
  });

  it('keeps the notes oldest first and the assignments by start, changes and removes them', () => {
    const earlier = { ...note, id: 'n0', createdAt: '2026-10-01T09:00:00.000Z' };
    let plan = addProjectNote(base, earlier);
    expect(plan.projectNotes.map((item) => item.id)).toEqual(['n0', 'n1']);
    plan = updateProjectNote(plan, 'n1', { status: 'done', owners: ['Giulia'] });
    expect(plan.projectNotes[1]).toEqual({ ...note, status: 'done', owners: ['Giulia'] });
    plan = updateProjectNote(plan, 'n1', { owners: null });
    expect(plan.projectNotes[1]).toEqual({ ...note, status: 'done' });
    expect(removeProjectNote(plan, 'n0').projectNotes.map((item) => item.id)).toEqual(['n1']);

    const later = { ...assignment, id: 'a2', startDate: '2026-12-01' };
    plan = addAssignment(plan, later);
    expect(plan.assignments.map((item) => item.id)).toEqual(['a1', 'a2']);
    plan = updateAssignment(plan, 'a1', { startDate: '2026-12-15', note: 'Seconda fase' });
    expect(plan.assignments.map((item) => item.id)).toEqual(['a2', 'a1']);
    expect(plan.assignments[1]?.note).toBe('Seconda fase');
    expect(removeAssignment(plan, 'a2').assignments.map((item) => item.id)).toEqual(['a1']);
  });

  it('removes the notes and the assignments with their project, and the assignments with their person', () => {
    const without = removeProject(base, 'p1');
    expect(without.projects).toEqual([]);
    expect(without.projectNotes).toEqual([]);
    expect(without.assignments).toEqual([]);
    const gone = removeStakeholder(base, 'ios-1');
    expect(gone.assignments).toEqual([]);
    expect(gone.roadmap.stakeholders.some((item) => item.id === 'ios-1')).toBe(false);
    expect(gone.projectNotes).toHaveLength(1);
  });

  it('adds, replaces and removes fields, teams and people, in their order', () => {
    const field = {
      id: 'budget',
      label: 'Budget',
      type: 'price' as const,
      multiple: false,
      required: false,
      main: true,
      position: -1,
    };
    let plan = saveProjectField(base, field);
    expect(plan.roadmap.fields[0]).toEqual(field);
    plan = saveProjectField(plan, { ...field, label: 'Budget previsto' });
    expect(plan.roadmap.fields.filter((item) => item.id === 'budget')).toHaveLength(1);
    expect(plan.roadmap.fields[0]?.label).toBe('Budget previsto');
    expect(
      removeProjectField(plan, 'budget').roadmap.fields.some((item) => item.id === 'budget'),
    ).toBe(false);

    const team = { id: 'design', name: 'Design', tag: 'UX', colorId: 'red' as const, position: 99 };
    plan = saveTeam(plan, team);
    expect(plan.roadmap.teams.at(-1)).toEqual(team);
    plan = saveStakeholder(plan, {
      id: 'ux-1',
      name: 'UX #1',
      teamId: 'design',
      absences: [],
      position: 99,
    });
    expect(plan.roadmap.stakeholders.at(-1)?.id).toBe('ux-1');
    plan = removeTeam(plan, 'design');
    expect(plan.roadmap.teams.some((item) => item.id === 'design')).toBe(false);
    // The person keeps the id of the team that is gone.
    expect(plan.roadmap.stakeholders.at(-1)?.teamId).toBe('design');

    const bare = { fields: [], teams: [], stakeholders: [] };
    expect(replaceRoadmapConfig(plan, bare).roadmap).toEqual(bare);
  });
});
