import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { TaskColorId } from '../../domain/colors';
import {
  laneCount,
  markCount,
  placeMarks,
  shownKinds,
  timelineNoteMarks,
} from '../../domain/timelineNotes';
import type { TimelineNoteKind, TimelineNotesLook } from '../../domain/timelineNotes';
import type { DailyNotes, Memo, Milestone } from '../../domain/types';
import { useFormatDate } from '../../shared/dateFormat';
import { useStableCallback } from '../../shared/useStableCallback';
import { LABEL_CELL } from '../calendar/timelineLayout';
import { NoteMarks } from '../notes/NoteMarks';
import type { NoteMarkActions } from '../notes/NoteMarks';
import { DiamondSymbol, FlagSymbol, PostitSymbol } from '../notes/noteSymbols';
import type { MilestoneTools } from '../roadmaps/MilestoneDiamond';
import { RowCells } from '../roadmaps/RowCells';
import type { TimelineGeometry } from './TimelineFrame';

/** Where the notes of the row come from, as the search keeps them. */
export interface TimelineNoteSources {
  dailyNotes: DailyNotes;
  /** The free notes the user sees, in the order of Notes. */
  memos: readonly Memo[];
  /** The notes on the timeline of no project. */
  milestones: readonly Milestone[];
}

/** The names of the lanes, in the column of the names. */
const LANE_NAMES: Record<TimelineNoteKind, string> = {
  dayNote: 'Next Releases',
  memos: 'Notes',
  milestone: 'Sulla timeline',
};

/** The symbol of a kind, in the column of the names: in the color of the kind, or neutral. */
export function KindSymbol({
  kind,
  look,
  size = 14,
}: {
  kind: TimelineNoteKind;
  look: TimelineNotesLook;
  size?: number;
}): ReactNode {
  const color = look.kinds[kind].color;
  const colorId: TaskColorId | undefined = color === 'own' ? undefined : color;
  if (kind === 'dayNote') return <FlagSymbol colorId={colorId} size={size} />;
  if (kind === 'memos') return <PostitSymbol colorIds={[colorId]} size={size} />;
  return <DiamondSymbol colorId={colorId} size={size - 2} />;
}

interface TimelineNotesRowProps {
  geometry: TimelineGeometry;
  look: TimelineNotesLook;
  sources: TimelineNoteSources;
  /** The color of the free notes without one, as Notes shows them. */
  paperColor: TaskColorId | undefined;
  actions: NoteMarkActions;
  tools: MilestoneTools;
  /** The height of the row with all the notes on one line. */
  lineHeight: number;
  /** The height of each line, with a line for each kind. */
  laneHeight: number;
  /** Adds a note on the timeline on a day, with a click on it; absent while searching. */
  onAdd?: (date: string) => void;
}

/**
 * The row at the top of the timeline that gathers every note with a day: the notes of the days
 * of Next Releases (flags), the free notes of Notes by the day of their reminder (post-its), and
 * the notes on the timeline of no project (diamonds), which a click on a day adds. All on one
 * line, those of a day side by side, or a line for each kind, as the look of this browser says.
 */
export function TimelineNotesRow({
  geometry,
  look,
  sources,
  paperColor,
  actions,
  tools,
  lineHeight,
  laneHeight,
  onAdd,
}: TimelineNotesRowProps) {
  const formatDate = useFormatDate();
  const { range, dayWidth, columns, totalWidth, todayOffset } = geometry;
  const add = useStableCallback((date: string) => onAdd?.(date));
  const title = useStableCallback(
    (date: string) => `Nuova nota sulla timeline il ${formatDate(date)}`,
  );
  const { dailyNotes, memos, milestones } = sources;
  const placed = useMemo(
    () =>
      placeMarks(
        timelineNoteMarks({ dailyNotes, memos, milestones }, look, range.start, range.end),
        look,
      ),
    [dailyNotes, memos, milestones, look, range.start, range.end],
  );
  const count = placed.reduce((total, { mark }) => total + markCount(mark), 0);
  const lanes = look.layout === 'lanes' ? shownKinds(look) : [];
  const padding = 2;
  const height = lanes.length > 0 ? laneCount(look) * laneHeight + padding * 2 : lineHeight;
  const laneTop = (lane: number) =>
    lanes.length > 0 ? `${padding + (lane + 0.5) * laneHeight}px` : '50%';

  return (
    <div
      className="grid border-b border-line-strong"
      style={{ gridTemplateColumns: 'var(--gantt-label-width) auto' }}
    >
      <div
        className={`${LABEL_CELL} flex flex-col justify-center bg-surface-muted text-xs`}
        style={{ gridColumn: 1, gridRow: 1, minHeight: height }}
      >
        {lanes.length > 0 ? (
          <>
            <span className="sr-only">Note sulla timeline, {count}</span>
            {lanes.map((kind) => (
              <span
                key={kind}
                aria-hidden="true"
                className="flex items-center gap-1.5 text-fg-muted"
                style={{ height: laneHeight }}
              >
                <KindSymbol kind={kind} look={look} size={13} />
                <span className="truncate">{LANE_NAMES[kind]}</span>
              </span>
            ))}
          </>
        ) : (
          <span className="flex items-center gap-1.5">
            <DiamondSymbol colorId={undefined} size={12} />
            <span className="font-semibold">Note sulla timeline</span>
            {count > 0 && <span className="text-fg-muted">{count}</span>}
          </span>
        )}
      </div>
      <div
        className="relative flex"
        style={{ gridColumn: 2, gridRow: 1, width: totalWidth, minHeight: height }}
      >
        <RowCells columns={columns} onAdd={onAdd ? add : undefined} addTitle={title} />
        {todayOffset !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-link"
            style={{ left: todayOffset }}
          />
        )}
        <div className="pointer-events-none absolute inset-0">
          <NoteMarks
            placed={placed}
            range={range}
            dayWidth={dayWidth}
            look={look}
            laneTop={laneTop}
            paperColor={paperColor}
            actions={actions}
            milestoneTools={tools}
          />
        </div>
      </div>
    </div>
  );
}
