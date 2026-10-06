import { describe, expect, it } from 'vitest';
import { buildSamplePlan } from '../../domain/sample';
import {
  assignmentContent,
  buildPlan,
  chunk,
  contentWrites,
  importSummary,
  memoContent,
  projectContent,
  projectFieldContent,
  projectNoteContent,
  readAssignment,
  readLane,
  readMemo,
  readNote,
  readProject,
  readProjectField,
  readProjectNote,
  readStakeholder,
  readTask,
  readTeam,
  readValue,
  stakeholderContent,
  taskContent,
  teamContent,
} from './planDocs';

const plan = buildSamplePlan(2026, 8);

describe('task documents', () => {
  it('leaves empty optional fields out and reads them back as absent', () => {
    const data = taskContent({
      laneId: 'lane-1',
      title: 'Collaudo',
      startDate: '2026-09-10',
      endDate: '2026-09-12',
      colorId: 'ice',
      borderStyle: 'dashed',
      status: 'planned',
      assignee: '',
      description: '',
      deliverables: [],
    });
    expect(Object.keys(data).sort()).toEqual(
      ['borderStyle', 'colorId', 'endDate', 'laneId', 'startDate', 'status', 'title'].sort(),
    );
    expect(readTask('t1', data)).toEqual({ id: 't1', ...data });
  });

  it('skips documents that do not describe a task and repairs unknown colors', () => {
    expect(readTask('t1', { title: 'x' })).toBeNull();
    expect(readTask('t1', { ...taskContent(plan.tasks[0]!), status: 'done' })).toBeNull();
    expect(readTask('t1', { ...taskContent(plan.tasks[0]!), colorId: 'pink' })?.colorId).toBe(
      'yellow',
    );
  });
});

describe('free note documents', () => {
  it('keeps only the fields that are set, and skips documents without a title', () => {
    const data = memoContent({ title: 'Stima', position: 2, body: '', colorId: 'red' });
    expect(data).toEqual({ title: 'Stima', position: 2, colorId: 'red' });
    expect(readMemo('m1', { ...data, remindOn: '2026-02-30' })).toEqual({ id: 'm1', ...data });
    expect(readMemo('m1', { position: 1 })).toBeNull();
    expect(readMemo('m1', { title: 'Senza posto' })).toBeNull();
  });
});

describe('project documents', () => {
  it('keeps only the fields that are set, and skips documents that are not projects', () => {
    const data = projectContent({
      title: 'App mobile 3.0',
      startDate: '2026-09-10',
      endDate: '2026-12-20',
      colorId: 'purple',
      status: 'in_progress',
      owner: '',
    });
    expect(Object.keys(data).sort()).toEqual(
      ['colorId', 'endDate', 'startDate', 'status', 'title'].sort(),
    );
    expect(readProject('p1', data)).toEqual({ id: 'p1', ...data });
    expect(readProject('p1', { ...data, endDate: '2026-01-01' })).toBeNull();
    expect(readProject('p1', { ...data, status: 'done' })).toBeNull();
    expect(readProject('p1', { ...data, colorId: 'pink' })?.colorId).toBe('yellow');
  });

  it('keeps the values of the custom fields, and only those that have the shape of values', () => {
    const fields = { impactedTeams: ['qa'], budget: [{ amount: 12000, currency: 'EUR' }] };
    const data = projectContent({ ...plan.projects[0]!, fields });
    expect(data.fields).toEqual(fields);
    expect(readProject('p1', data)?.fields).toEqual(fields);
    expect(readProject('p1', { ...data, fields: { broken: 'x', ok: ['a', 3] } })?.fields).toEqual({
      ok: ['a', 3],
    });
    expect(readProject('p1', { ...data, fields: {} })?.fields).toBeUndefined();
    expect(projectContent({ ...plan.projects[0]!, fields: {} }).fields).toBeUndefined();
  });
});

