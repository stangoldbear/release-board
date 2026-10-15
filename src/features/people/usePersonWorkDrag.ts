import type { PointerEvent as ReactPointerEvent } from 'react';
import type { AssignmentChanges } from '../../domain/assignments';
import { usePointerDrag } from '../calendar/usePointerDrag';
import type { WorkItem } from '../roadmaps/barRendering';
import { draggedWork } from '../roadmaps/useWorkDrag';
import type { WorkDrag, WorkDragKind } from '../roadmaps/useWorkDrag';

/** The attribute that tells the person of a row, on its name and on its days. */
export const PERSON_ROW_ATTRIBUTE = 'data-person-row';

/** A drag of a bar in the part «Persone»: the days as in the roadmap, and the person under the pointer. */
export interface PersonWorkDrag extends WorkDrag {
  personId: string;
}

/** The person of the row under a point of the screen, if any. */
function personAt(x: number, y: number): string | null {
  for (const element of document.elementsFromPoint(x, y)) {
    const id = element.getAttribute(PERSON_ROW_ATTRIBUTE);
    if (id) return id;
  }
  return null;
}

/**
 * Drags a bar of a person with a mouse or a pen: sideways it moves the start of the work as in the
 * roadmap, and over the row of another person it gives the work to that person; its right edge
 * changes the days of effort, in its own row. A finger scrolls instead, and a tap opens the bar.
 */
export function usePersonWorkDrag(
  dayWidth: number,
  onDrop: (item: WorkItem, changes: AssignmentChanges) => void,
) {
  const { drag, start, isClickAfterDrag } = usePointerDrag<PersonWorkDrag>(
    (current, delta, event) => {
      const days = Math.round(delta.x / dayWidth);
      const personId =
        current.kind === 'move'
          ? (personAt(event.clientX, event.clientY) ?? current.personId)
          : current.personId;
      return days === current.days && personId === current.personId
        ? current
        : { ...current, days, personId };
    },
    (done) => {
      const after = draggedWork(done);
      const changes: AssignmentChanges = {};
      if (done.kind === 'move' && after.startDate !== done.item.startDate) {
        changes.startDate = after.startDate;
      }
      if (done.kind === 'end' && after.manDays !== done.item.manDays) {
        changes.manDays = after.manDays;
      }
      if (done.personId !== done.item.stakeholder?.id) changes.stakeholderId = done.personId;
      if (Object.keys(changes).length > 0) onDrop(done.item, changes);
    },
  );

  const startDrag = (event: ReactPointerEvent, item: WorkItem, kind: WorkDragKind) => {
    if (!item.stakeholder) return;
    // The handle sits inside the bar: only the innermost one starts the drag.
    if (start(event, { item, kind, days: 0, personId: item.stakeholder.id })) {
      event.stopPropagation();
    }
  };

  return { drag, startDrag, isClickAfterDrag };
}
