import type { PointerEvent as ReactPointerEvent } from 'react';
import { manDaysEndingOn, moveAssignment, scheduleAssignment } from '../../domain/assignments';
import { addDaysIso } from '../../utils/dateUtils';
import { usePointerDrag } from '../calendar/usePointerDrag';
import type { WorkItem } from './barRendering';

/** The whole bar moves the start of the work; its right edge changes the days of effort. */
export type WorkDragKind = 'move' | 'end';

/** What a drag, the keys or the editor change on a bar of work. */
export interface WorkChanges {
  startDate?: string;
  manDays?: number;
}

export interface WorkDrag {
  item: WorkItem;
  kind: WorkDragKind;
  /** Days moved so far. */
  days: number;
}

/** The bar as it would be after the drag: its start moved to a working day, or its effort changed. */
export function draggedWork({ item, kind, days }: WorkDrag): WorkItem {
  if (days === 0) return item;
  if (kind === 'move') {
    const moved = moveAssignment(item, days);
    return { ...moved, schedule: scheduleAssignment(moved, item.absences) };
  }
  const end = addDaysIso(item.schedule.end, days);
  const manDays = manDaysEndingOn(
    item.schedule.start,
    end < item.schedule.start ? item.schedule.start : end,
    item.absences,
  );
  if (manDays === item.manDays) return item;
  return {
    ...item,
    manDays,
    schedule: scheduleAssignment({ startDate: item.startDate, manDays }, item.absences),
  };
}

/**
 * Drags a bar of work with a mouse or a pen: the whole bar moves the start of the work, and its
 * length follows the effort; the right edge changes the effort by the working days it covers. A
 * finger scrolls the roadmap instead, and a tap opens the bar.
 */
export function useWorkDrag(
  dayWidth: number,
  onDrop: (item: WorkItem, changes: WorkChanges) => void,
) {
  const { drag, start, isClickAfterDrag } = usePointerDrag<WorkDrag>(
    (current, delta) => {
      const days = Math.round(delta.x / dayWidth);
      return days === current.days ? current : { ...current, days };
    },
    (done) => {
      const after = draggedWork(done);
      if (done.kind === 'move' && after.startDate !== done.item.startDate) {
        onDrop(done.item, { startDate: after.startDate });
      } else if (done.kind === 'end' && after.manDays !== done.item.manDays) {
        onDrop(done.item, { manDays: after.manDays });
      }
    },
  );

  const startDrag = (event: ReactPointerEvent, item: WorkItem, kind: WorkDragKind) => {
    // The handle sits inside the bar: only the innermost one starts the drag.
    if (start(event, { item, kind, days: 0 })) event.stopPropagation();
  };

  return { drag, startDrag, isClickAfterDrag };
}
