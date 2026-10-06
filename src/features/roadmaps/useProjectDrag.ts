import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ProjectChanges } from '../../domain/projects';
import { moveTask, resizeTask } from '../../domain/schedule';
import type { Project } from '../../domain/types';
import { usePointerDrag } from '../calendar/usePointerDrag';
import type { DragKind } from '../calendar/useTaskDrag';

export interface ProjectDrag {
  project: Project;
  kind: DragKind;
  /** Days moved so far. */
  days: number;
}

/** The project as it would be after the drag. */
export function draggedProject({ project, kind, days }: ProjectDrag): Project {
  return kind === 'move' ? moveTask(project, days) : resizeTask(project, kind, days);
}

/**
 * Drags the bars of the roadmap with a mouse or a pen: the whole bar moves the project, its edges
 * move its start or its end. A finger scrolls the roadmap instead, and a tap opens the project.
 */
export function useProjectDrag(
  dayWidth: number,
  onChange: (projectId: string, changes: ProjectChanges) => void,
) {
  const { drag, start, isClickAfterDrag } = usePointerDrag<ProjectDrag>(
    (current, delta) => {
      const days = Math.round(delta.x / dayWidth);
      return days === current.days ? current : { ...current, days };
    },
    (done) => {
      const after = draggedProject(done);
      const changes: ProjectChanges = {};
      if (after.startDate !== done.project.startDate) changes.startDate = after.startDate;
      if (after.endDate !== done.project.endDate) changes.endDate = after.endDate;
      if (Object.keys(changes).length > 0) onChange(done.project.id, changes);
    },
  );

  const startDrag = (event: ReactPointerEvent, project: Project, kind: DragKind) => {
    // The handles sit inside the bar: only the innermost one starts the drag.
    if (start(event, { project, kind, days: 0 })) event.stopPropagation();
  };

  return { drag, startDrag, isClickAfterDrag };
}
