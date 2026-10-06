import type { PointerEvent as ReactPointerEvent } from 'react';
import { moveAssignment } from '../../domain/assignments';
import type { AssignmentChanges } from '../../domain/assignments';
import type { Assignment } from '../../domain/types';
import { usePointerDrag } from '../calendar/usePointerDrag';

export interface AssignmentDrag {
  assignment: Assignment;
  /** Days moved so far. */
  days: number;
}

/** The assignment as it would be after the drag: its start moved, on a working day. */
export function draggedAssignment({ assignment, days }: AssignmentDrag): Assignment {
  return moveAssignment(assignment, days);
}

/**
 * Drags the bar of a person with a mouse or a pen: the whole bar moves the start of the work,
 * and its length follows the effort. A finger scrolls the roadmap instead, and a tap opens it.
 */
export function useAssignmentDrag(
  dayWidth: number,
  onChange: (assignmentId: string, changes: AssignmentChanges) => void,
) {
  const { drag, start, isClickAfterDrag } = usePointerDrag<AssignmentDrag>(
    (current, delta) => {
      const days = Math.round(delta.x / dayWidth);
      return days === current.days ? current : { ...current, days };
    },
    (done) => {
      const after = draggedAssignment(done);
      if (after.startDate !== done.assignment.startDate) {
        onChange(done.assignment.id, { startDate: after.startDate });
      }
    },
  );

  const startDrag = (event: ReactPointerEvent, assignment: Assignment) => {
    if (start(event, { assignment, days: 0 })) event.stopPropagation();
  };

  return { drag, startDrag, isClickAfterDrag };
}
