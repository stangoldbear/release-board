import { memo } from 'react';
import { useFormatDate } from '../../shared/dateFormat';
import { columnEdge, columnFill } from '../calendar/timelineLayout';
import type { Column } from '../calendar/timelineLayout';

/**
 * The days of a row, past ones grey, closures striped and holidays red: memoized, since a drag
 * redraws only the bars.
 */
export const RowCells = memo(function RowCells({
  columns,
  onAdd,
  addTitle,
}: {
  columns: Column[];
  /** Clicking a day adds something there: a project in the row that adds them, a note elsewhere. */
  onAdd?: (date: string) => void;
  /** What the click adds, for the title of the day; a new project by default. */
  addTitle?: (date: string) => string;
}) {
  const formatDate = useFormatDate();
  return columns.map((column) => (
    <div
      key={column.start}
      onClick={onAdd && (() => onAdd(column.start))}
      title={
        onAdd
          ? (addTitle?.(column.start) ?? `Nuovo progetto dal ${formatDate(column.start)}`)
          : undefined
      }
      className={`flex shrink-0 items-center justify-center ${columnEdge(column)} ${columnFill(column)} ${
        // The plus is drawn by CSS: one icon element per day would weigh on long roadmaps.
        onAdd
          ? "cursor-pointer text-base text-link after:opacity-0 after:content-['+'] hover:bg-accent-soft hover:after:opacity-100 pointer-coarse:after:hidden"
          : ''
      }`}
      style={{ width: column.width }}
    />
  ));
});
