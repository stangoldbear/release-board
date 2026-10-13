import { Diamond } from 'lucide-react';
import type { Milestone } from '../../domain/types';
import { useFormatDate } from '../../shared/dateFormat';
import { useStableCallback } from '../../shared/useStableCallback';
import { LABEL_CELL } from '../calendar/timelineLayout';
import type { TimelineGeometry } from '../timeline/TimelineFrame';
import { MilestoneLayer } from './MilestoneDiamond';
import type { MilestoneTools } from './MilestoneDiamond';
import { RowCells } from './RowCells';

interface MilestonesRowProps {
  geometry: TimelineGeometry;
  /** The notes of no project. */
  milestones: Milestone[];
  tools: MilestoneTools;
  minHeight: number;
  /** Adds a note on a day, with a click on it; absent while searching. */
  onAdd?: (date: string) => void;
}

/** The notes on the timeline that belong to no project: a row of diamonds, a click on a day adds one. */
export function MilestonesRow({
  geometry,
  milestones,
  tools,
  minHeight,
  onAdd,
}: MilestonesRowProps) {
  const formatDate = useFormatDate();
  const { range, dayWidth, columns, totalWidth, todayOffset } = geometry;
  const add = useStableCallback((date: string) => onAdd?.(date));
  const title = useStableCallback(
    (date: string) => `Nuova nota sulla timeline il ${formatDate(date)}`,
  );
  return (
    <div
      className="grid border-b border-line-strong"
      style={{ gridTemplateColumns: 'var(--gantt-label-width) auto' }}
    >
      <div
        className={`${LABEL_CELL} flex items-center gap-1.5 bg-surface-muted text-xs`}
        style={{ gridColumn: 1, gridRow: 1, minHeight }}
      >
        <Diamond className="h-3.5 w-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
        <span className="font-semibold">Note sulla timeline</span>
        {milestones.length > 0 && <span className="text-fg-muted">{milestones.length}</span>}
      </div>
      <div
        className="relative flex"
        style={{ gridColumn: 2, gridRow: 1, width: totalWidth, minHeight }}
      >
        <RowCells columns={columns} onAdd={onAdd ? add : undefined} addTitle={title} />
        {todayOffset !== null && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-link"
            style={{ left: todayOffset }}
          />
        )}
        <MilestoneLayer
          milestones={milestones}
          range={range}
          dayWidth={dayWidth}
          top="50%"
          tools={tools}
        />
      </div>
    </div>
  );
}