describe('documents of the notes, assignments and configuration of the roadmap', () => {
  it('round-trip a note of a project, an assignment, a field, a team and a person', () => {
    const note = projectNoteContent({
      projectId: 'p1',
      text: 'Stima',
      createdAt: '2026-10-06T09:00:00.000Z',
      author: { id: '1002', login: 'editor' },
      status: 'open',
      dueOn: '2026-10-20',
      remind: true,
      owners: ['Giulia'],
      tags: [],
    });
    expect(Object.keys(note).sort()).toEqual(
      ['author', 'createdAt', 'dueOn', 'owners', 'projectId', 'remind', 'status', 'text'].sort(),
    );
    expect(readProjectNote('n1', note)).toEqual({ id: 'n1', ...note });
    expect(readProjectNote('n1', { ...note, createdAt: 'ieri' })).toBeNull();
    // A reminder without a deadline is left out.
    expect(
      projectNoteContent({
        projectId: 'p1',
        text: 'x',
        createdAt: note.createdAt as string,
        remind: true,
      }).remind,
    ).toBeUndefined();

    const assignment = assignmentContent({
      projectId: 'p1',
      stakeholderId: 'ios-1',
      startDate: '2026-10-05',
      manDays: 7.5,
      note: '',
    });
    expect(assignment).toEqual({
      projectId: 'p1',
      stakeholderId: 'ios-1',
      startDate: '2026-10-05',
      manDays: 7.5,
    });
    expect(readAssignment('a1', assignment)).toEqual({ id: 'a1', ...assignment });
    expect(readAssignment('a1', { ...assignment, manDays: 0 })).toBeNull();

    const field = projectFieldContent({
      label: 'Team impattati',
      type: 'choice',
      multiple: true,
      required: false,
      main: true,
      options: [{ id: 'qa', label: 'QA' }],
      position: 0,
    });
    expect(readProjectField('impactedTeams', field)).toEqual({ id: 'impactedTeams', ...field });
    expect(readProjectField('bad id!', field)).toBeNull();
    expect(
      projectFieldContent({
        label: 'Link',
        type: 'url',
        multiple: false,
        required: false,
        main: false,
        options: [{ id: 'x', label: 'X' }],
        position: 1,
      }).options,
    ).toBeUndefined();

    const team = teamContent({ name: 'QA', tag: 'QA', colorId: 'ice', position: 3 });
    expect(readTeam('qa', team)).toEqual({ id: 'qa', ...team });

    const person = stakeholderContent({
      name: 'QA #1',
      teamId: 'qa',
      absences: [{ start: '2026-12-20', end: '2027-01-20', reason: 'Ferie' }],
      position: 0,
    });
    expect(readStakeholder('qa-1', person)).toEqual({ id: 'qa-1', ...person });
    expect(readStakeholder('qa-1', { ...person, teamId: '' })).toBeNull();
  });
});

describe('plan documents', () => {
  it('round-trips the sample plan through its documents', () => {
    const writes = contentWrites(plan);
    const parts = {
      lanes: writes
        .filter((write) => write.path.startsWith('lanes/'))
        .map((write) => readLane(write.path.split('/')[1]!, write.data)!),
      tasks: writes
        .filter((write) => write.path.startsWith('tasks/'))
        .map((write) => readTask(write.path.split('/')[1]!, write.data)!),
      values: writes
        .filter((write) => write.path.includes('/values/'))
        .map((write) => readValue(write.path.split('/')[3]!, write.data)!),
      notes: writes
        .filter((write) => write.path.startsWith('notes/'))
        .map((write) => readNote(write.path.split('/')[1]!, write.data)!),
      memos: writes
        .filter((write) => write.path.startsWith('memos/'))
        .map((write) => readMemo(write.path.split('/')[1]!, write.data)!),
      projects: writes
        .filter((write) => write.path.startsWith('projects/'))
        .map((write) => readProject(write.path.split('/')[1]!, write.data)!),
      projectNotes: writes
        .filter((write) => write.path.startsWith('projectNotes/'))
        .map((write) => readProjectNote(write.path.split('/')[1]!, write.data)!),
      assignments: writes
        .filter((write) => write.path.startsWith('assignments/'))
        .map((write) => readAssignment(write.path.split('/')[1]!, write.data)!),
      fields: writes
        .filter((write) => write.path.startsWith('projectFields/'))
        .map((write) => readProjectField(write.path.split('/')[1]!, write.data)!),
      teams: writes
        .filter((write) => write.path.startsWith('teams/'))
        .map((write) => readTeam(write.path.split('/')[1]!, write.data)!),
      stakeholders: writes
        .filter((write) => write.path.startsWith('stakeholders/'))
        .map((write) => readStakeholder(write.path.split('/')[1]!, write.data)!),
    };
    const rebuilt = buildPlan(parts);
    expect(rebuilt.projects).toEqual(plan.projects);
    expect(rebuilt.projectNotes).toEqual(plan.projectNotes);
    expect(rebuilt.assignments).toEqual(plan.assignments);
    expect(rebuilt.roadmap).toEqual(plan.roadmap);
    expect(rebuilt.lanes).toEqual(plan.lanes);
    expect(rebuilt.metrics).toEqual(plan.metrics);
    expect(rebuilt.dailyNotes).toEqual(plan.dailyNotes);
    expect(rebuilt.memos).toEqual(plan.memos);
    expect([...rebuilt.tasks].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...plan.tasks].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });

  it('orders lanes by position, not by id', () => {
    const rebuilt = buildPlan({
      lanes: [
        { lane: { id: 'a', name: 'Terza' }, position: 2 },
        { lane: { id: 'b', name: 'Prima' }, position: 0 },
      ],
      tasks: [],
      values: [],
      notes: [],
      memos: [],
      projects: [],
      projectNotes: [],
      assignments: [],
      fields: [],
      teams: [],
      stakeholders: [],
    });
    expect(rebuilt.lanes.map((lane) => lane.name)).toEqual(['Prima', 'Terza']);
  });

  it('writes the metric definition along with the content', () => {
    expect(contentWrites(plan).some((write) => write.path === 'metrics/metric-1')).toBe(true);
    expect(importSummary(plan)).toBe(
      '3 corsie, 11 attività, 22 valori giornalieri, 2 note, 3 note libere, 5 progetti, 4 note dei progetti, 4 assegnazioni',
    );
  });

  it('chunks lists', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});
