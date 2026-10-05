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

/** What the filters find. */
export interface FilterResult {
  /** Tasks shown. */
  tasks: number;
  /** While text is searched: the notes of the days and the free notes that have it. */
  search: { notes: number; allNotes: number; memos: number; allMemos: number } | null;
}

interface TaskSummaryProps {
  tasks: readonly TaskItem[];
  /** Null when no filter is active. */
  found: FilterResult | null;
  onClearFilter: () => void;
}

function count(shown: number, total: number, one: string, many: string) {
  return (
    <>
      <strong className="text-fg">{shown}</strong> {shown === 1 ? one : many} su {total}
    </>
  );
}

/** "Trovate 3 attività su 11, 1 nota su 2 e 0 note libere su 3", or what the status filter keeps. */
function FoundText({ found, total }: { found: FilterResult; total: number }) {
  const { search } = found;
  if (search) {
    if (found.tasks + search.notes + search.memos === 0) {
      return <span className="font-semibold">Nessun risultato per la ricerca</span>;
    }
    return (
      <span className="text-fg-muted">
        Trovate {count(found.tasks, total, 'attività', 'attività')},{' '}
        {count(search.notes, search.allNotes, 'nota', 'note')} e{' '}
        {count(search.memos, search.allMemos, 'nota libera', 'note libere')}
      </span>
    );
  }
  if (found.tasks === 0) {
    return <span className="font-semibold">Nessuna attività corrisponde ai filtri</span>;
  }
  return (
    <span className="text-fg-muted">
      Filtro attivo: <strong className="text-fg">{found.tasks}</strong> su {total}
    </span>
  );
}

/** Task counts by status, each with an icon and a label so that color is never the only cue. */
export function TaskSummary({ tasks, found, onClearFilter }: TaskSummaryProps) {
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
        {found && (
          <>
            <FoundText found={found} total={tasks.length} />
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
