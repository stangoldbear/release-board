import { describe, expect, it } from 'vitest';
import { buildSamplePlan } from '../../domain/sample';
import {
  buildPlan,
  chunk,
  contentWrites,
  importSummary,
  memoContent,
  projectContent,
  readLane,
  readMemo,
  readNote,
  readProject,
  readTask,
  readValue,
  taskContent,
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
    };
    const rebuilt = buildPlan(parts);
    expect(rebuilt.projects).toEqual(plan.projects);
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
    });
    expect(rebuilt.lanes.map((lane) => lane.name)).toEqual(['Prima', 'Terza']);
  });

  it('writes the metric definition along with the content', () => {
    expect(contentWrites(plan).some((write) => write.path === 'metrics/metric-1')).toBe(true);
    expect(importSummary(plan)).toBe(
      '3 corsie, 11 attività, 22 valori giornalieri, 2 note, 3 note libere, 5 progetti',
    );
  });

  it('chunks lists', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});
