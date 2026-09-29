import type { RowVisibility } from '../../domain/types';

export const ALL_ROWS_VISIBLE: RowVisibility = { hiddenLaneIds: [], showNotes: true };

/** Reads saved visibility settings; null when they are not valid. */
export function parseRowVisibility(value: unknown): RowVisibility | null {
  if (
    typeof value === 'object' &&
    value !== null &&
    'hiddenLaneIds' in value &&
    'showNotes' in value &&
    Array.isArray(value.hiddenLaneIds) &&
    typeof value.showNotes === 'boolean'
  ) {
    const ids: unknown[] = value.hiddenLaneIds;
    return {
      hiddenLaneIds: ids.filter((id): id is string => typeof id === 'string'),
      showNotes: value.showNotes,
    };
  }
  return null;
}

export function toggleLane(visibility: RowVisibility, laneId: string): RowVisibility {
  return {
    ...visibility,
    hiddenLaneIds: visibility.hiddenLaneIds.includes(laneId)
      ? visibility.hiddenLaneIds.filter((id) => id !== laneId)
      : [...visibility.hiddenLaneIds, laneId],
  };
}
