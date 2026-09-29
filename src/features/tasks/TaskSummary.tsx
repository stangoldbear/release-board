import { Ban, CircleCheck, CircleDashed, CircleDot, Eye, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TASK_STATUSES } from '../../domain/plan';
import { countByStatus } from '../../domain/stats';
import type { TaskItem, TaskStatus } from '../../domain/types';
import { Button } from '../../shared/ui/Button';

/** Plural labels, agreeing with "attività". */
const SUMMARY_LABELS: Record<TaskStatus, string> = {
  planned: 'Pianificate',
  in_progress: 'In corso',
  review: 'In revisione',
  completed: 'Completate',
  blocked: 'Bloccate',
};

const STATUS_ICONS: Record<TaskStatus, LucideIcon> = {
  planned: CircleDashed,
  in_progress: CircleDot,
  review: Eye,
  completed: CircleCheck,
  blocked: Ban,
};

interface TaskSummaryProps {
  tasks: readonly TaskItem[];
  /** How many tasks the filter shows; null when no filter is active. */
  shownCount: number | null;
  onClearFilter: () => void;
}

/** Task counts by status, each with an icon and a label so that color is never the only cue. */
export function TaskSummary({ tasks, shownCount, onClearFilter }: TaskSummaryProps) {
  const counts = countByStatus(tasks);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-xs shadow-2xs">
      <ul aria-label="Attività per stato" className="flex items-center gap-x-4 gap-y-1 flex-wrap">
        <li className="font-semibold">
          Attività: <strong>{tasks.length}</strong>
        </li>
        {TASK_STATUSES.map((status) => {
          const Icon = STATUS_ICONS[status];
          return (
            <li key={status} className="flex items-center gap-1.5 text-fg-muted">
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {SUMMARY_LABELS[status]}: <strong className="text-fg">{counts[status]}</strong>
            </li>
          );
        })}
      </ul>
      {/* Always mounted, so that screen readers announce how many tasks the filter finds. */}
      <p role="status" className="flex flex-wrap items-center gap-2">
        {shownCount !== null && (
          <>
            <span className={shownCount === 0 ? 'font-semibold' : 'text-fg-muted'}>
              {shownCount === 0 ? (
                'Nessuna attività corrisponde ai filtri'
              ) : (
                <>
                  Filtro attivo: <strong className="text-fg">{shownCount}</strong> su {tasks.length}
                </>
              )}
            </span>
            <Button size="sm" onClick={onClearFilter}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Azzera i filtri
            </Button>
          </>
        )}
      </p>
    </div>
  );
}
