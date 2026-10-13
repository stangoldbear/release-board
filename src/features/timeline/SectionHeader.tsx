import type { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { areaTitleId } from '../../shared/ui/Area';
import { LABEL_CELL } from '../calendar/timelineLayout';

/** How many rows are in a state, with the shape of the state: a legend as much as a count. */
export interface StatusCount {
  icon: LucideIcon;
  label: string;
  count: number;
}

interface SectionHeaderProps {
  /** The element id of the section: the search and the header bring it into view by it. */
  id: string;
  title: string;
  icon: LucideIcon;
  /** "Attività: 11", "Progetti: 5". */
  total: { label: string; count: number };
  counts: StatusCount[];
  /** What the search or a filter keeps, out of the total; null when nothing filters. */
  found: number | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** The id of the rows the header folds. */
  rowsId: string;
  /** Controls after the counts, such as a filter. */
  extra?: ReactNode;
  /** Width of the days, so that the header spans the whole timeline. */
  width: number;
}

/**
 * The row above a part of the timeline: its name, with the arrow that folds its rows, and how
 * many rows there are in each state, each with its shape, which is also the legend of the shapes.
 * The name stays in the column, the counts stay in view while the days scroll.
 */
export function SectionHeader({
  id,
  title,
  icon: Icon,
  total,
  counts,
  found,
  collapsed,
  onToggleCollapsed,
  rowsId,
  extra,
  width,
}: SectionHeaderProps) {
  return (
    <div
      id={id}
      className="grid border-b border-line-strong bg-surface-strong"
      style={{ gridTemplateColumns: 'var(--gantt-label-width) auto' }}
    >
      <div
        className={`${LABEL_CELL} flex items-center gap-1 bg-surface-strong py-1!`}
        style={{ gridColumn: 1, gridRow: 1 }}
      >
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={rowsId}
          onClick={onToggleCollapsed}
          title={collapsed ? `Mostra le righe di ${title}` : `Nascondi le righe di ${title}`}
          className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md py-1 pr-1.5 pl-0.5 text-left hover:bg-surface"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
          )}
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <h3 id={areaTitleId(id)} tabIndex={-1} className="truncate text-sm font-extrabold">
            {title}
          </h3>
        </button>
      </div>
      <div className="relative flex items-center" style={{ gridColumn: 2, gridRow: 1, width }}>
        {/* In view while the days scroll, as the name of a month. */}
        <div className="sticky left-(--gantt-label-width) flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1 text-xs whitespace-nowrap">
          <span className="font-semibold">
            {total.label}: <strong>{total.count}</strong>
          </span>
          <ul
            aria-label={`${total.label} per stato`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            {counts.map(({ icon: StatusIcon, label, count }) => (
              <li key={label} className="flex items-center gap-1 text-fg-muted">
                <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {label}: <strong className="text-fg">{count}</strong>
              </li>
            ))}
          </ul>
          {found !== null && (
            <span className="text-fg-muted">
              {found === 0 ? (
                <span className="font-semibold text-fg">Nessun risultato</span>
              ) : (
                <>
                  <strong className="text-fg">{found}</strong> su {total.count}
                </>
              )}
            </span>
          )}
          {extra}
        </div>
      </div>
    </div>
  );
}
