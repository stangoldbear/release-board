import type { KeyboardEvent, PointerEvent } from 'react';
import type { TaskColorId } from '../../domain/colors';
import { PROJECT_STATUS_LABELS } from '../../domain/projects';
import type { ProjectWithEnd } from '../../domain/projects';
import type { ProjectSpan } from '../../domain/projectSpan';
import type { DateRange, PlacedTask } from '../../domain/schedule';
import { useFormatDate } from '../../shared/dateFormat';
import { CURRENT_RESULT, Highlight, useIsCurrentResult } from '../../shared/ui/Highlight';
import { taskColorStyle } from '../../themes';
import { diffDays } from '../../utils/dateUtils';
import { fadedParts, formatManDays } from './barRendering';
import type { Lanes, WorkItem } from './barRendering';
import { ProjectStatusMark } from './projectUi';
import { useClickOrDoubleClick } from './useClickOrDoubleClick';

/** The arrows move a project by a week: a day is too little to see on a roadmap. */
const KEY_STEP_DAYS = 7;

/** The element of a project's bar, to give it the focus. */
export function projectBarId(projectId: string): string {
  return `project-rect-${projectId}`;
}

/** Oblique dashes over the days of a project without work, so that the fading is not the only cue. */
export const FADED_STRIPES =
  'repeating-linear-gradient(135deg, transparent 0 6px, color-mix(in srgb, currentColor 22%, transparent) 6px 7.5px)';

interface ProjectBarProps {
  /** The project, with its effective end, cut to the days the roadmap holds. */
  placed: PlacedTask<ProjectWithEnd>;
  span: ProjectSpan;
  /** The bars of the work, in the order of the teams: a lane each inside the bar, if any. */
  work: WorkItem[];
  /** The color of the bar: from the value of a field, or the project's own. */
  colorId: TaskColorId;
  range: DateRange;
  dayWidth: number;
  /** Pixels from the top of the row, or a CSS length such as one that centers the bar. */
  top: number | string;
  /** The line of the title, and the whole bar: taller with the lanes inside. */
  titleHeight: number;
  /** Pixels, or a CSS length such as one that reaches down around the rows of the people. */
  height: number | string;
  /** The slivers under the title, one for each bar of the work; null for none. */
  lanes: Lanes | null;
  /** The title on one line, out of the bar when longer, rather than cut. */
  overflowTitle: boolean;
  dragging: boolean;
  /** Id of the text that explains the keyboard commands. */
  describedBy: string;
  /** True for the click that ends a drag, which must not open the project. */
  ignoreClick: () => boolean;
  onPointerDown: (event: PointerEvent) => void;
  onOpen: () => void;
  /** Moves the project with the work of its team by some days. */
  onMove: (days: number) => void;
  /** Moves the project up or down by a row in the order of the members. */
  onMoveRow: (delta: -1 | 1) => void;
}

/**
 * A project on the roadmap, from its start to the end of the work of its team: solid where the
 * team works, faded and dashed where nobody does, with the titles alone a sliver for each bar of
 * the work under the title. Click or Enter opens it; with a mouse it moves by dragging its title,
 * with the work of its team; the slivers do not move on their own. The arrows move it by a week.
 */
