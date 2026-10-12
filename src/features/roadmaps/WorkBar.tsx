import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { TreePalm, TriangleAlert } from 'lucide-react';
import { describeEffort, moveAssignment } from '../../domain/assignments';
import type { WorkSchedule } from '../../domain/assignments';
import type { DateRange } from '../../domain/schedule';
import type { Assignment } from '../../domain/types';
import { useDateFormat, useFormatDate } from '../../shared/dateFormat';
import { taskColorStyle } from '../../themes';
import { diffDays, formatDate } from '../../utils/dateUtils';
import type { DateFormat } from '../../utils/dateUtils';
import { formatManDays } from './barRendering';
import type { WorkItem } from './barRendering';
import { useClickOrDoubleClick } from './useClickOrDoubleClick';
import type { WorkChanges, WorkDragKind } from './useWorkDrag';

/** The element of the bar of an assignment, to give it the focus. */
export function assignmentBarId(assignmentId: string): string {
  return `assignment-rect-${assignmentId}`;
}

/** The element of a bar of work: an assignment, or the contingency of a project. */
export function workBarId(item: Pick<WorkItem, 'kind' | 'id'>): string {
  return item.kind === 'assignment' ? assignmentBarId(item.id) : `contingency-rect-${item.id}`;
}

/** A hatched day away is wide enough for its icon from this width. */
const MIN_ICON_WIDTH = 28;
/** Bars narrower than this have no handle on their edge: the whole bar moves. */
const MIN_RESIZABLE_WIDTH = 24;
/** Bars narrower than this have no triangle beside their words; their name still says they are late. */
const MIN_MARK_WIDTH = 72;

/**
 * Red and pink oblique stripes over the days a person is away. Drawn with the danger colors,
 * which every theme keeps readable; the words are in the name of the bar.
 */
export const ABSENCE_STRIPES: CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(135deg, var(--color-danger-soft) 0 5px, var(--color-danger) 5px 8px)',
};

/** "15 giorni (3 settimane), dal 15-12-26 al 04-02-27, assente dal 20-12-26 al 20-01-27". */
export function describeSchedule(
  assignment: Pick<Assignment, 'manDays'>,
  schedule: WorkSchedule,
  dateFormat: DateFormat,
): string {
  const away = schedule.absences.map(
    (absence) =>
      `assente dal ${formatDate(absence.start, dateFormat)} al ${formatDate(absence.end, dateFormat)}`,
  );
  return [
    describeEffort(assignment.manDays),
    `dal ${formatDate(schedule.start, dateFormat)} al ${formatDate(schedule.end, dateFormat)}`,
    ...away,
    schedule.truncated ? 'oltre il limite dei giorni' : null,
  ]
    .filter(Boolean)
    .join(', ');
}

interface WorkBarProps {
  item: WorkItem;
  /** The days the roadmap holds: the bar is cut to them. */
  range: DateRange;
  dayWidth: number;
  height: number;
  /** The words on one line, out of the bar when longer, rather than cut. */
  overflowTitle?: boolean;
  dragging: boolean;
  /** Id of the text that explains the keyboard commands. */
  describedBy: string;
  /** True for the click that ends a drag, which must not open the bar. */
  ignoreClick: () => boolean;
  onPointerDown: (event: PointerEvent, kind: WorkDragKind) => void;
  onOpen: () => void;
  /** A double click: the days typed in place. */
  onEditDays: () => void;
  onChange: (changes: WorkChanges) => void;
}

/**
 * The work of a person on a project, in the color of their team, or the contingency of the
 * project in grey, from the first working day to the last, with the days away hatched. Click or
 * Enter opens it, a double click types its days; with a mouse it moves by dragging and its right
 * edge changes the days; the arrows move its start by a day, and with Shift by a week.
 */
