import type { Lane, PlanSnapshot, TaskItem } from './types';

// The rows of the tasks of Next Releases ("corsie"): part of the plan, shared by every member,
// added, renamed, put in order and removed from the settings. The row of the notes of the days is
// no lane: it stays under the last one.

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
  const moved = lanes.find((lane) => lane.id === laneId);
  if (!moved || beforeId === laneId) return [...lanes];
  const others = lanes.filter((lane) => lane.id !== laneId);
  const at = beforeId === null ? -1 : others.findIndex((lane) => lane.id === beforeId);
  if (at < 0) return [...others, moved];
  return [...others.slice(0, at), moved, ...others.slice(at)];
}

/** The lane that follows `laneId` once it is at `index` of the lanes: null when it goes last. */
export function laneFollowerAt(
  lanes: readonly Lane[],
  laneId: string,
  index: number,
): string | null {
  const others = lanes.filter((lane) => lane.id !== laneId);
  return others[index]?.id ?? null;
}

/** The plan with a lane more, at the end. */
export function addLane(plan: PlanSnapshot, lane: Lane): PlanSnapshot {
  return { ...plan, lanes: [...plan.lanes, { id: lane.id, name: lane.name.trim() }] };
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
