import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { TreePalm } from 'lucide-react';
import { describeEffort, moveAssignment } from '../../domain/assignments';
import type { AssignmentChanges, WorkSchedule } from '../../domain/assignments';
import type { DateRange } from '../../domain/schedule';
import type { Assignment, Stakeholder, Team } from '../../domain/types';
import { taskColorStyle } from '../../themes';
import { diffDays, formatDateToIT } from '../../utils/dateUtils';

/** The element of the bar of an assignment, to give it the focus. */
export function assignmentBarId(assignmentId: string): string {
  return `assignment-rect-${assignmentId}`;
}

/** A hatched day away is wide enough for its icon from this width. */
const MIN_ICON_WIDTH = 28;

/**
 * Red and pink oblique stripes over the days a person is away. Drawn with the danger colors,
 * which every theme keeps readable; the words are in the name of the bar.
 */
export const ABSENCE_STRIPES: CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(135deg, var(--color-danger-soft) 0 5px, var(--color-danger) 5px 8px)',
};

/** "15 giorni (3 settimane), dal 15/12/2026 al 04/02/2027, assente dal 20/12/2026 al 20/01/2027". */
export function describeSchedule(assignment: Assignment, schedule: WorkSchedule): string {
  const away = schedule.absences.map(
    (absence) => `assente dal ${formatDateToIT(absence.start)} al ${formatDateToIT(absence.end)}`,
  );
  return [
    describeEffort(assignment.manDays),
    `dal ${formatDateToIT(schedule.start)} al ${formatDateToIT(schedule.end)}`,
    ...away,
    schedule.truncated ? 'oltre il limite dei giorni' : null,
  ]
    .filter(Boolean)
    .join(', ');
}

interface AssignmentBarProps {
  assignment: Assignment;
  schedule: WorkSchedule;
  /** The person and their team, when the configuration still knows them. */
  stakeholder: Stakeholder | null;
  team: Team | null;
  /** The days the roadmap holds: the bar is cut to them. */
  range: DateRange;
  dayWidth: number;
  height: number;
  /** The words on one line, out of the bar when longer, rather than cut. */
  overflowTitle?: boolean;
  dragging: boolean;
  /** Id of the text that explains the keyboard commands. */
  describedBy: string;
  onPointerDown: (event: PointerEvent) => void;
  onOpen: () => void;
  onChange: (changes: AssignmentChanges) => void;
}

/**
 * The work of a person on a project, in the color of their team, from the first working day to
 * the last, with the days they are away hatched. Click or Enter opens it; with a mouse it moves by
 * dragging; the arrows move its start by a day, and with Shift by a week.
 */
export function AssignmentBar({
  assignment,
  schedule,
  stakeholder,
  team,
  range,
  dayWidth,
  height,
  overflowTitle = false,
  dragging,
  describedBy,
  onPointerDown,
  onOpen,
  onChange,
}: AssignmentBarProps) {
  if (schedule.start > range.end || schedule.end < range.start) return null;
  const first = Math.max(0, diffDays(range.start, schedule.start));
  const last = Math.min(diffDays(range.start, range.end), diffDays(range.start, schedule.end));
  const continuesBefore = schedule.start < range.start;
  const continuesAfter = schedule.end > range.end;
  const width = (last - first + 1) * dayWidth - 2;
  const name = stakeholder?.name ?? 'Persona non più in configurazione';
  const words = describeSchedule(assignment, schedule);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.shiftKey ? 7 : 1;
    const { startDate } = moveAssignment(assignment, event.key === 'ArrowRight' ? step : -step);
    if (startDate !== assignment.startDate) onChange({ startDate });
  };

  return (
    <button
      type="button"
      id={assignmentBarId(assignment.id)}
      aria-label={`${name}: ${words}`}
      aria-describedby={describedBy}
      title={`${name}\n${words}`}
      onPointerDown={onPointerDown}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      style={{
        ...(team ? taskColorStyle(team.colorId) : undefined),
        left: first * dayWidth + 1,
        width: Math.max(width, 6),
        top: `calc(50% - ${height / 2}px)`,
        height,
      }}
      className={`pointer-events-auto absolute flex cursor-grab items-center border-2 text-left text-xs active:cursor-grabbing ${
        overflowTitle ? 'overflow-visible' : 'overflow-clip'
      } ${
        team ? '' : 'border-line-strong bg-surface text-fg'
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
            title={`Assente dal ${formatDateToIT(absence.start)} al ${formatDateToIT(absence.end)}`}
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
        <span className="font-semibold">{name}</span>
        <span className="tabular-nums">
          {' '}
          · {assignment.manDays} {assignment.manDays === 1 ? 'g' : 'gg'}
        </span>
      </span>
    </button>
  );
}