export function WorkBar({
  item,
  range,
  dayWidth,
  height,
  overflowTitle = false,
  dragging,
  describedBy,
  ignoreClick,
  onPointerDown,
  onOpen,
  onEditDays,
  onChange,
}: WorkBarProps) {
  const dateFormat = useDateFormat();
  const formatDate = useFormatDate();
  const clicks = useClickOrDoubleClick(onOpen, onEditDays, ignoreClick);
  const { schedule } = item;
  if (schedule.start > range.end || schedule.end < range.start) return null;
  const first = Math.max(0, diffDays(range.start, schedule.start));
  const last = Math.min(diffDays(range.start, range.end), diffDays(range.start, schedule.end));
  const continuesBefore = schedule.start < range.start;
  const continuesAfter = schedule.end > range.end;
  const width = (last - first + 1) * dayWidth - 2;
  const resizable = width >= MIN_RESIZABLE_WIDTH;
  const words = `${describeSchedule(item, schedule, dateFormat)}${
    item.late ? ', oltre la hard deadline' : ''
  }`;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.shiftKey ? 7 : 1;
    const { startDate } = moveAssignment(item, event.key === 'ArrowRight' ? step : -step);
    if (startDate !== item.startDate) onChange({ startDate });
  };

  return (
    <button
      type="button"
      id={workBarId(item)}
      aria-label={`${item.name}: ${words}`}
      aria-describedby={describedBy}
      title={`${item.name}\n${words}`}
      onPointerDown={(event) => {
        clicks.onPointerDown(event);
        onPointerDown(event, 'move');
      }}
      onClick={clicks.onClick}
      onDoubleClick={clicks.onDoubleClick}
      onKeyDown={handleKeyDown}
      style={{
        ...(item.colorId ? taskColorStyle(item.colorId) : undefined),
        left: first * dayWidth + 1,
        width: Math.max(width, 6),
        top: `calc(50% - ${height / 2}px)`,
        height,
      }}
      className={`group/work pointer-events-auto absolute flex cursor-grab items-center border-2 text-left text-xs active:cursor-grabbing ${
        overflowTitle ? 'overflow-visible' : 'overflow-clip'
      } ${
        item.colorId ? '' : 'border-line-strong bg-surface-strong text-fg'
      } ${continuesBefore ? 'rounded-l-none border-l-0' : 'rounded-l-xs'} ${
        continuesAfter ? 'rounded-r-none border-r-0' : 'rounded-r-xs'
      } ${dragging ? 'z-[1000] opacity-90 shadow-xl ring-2 ring-fg' : 'z-10 shadow-xs hover:shadow-md'}`}
    >
      {schedule.absences.map((absence) => {
        const from = Math.max(first, diffDays(range.start, absence.start));
        const to = Math.min(last, diffDays(range.start, absence.end));
        const stripeWidth = (to - from + 1) * dayWidth;
        return (
          <span
            key={absence.start}
            aria-hidden="true"
            title={`Assente dal ${formatDate(absence.start)} al ${formatDate(absence.end)}`}
            style={{ ...ABSENCE_STRIPES, left: (from - first) * dayWidth - 1, width: stripeWidth }}
            className="absolute inset-y-0 flex items-center justify-center text-danger"
          >
            {stripeWidth >= MIN_ICON_WIDTH && (
              <span className="rounded-full bg-surface p-0.5">
                <TreePalm className="h-3 w-3" />
              </span>
            )}
          </span>
        );
      })}
      {/* The words stay in view while the start of a long bar scrolls past the left edge. */}
      {/* One line cut as a whole: a narrow bar shows the start of the name, not a clipped glyph. */}
      <span
        className={`sticky left-[calc(var(--gantt-label-width)+6px)] z-10 block px-1.5 in-data-compact:px-1 ${
          overflowTitle ? 'max-w-none whitespace-nowrap' : 'max-w-full min-w-0 truncate'
        }`}
      >
        <span className="font-semibold">{item.name}</span>
        <span className="tabular-nums"> · {formatManDays(item.manDays)}</span>
      </span>
      {item.late && width >= MIN_MARK_WIDTH && (
        <span
          aria-hidden="true"
          title="Oltre la hard deadline"
          className="absolute top-1/2 right-3 z-10 -translate-y-1/2 rounded-full bg-surface p-px text-danger"
        >
          <TriangleAlert className="h-3 w-3" />
        </span>
      )}
      {resizable && !continuesAfter && (
        <span
          aria-hidden="true"
          onPointerDown={(event) => onPointerDown(event, 'end')}
          className="absolute inset-y-0 right-0 z-10 flex w-2.5 cursor-ew-resize items-center justify-center hover:bg-current/15"
        >
          <span className="h-3 w-0.5 rounded-full bg-current opacity-0 group-hover/work:opacity-40" />
        </span>
      )}
    </button>
  );
}
