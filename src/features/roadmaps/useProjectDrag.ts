import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ProjectChanges, ProjectWithEnd } from '../../domain/projects';
import { moveTask, resizeTask } from '../../domain/schedule';
import { usePointerDrag } from '../calendar/usePointerDrag';
import type { DragKind } from '../calendar/useTaskDrag';

export interface ProjectDrag {
  project: ProjectWithEnd;
  kind: DragKind;
  /** Days moved so far. */
  days: number;
}

/** The project as it would be after the drag. */
export function draggedProject({ project, kind, days }: ProjectDrag): ProjectWithEnd {
  return kind === 'move' ? moveTask(project, days) : resizeTask(project, kind, days);
}

/**
 * Drags the bars of the roadmap with a mouse or a pen: the whole bar moves the project with the
 * work of its team, its left edge moves its start, its right edge its planned end. A finger
 * scrolls the roadmap instead, and a tap opens the project.
 */
export function useProjectDrag(
  dayWidth: number,
  onChange: (projectId: string, changes: ProjectChanges) => void,
  onMove: (projectId: string, days: number) => void,
) {
  const { drag, start, isClickAfterDrag } = usePointerDrag<ProjectDrag>(
    (current, delta) => {
      const days = Math.round(delta.x / dayWidth);
      return days === current.days ? current : { ...current, days };
    },
    (done) => {
      if (done.days === 0) return;
      if (done.kind === 'move') {
        onMove(done.project.id, done.days);
        return;
      }
      const after = draggedProject(done);
      if (done.kind === 'start' && after.startDate !== done.project.startDate) {
        onChange(done.project.id, { startDate: after.startDate });
      } else if (done.kind === 'end' && after.endDate !== done.project.endDate) {
        onChange(done.project.id, { endDate: after.endDate });
      }
    },
  );

  const startDrag = (event: ReactPointerEvent, project: ProjectWithEnd, kind: DragKind) => {
    // The handles sit inside the bar: only the innermost one starts the drag.
    if (start(event, { project, kind, days: 0 })) event.stopPropagation();
  };

  return { drag, startDrag, isClickAfterDrag };
}
