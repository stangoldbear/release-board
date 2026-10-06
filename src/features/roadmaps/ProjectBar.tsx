import type { KeyboardEvent, PointerEvent } from 'react';
import { PROJECT_STATUS_LABELS } from '../../domain/projects';
import type { ProjectChanges } from '../../domain/projects';
import { moveTask, resizeTask } from '../../domain/schedule';
import type { PlacedTask } from '../../domain/schedule';
import type { Project } from '../../domain/types';
import { CURRENT_RESULT, Highlight, useIsCurrentResult } from '../../shared/ui/Highlight';
import { taskColorStyle } from '../../themes';
import { formatDateToIT } from '../../utils/dateUtils';
import type { DragKind } from '../calendar/useTaskDrag';
import { ProjectStatusMark } from './projectUi';

/** Bars narrower than this have no handles on their edges: the whole bar moves. */
const MIN_RESIZABLE_WIDTH = 24;
/** The arrows move a project by a week: a day is too little to see on a roadmap. */
const KEY_STEP_DAYS = 7;

/** The element of a project's bar, to give it the focus. */
export function projectBarId(projectId: string): string {
  return `project-rect-${projectId}`;
}

interface ProjectBarProps {
  /** The project, cut to the days the roadmap holds. */
  placed: PlacedTask<Project>;
  dayWidth: number;
  /** Pixels from the top of the row, or a CSS length such as one that centers the bar. */
  top: number | string;
  height: number;
  dragging: boolean;
  /** Id of the text that explains the keyboard commands. */
  describedBy: string;
  onPointerDown: (event: PointerEvent, kind: DragKind) => void;
  onOpen: () => void;
  onChange: (changes: ProjectChanges) => void;
}

/**
 * A project on the roadmap, from its first day to its last. Click or Enter opens it; with a mouse
 * it moves by dragging, and its edges change start and end; the arrows move it by a week, and with
 * Shift they move its end.
 */
export function ProjectBar({
  placed,
  dayWidth,
  top,
  height,
  dragging,
  describedBy,
  onPointerDown,
  onOpen,
  onChange,
}: ProjectBarProps) {
  const { task: project, first, last, continuesBefore, continuesAfter } = placed;
  const width = (last - first + 1) * dayWidth - 2;
  const resizable = width >= MIN_RESIZABLE_WIDTH;
  const current = useIsCurrentResult('project', project.id);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const days = event.key === 'ArrowRight' ? KEY_STEP_DAYS : -KEY_STEP_DAYS;
    if (event.shiftKey) {
      onChange({ endDate: resizeTask(project, 'end', days).endDate });
    } else {
      const { startDate, endDate } = moveTask(project, days);
      onChange({ startDate, endDate });
    }
  };

  const handle = (edge: 'start' | 'end') => (
    <span
      aria-hidden="true"
      onPointerDown={(event) => onPointerDown(event, edge)}
      className={`absolute inset-y-0 z-10 flex w-2.5 cursor-ew-resize items-center justify-center hover:bg-current/15 ${
        edge === 'start' ? 'left-0' : 'right-0'
      }`}
    >
      <span className="h-3 w-0.5 rounded-full bg-current opacity-0 group-hover/bar:opacity-40" />
    </span>
  );

  return (
    <button
      type="button"
      id={projectBarId(project.id)}
      aria-label={[
        project.title,
        `dal ${formatDateToIT(project.startDate)} al ${formatDateToIT(project.endDate)}`,
        PROJECT_STATUS_LABELS[project.status],
        project.owner ? `responsabile ${project.owner}` : null,
      ]
        .filter(Boolean)
        .join(', ')}
      aria-describedby={describedBy}
      title={`${project.title}\n${formatDateToIT(project.startDate)} → ${formatDateToIT(project.endDate)}`}
      onPointerDown={(event) => onPointerDown(event, 'move')}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      style={{
        ...taskColorStyle(project.colorId),
        left: first * dayWidth + 1,
        width: Math.max(width, 6),
        top,
        height,
      }}
      // Clipped rather than hidden: a hidden overflow would keep the title from sticking.
      className={`group/bar pointer-events-auto absolute flex cursor-grab items-center overflow-clip border-2 px-2 text-left text-xs font-semibold active:cursor-grabbing in-data-compact:px-1 ${
        continuesBefore ? 'rounded-l-none border-l-0' : 'rounded-l-xs'
      } ${continuesAfter ? 'rounded-r-none border-r-0' : 'rounded-r-xs'} ${
        dragging ? 'z-30 opacity-90 shadow-xl ring-2 ring-fg' : 'z-10 shadow-xs hover:shadow-md'
      } ${current ? `z-20 ${CURRENT_RESULT}` : ''}`}
    >
      {resizable && !continuesBefore && handle('start')}
      {/* The title stays in view while the start of a long bar scrolls past the left edge. */}
      <span className="sticky left-[calc(var(--gantt-label-width)+6px)] flex max-w-full min-w-0 items-center gap-1">
        <ProjectStatusMark status={project.status} iconOnly />
        <span className="truncate">
          <Highlight text={project.title} />
        </span>
      </span>
      {resizable && !continuesAfter && handle('end')}
    </button>
  );
}
