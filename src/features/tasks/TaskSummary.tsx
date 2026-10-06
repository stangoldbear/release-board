import { Ban, CircleCheck, CircleDashed, CircleDot, Eye, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '../../domain/plan';
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
  /** Tasks shown while a status is chosen; null for all of them. */
  found: number | null;
  /** Only the tasks in this status; null for all of them. */
  status: TaskStatus | null;
  onStatusChange: (status: TaskStatus | null) => void;
}

/**
 * Task counts by status, each with an icon and a label so that color is never the only cue, and
 * the filter by status.
 */
export function TaskSummary({ tasks, found, status, onStatusChange }: TaskSummaryProps) {
  const counts = countByStatus(tasks);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-2.5 text-xs">
      <ul aria-label="Attività per stato" className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <li className="font-semibold">
          Attività: <strong>{tasks.length}</strong>
        </li>
        {TASK_STATUSES.map((value) => {
          const Icon = STATUS_ICONS[value];
          return (
            <li key={value} className="flex items-center gap-1.5 text-fg-muted">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {SUMMARY_LABELS[value]}: <strong className="text-fg">{counts[value]}</strong>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Filtra per stato"
          value={status ?? ''}
          onChange={(event) =>
            onStatusChange(event.target.value === '' ? null : (event.target.value as TaskStatus))
          }
          className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs"
        >
          <option value="">Tutti gli stati</option>
          {TASK_STATUSES.map((value) => (
            <option key={value} value={value}>
              {TASK_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
        {/* Always mounted, so that screen readers announce how many tasks the filter keeps. */}
        <p role="status" className="flex flex-wrap items-center gap-2">
          {found !== null &&
            (found === 0 ? (
              <span className="font-semibold">Nessuna attività in questo stato</span>
            ) : (
              <span className="text-fg-muted">
                Filtro attivo: <strong className="text-fg">{found}</strong> su {tasks.length}
              </span>
            ))}
          {status !== null && (
            <Button size="sm" onClick={() => onStatusChange(null)}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Tutti gli stati
            </Button>
          )}
        </p>
      </div>
    </div>
  );
}
