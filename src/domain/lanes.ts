import { TASK_COLOR_IDS } from './colors';
import type { TaskColorId } from './colors';
import { followerAt, moveBefore } from './listOrder';
import type { Lane, PlanSnapshot, TaskItem } from './types';

// The rows of the tasks of Next Releases ("corsie"): part of the plan, shared by every member,
// added, renamed, colored, put in order and removed from the settings. The row of the notes of
// the days is no lane: it stays under the last one, with a color of its own in the settings.

/**
 * The color a task shows: its row's, when the row has one (0.21), or its own. The task keeps its
 * own color, which comes back should the row lose its color.
 */
export function taskColorOf(
  task: Pick<TaskItem, 'colorId'>,
  lane: Pick<Lane, 'colorId'> | undefined,
): TaskColorId {
  return lane?.colorId ?? task.colorId;
}

/**
 * The color of a new row: the first of the palette that no row has, so that every row differs,
 * and after the last the first again.
 */
export function nextLaneColor(lanes: readonly Pick<Lane, 'colorId'>[]): TaskColorId {
  const used = new Set(lanes.map((lane) => lane.colorId));
  return (
    TASK_COLOR_IDS.find((color) => !used.has(color)) ??
    TASK_COLOR_IDS[lanes.length % TASK_COLOR_IDS.length] ??
    'blue'
  );
}

/** The longest name of a lane; the security rules enforce the same. */
export const LANE_NAME_MAX = 60;

/** The tasks of a lane. */
export function tasksOfLane(tasks: readonly TaskItem[], laneId: string): TaskItem[] {
  return tasks.filter((task) => task.laneId === laneId);
}

/**
 * Why a name cannot be the name of a lane, in words, or null when it can: not empty, not too
 * long, and not the name of another lane, whatever the case, since the timeline writes them all in
 * capitals. `laneId` is the lane being renamed, which may keep its own name.
 */
export function laneNameError(
  name: string,
  lanes: readonly Lane[],
  laneId: string | null = null,
): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'Scrivi il nome della corsia.';
  if (trimmed.length > LANE_NAME_MAX) return `Al massimo ${LANE_NAME_MAX} caratteri.`;
  const taken = lanes.some(
    (lane) => lane.id !== laneId && lane.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  return taken ? 'C’è già una corsia con questo nome.' : null;
}

/**
 * The lanes in their new order once `laneId` is put right before `beforeId`, or last when
 * `beforeId` is null. An unknown lane leaves the order as it is.
 */
export function moveLaneBefore(
  lanes: readonly Lane[],
  laneId: string,
  beforeId: string | null,
): Lane[] {
  return moveBefore(lanes, laneId, beforeId);
}

/** The lane that follows `laneId` once it is at `index` of the lanes: null when it goes last. */
export function laneFollowerAt(
  lanes: readonly Lane[],
  laneId: string,
  index: number,
): string | null {
  return followerAt(lanes, laneId, index);
}

/** The plan with a lane more, at the end. */
export function addLane(plan: PlanSnapshot, lane: Lane): PlanSnapshot {
  const added: Lane = { id: lane.id, name: lane.name.trim() };
  if (lane.colorId) added.colorId = lane.colorId;
  return { ...plan, lanes: [...plan.lanes, added] };
}

/** The plan with the color of a lane changed, or removed with null: its tasks keep their own. */
export function recolorLane(
  plan: PlanSnapshot,
  laneId: string,
  colorId: TaskColorId | null,
): PlanSnapshot {
  return {
    ...plan,
    lanes: plan.lanes.map((lane) => {
      if (lane.id !== laneId) return lane;
      const { colorId: _old, ...rest } = lane;
      return colorId ? { ...rest, colorId } : rest;
    }),
  };
}

/** The plan with a lane renamed; a lane that no longer exists stays removed. */
export function renameLane(plan: PlanSnapshot, laneId: string, name: string): PlanSnapshot {
  return {
    ...plan,
    lanes: plan.lanes.map((lane) => (lane.id === laneId ? { ...lane, name: name.trim() } : lane)),
  };
}

/** The plan with a lane moved right before another one, or last. */
export function moveLane(
  plan: PlanSnapshot,
  laneId: string,
  beforeId: string | null,
): PlanSnapshot {
  return { ...plan, lanes: moveLaneBefore(plan.lanes, laneId, beforeId) };
}

/** The plan without a lane, when it has no tasks: a lane with tasks stays, so that none is lost. */
export function removeLane(plan: PlanSnapshot, laneId: string): PlanSnapshot {
  if (tasksOfLane(plan.tasks, laneId).length > 0) return plan;
  return { ...plan, lanes: plan.lanes.filter((lane) => lane.id !== laneId) };
}
