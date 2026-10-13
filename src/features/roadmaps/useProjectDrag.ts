import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ProjectWithEnd } from '../../domain/projects';
import { moveTask } from '../../domain/schedule';
import { usePointerDrag } from '../calendar/usePointerDrag';

export interface ProjectDrag {
  project: ProjectWithEnd;
  /** Days moved so far. */
  days: number;
}

/** The project as it would be after the drag. */
export function draggedProject({ project, days }: ProjectDrag): ProjectWithEnd {
  return moveTask(project, days);
}

/**
 * Drags the bars of the roadmap with a mouse or a pen: the bar moves the project with the work of
 * its team, which also sets where it ends, so the bar has no edges to drag. A finger scrolls the
 * roadmap instead, and a tap opens the project.
 */
export function useProjectDrag(
  dayWidth: number,
  onMove: (projectId: string, days: number) => void,
) {
  const { drag, start, isClickAfterDrag } = usePointerDrag<ProjectDrag>(
    (current, delta) => {
      const days = Math.round(delta.x / dayWidth);
      return days === current.days ? current : { ...current, days };
    },
    (done) => {
      if (done.days !== 0) onMove(done.project.id, done.days);
    },
  );

  const startDrag = (event: ReactPointerEvent, project: ProjectWithEnd) => {
    start(event, { project, days: 0 });
  };

  return { drag, startDrag, isClickAfterDrag };
}
