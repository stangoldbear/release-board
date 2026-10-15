import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { describeEffort, moveAssignment } from '../../domain/assignments';
import type { WorkSchedule } from '../../domain/assignments';
import type { DateRange } from '../../domain/schedule';
import type { TaskColorId } from '../../domain/colors';
import type { Assignment } from '../../domain/types';
import { useDateFormat, useFormatDate } from '../../shared/dateFormat';
import { diffDays, formatDate } from '../../utils/dateUtils';
import type { DateFormat } from '../../utils/dateUtils';
import { Tooltip } from '../../shared/ui/Tooltip';
import { taskColorStyle } from '../../themes';
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

/** Bars narrower than this have no handle on their edge: the whole bar moves. */
const MIN_RESIZABLE_WIDTH = 24;

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
  /** The row of the person: the bar takes the clicks and the drags over all of it. */
  height: number;
  /** The bar that shows, across the middle of the row. */
  barHeight: number;
  /** The bar has a border and carries the name and the days, at the Team level. */
  labeled: boolean;
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
  /** The element id, when the bar is drawn a second time, as in the part «Persone». */
  elementId?: string;
  /** What the bar says, in place of the name of its person: the title of its project. */
  name?: string;
  /** The beginning of its name for a screen reader, when the words on the bar are not enough. */
  ariaName?: string;
  /** Its color, in place of its team's: the color of its project. */
  colorId?: TaskColorId | null;
  /** Alt and the arrows up and down give the work to the person above or below. */
  onReassign?: (step: -1 | 1) => void;
}

/**
 * The work of a person on a project, a bar in the color of their team almost as tall as its row,
 * so that the bars of a team nearly touch, or the contingency of the project in grey, from the
 * first working day to the last, with the days away hatched; name and days are beside it in the
 * column, over it in a tip on the mouse and the focus, and, when `labeled`, on the bar itself,
 * in the colors and the border of the team. The whole height of the row takes the pointer. Click or Enter opens it, a double click types its days; with a mouse it moves by
 * dragging and its right edge, marked by a grip, changes the days; the arrows move its start by a
 * day, and with Shift by a week.
 */
export function WorkBar({
  item,
  range,
  dayWidth,
  height,
  barHeight,
  labeled,
  dragging,
  describedBy,
  ignoreClick,
  onPointerDown,
  onOpen,
  onEditDays,
  onChange,
  elementId,
  name = item.name,
  ariaName = name,
  colorId = item.colorId,
  onReassign,
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
    item.late ? ', oltre la deadline' : ''
  }`;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (onReassign && event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      onReassign(event.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.shiftKey ? 7 : 1;
    const { startDate } = moveAssignment(
      item,
      event.key === 'ArrowRight' ? step : -step,
      item.closures,
    );
    if (startDate !== item.startDate) onChange({ startDate });
  };

  // The color of the team fills the bar, with no edge around it (the owner's choice): the name of
  // the person is beside it in the column and over it in the tip, and the grip marks its end. With
  // its words on it, the bar takes the colors of the team as a task does, border and text.
  const fill = colorId
    ? labeled
      ? taskColorStyle(colorId)
      : { backgroundColor: `var(--rb-task-${colorId}-border)` }
    : undefined;
  const neutral = labeled ? 'border-line-strong bg-surface-strong text-fg' : 'bg-line-strong';

  return (
    <Tooltip text={`${name}: ${words}`}>
      <button
        type="button"
        id={elementId ?? workBarId(item)}
        aria-label={`${ariaName}: ${words}`}
        aria-describedby={describedBy}
        onPointerDown={(event) => {
          clicks.onPointerDown(event);
          onPointerDown(event, 'move');
        }}
        onClick={clicks.onClick}
        onDoubleClick={clicks.onDoubleClick}
        onKeyDown={handleKeyDown}
        style={{
          left: first * dayWidth + 1,
          width: Math.max(width, 6),
          top: `calc(50% - ${height / 2}px)`,
          height,
        }}
        className={`group/work pointer-events-auto absolute cursor-grab text-fg active:cursor-grabbing ${
          dragging ? 'z-[1000]' : 'z-10'
        }`}
      >
        <span
          aria-hidden="true"
          style={{ ...fill, height: barHeight }}
          className={`absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center overflow-clip ${
            labeled ? 'border text-xs leading-none font-semibold whitespace-nowrap' : ''
          } ${colorId ? '' : neutral} ${continuesBefore ? 'rounded-l-none' : 'rounded-l-xs'} ${
            continuesAfter ? 'rounded-r-none' : 'rounded-r-xs'
          } ${
            dragging
              ? 'opacity-90 shadow-xl ring-2 ring-fg'
              : 'group-hover/work:ring-2 group-hover/work:ring-link/40'
          }`}
        >
          {schedule.absences.map((absence) => {
            const from = Math.max(first, diffDays(range.start, absence.start));
            const to = Math.min(last, diffDays(range.start, absence.end));
            return (
              <span
                key={absence.start}
                title={`Assente dal ${formatDate(absence.start)} al ${formatDate(absence.end)}`}
                style={{
                  ...ABSENCE_STRIPES,
                  left: (from - first) * dayWidth,
                  width: (to - from + 1) * dayWidth,
                }}
                className="absolute inset-y-0"
              />
            );
          })}
          {labeled && (
            // In view while the start of a long bar scrolls past the column of the names, on the
            // color of the bar over the days away; clear of the grip on the right.
            <span className="sticky left-[calc(var(--gantt-label-width)+4px)] z-[1] min-w-0 truncate bg-inherit pr-3 pl-1">
              {name}
              <span className="font-normal tabular-nums"> · {formatManDays(item.manDays)}</span>
            </span>
          )}
        </span>
        {resizable && !continuesAfter && (
          <span
            aria-hidden="true"
            onPointerDown={(event) => onPointerDown(event, 'end')}
            className="absolute inset-y-0 right-0 z-10 flex w-2.5 cursor-ew-resize items-center justify-center rounded-xs hover:bg-current/15"
          >
            {/*
              The grip that says the edge can be dragged, stronger under the mouse: a line in the
              color of the text with a halo in the color of the page, so that one of the two
              stands out on any bar, light or deep, in every theme.
            */}
            <span
              style={{ height: Math.min(10, barHeight - 2) }}
              className="w-0.5 rounded-full bg-current opacity-80 shadow-[0_0_0_1px_var(--color-surface)] group-hover/work:opacity-100"
            />
          </span>
        )}
      </button>
    </Tooltip>
  );
}
