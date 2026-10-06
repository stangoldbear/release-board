import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { TASK_STATUS_LABELS } from '../../domain/plan';
import type { TaskChanges } from '../../domain/plan';
import { moveTask, resizeTask } from '../../domain/schedule';
import type { PlacedTask } from '../../domain/schedule';
import type { TaskItem } from '../../domain/types';
import { CURRENT_RESULT, Highlight, useIsCurrentResult } from '../../shared/ui/Highlight';
import { taskColorStyle } from '../../themes';
import { daysBetween, formatDateToIT } from '../../utils/dateUtils';
import { clampLines } from './timelineLayout';
import type { DragKind } from './useTaskDrag';

/** Bars narrower than this have no resize handles: the whole bar moves. */
const MIN_RESIZABLE_WIDTH = 40;
/** Bars at least this wide, and two lines tall, show assignee and length under the title. */
const MIN_DETAILED_WIDTH = 100;

/** The element of a task's bar, to give it the focus or bring it into view. */
export function taskBarId(taskId: string): string {
  return `task-rect-${taskId}`;
}

interface TaskBarProps {
  placed: PlacedTask<TaskItem>;
  dayWidth: number;
  top: number;
  height: number;
  /** Lines of text that fit in the bar. */
  lines: number;
  /** The title on one line, out of the bar when longer, rather than wrapped or cut. */
  overflowTitle: boolean;
  /** Bars that start closer to today are drawn over the others: see stackingOrder. */
  stacking: number;
  dragging: boolean;
  /** Id of the text that explains the keyboard commands. */
  describedBy: string;
  onPointerDown: (event: PointerEvent, kind: DragKind) => void;
  onOpen: () => void;
  onContextMenu: (x: number, y: number) => void;
  onChange: (changes: TaskChanges) => void;
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * A task on the timeline. Click or Enter opens it; it can be dragged with a mouse, resized from its
 * edges, and moved with the arrow keys (Shift+arrows move the end date).
 */
export function TaskBar({
  placed,
  dayWidth,
  top,
  height,
  lines,
  overflowTitle,
  stacking,
  dragging,
  describedBy,
  onPointerDown,
  onOpen,
  onContextMenu,
  onChange,
}: TaskBarProps) {
  const { task, first, last, continuesBefore, continuesAfter } = placed;
  const width = (last - first + 1) * dayWidth - 4;
  const resizable = width >= MIN_RESIZABLE_WIDTH;
  const detailed = width >= MIN_DETAILED_WIDTH && lines >= 2;
  // The details take the last line.
  const titleLines = detailed ? lines - 1 : lines;
  const length = daysBetween(task.startDate, task.endDate);
  const period = `dal ${formatDateToIT(task.startDate)} al ${formatDateToIT(task.endDate)}`;
  const current = useIsCurrentResult('task', task.id);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const days = event.key === 'ArrowRight' ? 1 : -1;
    if (event.shiftKey) {
      onChange({ endDate: resizeTask(task, 'end', days).endDate });
    } else {
      const { startDate, endDate } = moveTask(task, days);
      onChange({ startDate, endDate });
    }
  };

  const handle = (edge: 'start' | 'end') => (
    <span
      aria-hidden="true"
      onPointerDown={(event) => onPointerDown(event, edge)}
      className={`absolute inset-y-0 flex w-2.5 cursor-ew-resize items-center justify-center hover:bg-current/15 ${
        edge === 'start' ? 'left-0' : 'right-0'
      }`}
    >
      <span className="h-3 w-0.5 rounded-full bg-current opacity-0 group-hover/bar:opacity-40" />
    </span>
  );

  return (
    <button
      type="button"
      id={taskBarId(task.id)}
      aria-label={`${oneLine(task.title)}, ${period}, ${TASK_STATUS_LABELS[task.status]}`}
      aria-describedby={describedBy}
      title={`${task.title}\n${formatDateToIT(task.startDate)} → ${formatDateToIT(task.endDate)}`}
      onPointerDown={(event) => onPointerDown(event, 'move')}
      onClick={onOpen}
      onContextMenu={(event) => {
        event.preventDefault();
        // Opened from the keyboard, the event has no pointer position: use the bar's.
        const rect = event.currentTarget.getBoundingClientRect();
        onContextMenu(event.clientX || rect.left, event.clientY || rect.bottom);
      }}
      onKeyDown={handleKeyDown}
      style={
        {
          ...taskColorStyle(task.colorId),
          left: first * dayWidth + 2,
          width: Math.max(width, 6),
          top,
          height,
          // The bar being dragged is above everything, then the result in view, then by closeness.
          '--bar-z': dragging ? 1000 : current ? 500 : stacking,
        } as CSSProperties
      }
      // Clipped rather than hidden: a hidden overflow would keep the title from sticking. With the
      // titles on one line nothing is clipped, and the bar under the pointer or the focus comes up.
      className={`group/bar pointer-events-auto absolute flex cursor-grab flex-col justify-center border-2 text-left active:cursor-grabbing z-(--bar-z) hover:z-[600] focus-visible:z-[600] ${
        overflowTitle ? 'overflow-visible' : 'overflow-clip'
      } ${
        width < MIN_DETAILED_WIDTH ? 'px-1 in-data-compact:px-0.5' : 'px-2.5 in-data-compact:px-1.5'
      } ${
        task.borderStyle === 'dashed' ? 'border-dashed' : 'border-solid'
      } ${continuesBefore ? 'rounded-l-none border-l-0' : 'rounded-l-xs'} ${
        continuesAfter ? 'rounded-r-none border-r-0' : 'rounded-r-xs'
      } ${dragging ? 'opacity-90 shadow-xl ring-2 ring-fg' : 'shadow-xs hover:shadow-md'} ${
        current ? CURRENT_RESULT : ''
      }`}
    >
      {resizable && !continuesBefore && handle('start')}
      {/* The title stays in view while the start of a long bar scrolls past the left edge. */}
      <span
        className={`sticky left-[calc(var(--gantt-label-width)+6px)] block text-xs font-semibold ${
          overflowTitle
            ? 'w-max max-w-none rounded-r-xs bg-inherit pr-1.5 whitespace-nowrap'
            : `w-fit max-w-full wrap-break-word hyphens-auto ${titleLines === 1 ? 'truncate' : ''}`
        }`}
        style={overflowTitle || titleLines === 1 ? undefined : clampLines(titleLines)}
      >
        <Highlight text={task.title} />
      </span>
      {detailed && (
        <span className="flex items-center gap-1.5 text-xs">
          {task.assignee && (
            <span className="truncate">
              <Highlight text={task.assignee} />
            </span>
          )}
          {length > 1 && <span className="ml-auto shrink-0 tabular-nums">{length} g</span>}
        </span>
      )}
      {resizable && !continuesAfter && handle('end')}
    </button>
  );
}
