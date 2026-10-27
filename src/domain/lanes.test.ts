import { describe, expect, it } from 'vitest';
import {
  addLane,
  laneFollowerAt,
  laneNameError,
  moveLane,
  moveLaneBefore,
  nextLaneColor,
  recolorLane,
  removeLane,
  renameLane,
  taskColorOf,
  tasksOfLane,
} from './lanes';
import { TASK_COLOR_IDS } from './colors';
import { createEmptyPlan } from './plan';
import type { Lane, PlanSnapshot, TaskItem } from './types';

const lanes: Lane[] = [
  { id: 'lane-1', name: 'CLIENT' },
  { id: 'lane-2', name: 'SERVER' },
  { id: 'lane-3', name: 'CONTENT' },
];

const task = (id: string, laneId: string): TaskItem => ({
  id,
  title: id,
  laneId,
  startDate: '2026-10-15',
  endDate: '2026-10-16',
  colorId: 'blue',
  borderStyle: 'solid',
  status: 'planned',
});

const plan: PlanSnapshot = {
  ...createEmptyPlan(),
  lanes,
  tasks: [task('a', 'lane-1'), task('b', 'lane-2'), task('c', 'lane-2')],
};

const names = (list: readonly Lane[]) => list.map((lane) => lane.name);

describe('laneNameError', () => {
  it('wants a name, not too long, of no other lane whatever the case', () => {
    expect(laneNameError('QA', lanes)).toBeNull();
    expect(laneNameError('  ', lanes)).toBe('Scrivi il nome della corsia.');
    expect(laneNameError('x'.repeat(61), lanes)).toBe('Al massimo 60 caratteri.');
    expect(laneNameError('server', lanes)).toBe('C’è già una corsia con questo nome.');
  });

  it('lets a lane keep its own name', () => {
    expect(laneNameError('Server', lanes, 'lane-2')).toBeNull();
  });
});

describe('moving a lane', () => {
  it('puts it before another one, or last', () => {
    expect(names(moveLaneBefore(lanes, 'lane-3', 'lane-1'))).toEqual([
      'CONTENT',
      'CLIENT',
      'SERVER',
    ]);
    expect(names(moveLaneBefore(lanes, 'lane-1', null))).toEqual(['SERVER', 'CONTENT', 'CLIENT']);
    expect(names(moveLaneBefore(lanes, 'lane-1', 'lane-1'))).toEqual([
      'CLIENT',
      'SERVER',
      'CONTENT',
    ]);
    expect(names(moveLaneBefore(lanes, 'nowhere', 'lane-1'))).toEqual([
      'CLIENT',
      'SERVER',
      'CONTENT',
    ]);
  });

  it('names the lane that follows a place, as a drag gives it', () => {
    expect(laneFollowerAt(lanes, 'lane-3', 0)).toBe('lane-1');
    expect(laneFollowerAt(lanes, 'lane-1', 2)).toBeNull();
    expect(names(moveLane(plan, 'lane-1', laneFollowerAt(lanes, 'lane-1', 1)).lanes)).toEqual([
      'SERVER',
      'CLIENT',
      'CONTENT',
    ]);
  });
});

describe('changing the lanes of a plan', () => {
  it('adds a lane at the end and renames one, keeping the tasks where they are', () => {
    const added = addLane(plan, { id: 'lane-4', name: ' QA ' });
    expect(names(added.lanes)).toEqual(['CLIENT', 'SERVER', 'CONTENT', 'QA']);
    const renamed = renameLane(added, 'lane-1', 'App');
    expect(names(renamed.lanes)).toEqual(['App', 'SERVER', 'CONTENT', 'QA']);
    expect(renamed.tasks).toBe(plan.tasks);
  });

  it('removes only a lane without tasks', () => {
    expect(tasksOfLane(plan.tasks, 'lane-2')).toHaveLength(2);
    expect(removeLane(plan, 'lane-2')).toBe(plan);
    expect(names(removeLane(plan, 'lane-3').lanes)).toEqual(['CLIENT', 'SERVER']);
  });
});

describe('the colors of the lanes', () => {
  it('gives the tasks the color of their row, or their own when the row has none', () => {
    expect(taskColorOf({ colorId: 'red' }, { colorId: 'green' })).toBe('green');
    expect(taskColorOf({ colorId: 'red' }, {})).toBe('red');
    expect(taskColorOf({ colorId: 'red' }, undefined)).toBe('red');
  });

  it('colors a new row with a color no row has', () => {
    expect(nextLaneColor([])).toBe(TASK_COLOR_IDS[0]);
    expect(nextLaneColor([{ colorId: 'yellow' }, { colorId: 'gray' }, {}])).toBe('blue');
    const all = TASK_COLOR_IDS.map((colorId) => ({ colorId }));
    expect(TASK_COLOR_IDS).toContain(nextLaneColor(all));
  });

  it('adds a lane with its color, changes it and removes it, the tasks untouched', () => {
    const added = addLane(plan, { id: 'lane-4', name: 'QA', colorId: 'purple' });
    expect(added.lanes.at(-1)).toEqual({ id: 'lane-4', name: 'QA', colorId: 'purple' });
    const recolored = recolorLane(added, 'lane-4', 'teal');
    expect(recolored.lanes.at(-1)?.colorId).toBe('teal');
    const plain = recolorLane(recolored, 'lane-4', null);
    expect(plain.lanes.at(-1)).toEqual({ id: 'lane-4', name: 'QA' });
    expect(plain.tasks).toBe(plan.tasks);
  });
});
