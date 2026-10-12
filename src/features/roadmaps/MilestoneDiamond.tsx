import type { FocusEvent, KeyboardEvent, PointerEvent } from 'react';
import { moveMilestone } from '../../domain/milestones';
import type { MilestoneChanges } from '../../domain/milestones';
import type { DateRange } from '../../domain/schedule';
import type { Milestone } from '../../domain/types';
import { useFormatDate } from '../../shared/dateFormat';
import { CURRENT_RESULT, Highlight, useIsCurrentResult } from '../../shared/ui/Highlight';
import { taskColorStyle } from '../../themes';
import { diffDays } from '../../utils/dateUtils';

/** The element of a note on the timeline, to give it the focus. */
export function milestoneElementId(milestoneId: string): string {
  return `milestone-rect-${milestoneId}`;
}

/** The props of a trigger of the card of details: the mouse resting on it, or the focus. */
export interface HoverTrigger {
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: () => void;
}

/** What every diamond of the roadmap shares: the drag, the card and the commands. */
export interface MilestoneTools {
  /** The note being dragged, as it would be after the drag; null when none. */
  dragged: Milestone | null;
  startDrag: (event: PointerEvent, milestone: Milestone) => void;
  /** True for the click that ends a drag, which must not open the note. */
  ignoreClick: () => boolean;
  hover: (milestone: Milestone) => HoverTrigger;
  /** Id of the text that explains the keyboard commands. */
  helpId: string;
  onOpen: (milestone: Milestone) => void;
  onChange: (milestoneId: string, changes: MilestoneChanges) => void;
  /** The title of a project, for the name of a note of a project. */
  projectTitleOf: (projectId: string) => string | undefined;
}

interface MilestoneDiamondProps {
  milestone: Milestone;
  range: DateRange;
  dayWidth: number;
  /** The vertical middle of the diamond, as a CSS length. */
  top: string;
  tools: MilestoneTools;
}

/**
 * A note on a day: a diamond in its color, with its title beside it. Click or Enter opens it;
 * with a mouse it moves by dragging; the arrows move it by a day, and with Shift by a week. The
 * text is in the card that opens when the mouse rests on it or it has the focus.
 */
export function MilestoneDiamond({
  milestone,
  range,
  dayWidth,
  top,
  tools,
}: MilestoneDiamondProps) {
  const formatDate = useFormatDate();
  const shown = tools.dragged?.id === milestone.id ? tools.dragged : milestone;
  const current = useIsCurrentResult('milestone', milestone.id);
  if (shown.date < range.start || shown.date > range.end) return null;
  const left = (diffDays(range.start, shown.date) + 0.5) * dayWidth;
  const projectTitle = milestone.projectId ? tools.projectTitleOf(milestone.projectId) : undefined;
  const words = [
    `Nota sulla timeline «${milestone.title}»`,
    formatDate(shown.date),
    projectTitle ? `progetto «${projectTitle}»` : null,
    milestone.remind ? 'con avviso' : null,
  ]
    .filter(Boolean)
    .join(', ');

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.shiftKey ? 7 : 1;
    tools.onChange(milestone.id, {
      date: moveMilestone(milestone, event.key === 'ArrowRight' ? step : -step).date,
    });
  };

  return (
    <button
      type="button"
      id={milestoneElementId(milestone.id)}
      aria-label={words}
      aria-describedby={tools.helpId}
      title={`${milestone.title}\n${formatDate(shown.date)}${milestone.body ? `\n${milestone.body}` : ''}`}
      {...tools.hover(milestone)}
      onPointerDown={(event) => tools.startDrag(event, milestone)}
      onClick={() => {
        if (!tools.ignoreClick()) tools.onOpen(milestone);
      }}
      onKeyDown={handleKeyDown}
      style={{ left, top }}
      // Above the bars of the row, which stop at 10: a note marks a day over the work.
      className={`pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab items-center gap-1.5 rounded-sm text-left active:cursor-grabbing ${
        tools.dragged?.id === milestone.id ? 'z-[1000]' : 'z-[450]'
      } ${current ? `z-[500] ${CURRENT_RESULT}` : ''}`}
    >
      <span
        aria-hidden="true"
        style={taskColorStyle(milestone.colorId)}
        className="block h-3.5 w-3.5 shrink-0 rotate-45 rounded-[2px] border-2 shadow-xs"
      />
      <span className="rounded-sm border border-line bg-surface px-1 text-xs font-semibold whitespace-nowrap text-fg">
        <Highlight text={milestone.title} />
      </span>
    </button>
  );
}

/** The diamonds of some notes, over the days of a row. */
export function MilestoneLayer({
  milestones,
  range,
  dayWidth,
  top,
  tools,
}: {
  milestones: readonly Milestone[];
  range: DateRange;
  dayWidth: number;
  top: string;
  tools: MilestoneTools;
}) {
  return milestones.map((milestone) => (
    <MilestoneDiamond
      key={milestone.id}
      milestone={milestone}
      range={range}
      dayWidth={dayWidth}
      top={top}
      tools={tools}
    />
  ));
}
