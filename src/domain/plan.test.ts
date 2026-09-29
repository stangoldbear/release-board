import { describe, expect, it } from 'vitest';
import {
  addTask,
  copyOfTask,
  createEmptyPlan,
  diffTask,
  isPlanEmpty,
  removeTask,
  setMetricValues,
  setNote,
  updateTask,
} from './plan';
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

  it('copies the content of a task, without its id', () => {
    const { id, ...content } = task;
    const copy = copyOfTask(task);
    expect(copy).toEqual({ ...content, title: 'Nuovo carrello (Copia)' });
    expect(copyOfTask({ ...copy, id: 'task-2' }).title).toBe('Nuovo carrello (Copia)');
  });
});

describe('notes and values', () => {
  it('sets trimmed notes and removes blank ones', () => {
    const withNote = setNote(plan, '2026-09-15', '  Congelamento  ');
    expect(withNote.dailyNotes).toEqual({ '2026-09-15': 'Congelamento' });
    expect(setNote(withNote, '2026-09-15', '   ').dailyNotes).toEqual({});
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
