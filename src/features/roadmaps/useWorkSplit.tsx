import { useState } from 'react';
import { isAbsentOn, isWorkingDay } from '../../domain/assignments';
import { SPLIT_PARTS_MAX, maxSplitParts, splitWork } from '../../domain/split';
import { useFormatDate } from '../../shared/dateFormat';
import { SplitDialog } from '../split/SplitDialog';
import type { SplitChoice, SplitTarget } from '../split/SplitDialog';
import { formatManDays } from './barRendering';
import type { WorkItem } from './barRendering';

/** How many parts a bar of work can make: as many as its half days, up to `limit`. */
export function workSplitParts(item: Pick<WorkItem, 'manDays'>, limit = SPLIT_PARTS_MAX): number {
  return maxSplitParts(item.manDays, 0.5, limit);
}

/**
 * The window «Dividi» for the bars of work, of the people or of the contingency, wherever they
 * are drawn: `open` with the bar, the title of its project and the parts it can make at most.
 * The parts fall on the working days of the bar's own calendar, as its schedule does.
 */
export function useWorkSplit(onSplit: (item: WorkItem, choice: SplitChoice) => void) {
  const formatDate = useFormatDate();
  const [splitting, setSplitting] = useState<{
    item: WorkItem;
    projectTitle: string;
    limit: number;
  } | null>(null);

  const target = (item: WorkItem, projectTitle: string, limit: number): SplitTarget => ({
    name: `${item.name} · ${projectTitle}`,
    summary: `${formatManDays(item.manDays)} di lavoro dal ${formatDate(item.schedule.start)} al ${formatDate(item.schedule.end)}`,
    total: item.manDays,
    step: 0.5,
    maxParts: workSplitParts(item, limit),
    colorId: item.colorId ?? 'slate',
    hasNote: Boolean(item.note?.trim()),
    pauseIn: 'working',
    place: (sizes, pause) =>
      splitWork(item, sizes, pause, item.absences, item.closures)?.map(({ schedule }) => ({
        start: schedule.start,
        end: schedule.end,
      })) ?? null,
    isDayOff: (iso) => !isWorkingDay(iso, item.closures) || isAbsentOn(item.absences, iso),
  });

  return {
    open: (item: WorkItem, projectTitle: string, limit = SPLIT_PARTS_MAX) =>
      setSplitting({ item, projectTitle, limit }),
    dialog: splitting && (
      <SplitDialog
        target={target(splitting.item, splitting.projectTitle, splitting.limit)}
        onSplit={(choice) => onSplit(splitting.item, choice)}
        onClose={() => setSplitting(null)}
      />
    ),
  };
}