export function ProjectBar({
  placed,
  span,
  work,
  colorId,
  range,
  dayWidth,
  top,
  titleHeight,
  height,
  lanes,
  overflowTitle,
  dragging,
  describedBy,
  ignoreClick,
  onPointerDown,
  onOpen,
  onMove,
  onMoveRow,
}: ProjectBarProps) {
  const formatDate = useFormatDate();
  const clicks = useClickOrDoubleClick(onOpen, undefined, ignoreClick);
  const { task: project, first, last, continuesBefore, continuesAfter } = placed;
  const width = (last - first + 1) * dayWidth - 2;
  const current = useIsCurrentResult('project', project.id);
  const days = span.totalManDays > 0 ? formatManDays(span.totalManDays) : null;
  // Inside the bar, from its left border: a day of the roadmap to pixels.
  const offset = (day: string) => (diffDays(range.start, day) - first) * dayWidth - 1;
  const spanWidth = (start: string, end: string) => (diffDays(start, end) + 1) * dayWidth - 2;
  const people = work.map((item) => `${item.name} · ${formatManDays(item.manDays)}`);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      onMoveRow(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    onMove(event.key === 'ArrowRight' ? KEY_STEP_DAYS : -KEY_STEP_DAYS);
  };

  return (
    <button
      type="button"
      id={projectBarId(project.id)}
      data-project-menu
      aria-label={[
        project.title,
        `dal ${formatDate(project.startDate)} al ${formatDate(project.endDate)}`,
        days ? `${days.replace(/ gg?$/, '')} giorni uomo` : null,
        PROJECT_STATUS_LABELS[project.status],
        project.owner ? `responsabile ${project.owner}` : null,
        project.deadline ? `deadline il ${formatDate(project.deadline)}` : null,
        span.late ? 'oltre la deadline' : null,
      ]
        .filter(Boolean)
        .join(', ')}
      aria-describedby={describedBy}
      title={[
        project.title,
        `${formatDate(project.startDate)} → ${formatDate(project.endDate)}${
          days ? ` · ${days.replace(/ gg?$/, '')} giorni uomo` : ''
        }`,
        project.deadline
          ? `Deadline ${formatDate(project.deadline)}${span.late ? ', superata' : ''}`
          : null,
        ...people,
      ]
        .filter(Boolean)
        .join('\n')}
      onPointerDown={(event) => {
        clicks.onPointerDown(event);
        onPointerDown(event);
      }}
      onClick={clicks.onClick}
      onDoubleClick={clicks.onDoubleClick}
      onKeyDown={handleKeyDown}
      style={{
        ...taskColorStyle(colorId),
        left: first * dayWidth + 1,
        width: Math.max(width, 6),
        top,
        height,
      }}
      // Clipped rather than hidden: a hidden overflow would keep the title from sticking.
      className={`group/bar pointer-events-auto absolute flex cursor-grab items-start border-2 px-2 text-left text-xs font-semibold active:cursor-grabbing in-data-compact:px-1 ${
        overflowTitle ? 'overflow-visible' : 'overflow-clip'
      } ${
        continuesBefore ? 'rounded-l-none border-l-0' : 'rounded-l-xs'
      } ${continuesAfter ? 'rounded-r-none border-r-0' : 'rounded-r-xs'} ${
        dragging ? 'z-[1000] opacity-90 shadow-xl ring-2 ring-fg' : 'z-10 shadow-xs hover:shadow-md'
      } ${current ? `z-[500] ${CURRENT_RESULT}` : ''}`}
    >
      {/* The days without work: the surface shows through, under oblique dashes. */}
      {fadedParts(span).map((part) => (
        <span
          key={part.start}
          aria-hidden="true"
          style={{
            left: offset(part.start),
            width: spanWidth(part.start, part.end),
            backgroundImage: FADED_STRIPES,
          }}
          className="pointer-events-none absolute inset-y-0 bg-surface/60"
        />
      ))}
      {/* The title stays in view while the start of a long bar scrolls past the left edge. */}
      <span
        style={{ height: titleHeight - 4 }}
        className={`sticky left-[calc(var(--gantt-label-width)+6px)] z-[2] flex items-center gap-1 ${
          overflowTitle ? 'max-w-none' : 'max-w-full min-w-0'
        }`}
      >
        <ProjectStatusMark status={project.status} iconOnly />
        <span className={overflowTitle ? 'whitespace-nowrap' : 'truncate'}>
          <Highlight text={project.title} />
        </span>
        {days && <span className="shrink-0 font-normal tabular-nums opacity-80">· {days}</span>}
      </span>
      {lanes &&
        work.map((item, index) => (
          <span
            key={`${item.kind}-${item.id}`}
            aria-hidden="true"
            title={`${item.name} · ${formatManDays(item.manDays)}`}
            // A lane is part of the picture of the project: it does not move on its own.
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              ...(item.colorId ? taskColorStyle(item.colorId) : undefined),
              left: offset(item.schedule.start),
              width: spanWidth(item.schedule.start, item.schedule.end),
              top: titleHeight - 2 + index * (lanes.height + lanes.gap),
              height: lanes.height,
            }}
            className={`pointer-events-auto absolute z-[1] cursor-default rounded-[2px] border ${
              item.colorId ? '' : 'border-line-strong bg-surface-strong'
            }`}
          />
        ))}
    </button>
  );
}
