import { CalendarClock, Check } from 'lucide-react';
import type { SeenReminders } from '../../domain/memos';
import { dueProjectNotes } from '../../domain/projectNotes';
import type { Project, ProjectNote } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { useOpenDialogCount } from '../../shared/ui/openDialogs';
import { useNow } from '../../shared/useNow';
import { formatDateToISO } from '../../utils/dateUtils';
import { dueText } from './noteUi';

/** How often the day is checked, so that a calendar left open shows the deadlines of a new day. */
const CHECK_MS = 60_000;

interface ProjectNoteRemindersProps {
  notes: ProjectNote[];
  projects: Project[];
  /** The deadlines this browser has already shown. */
  seen: SeenReminders;
  /** The deadlines shown, to remember when they are dismissed. */
  onSeen: (shown: ProjectNote[]) => void;
  /** Marks a note as done, which ends its alert everywhere. */
  onDone: (noteId: string) => void;
}

/**
 * The notes of the projects whose deadline has come and that asked for an alert, in a window:
 * «Fatta» marks a note done, «Chiudi» dismisses the alerts for today in this browser. The window
 * waits for the ones the user opened to close.
 */
export function ProjectNoteReminders({
  notes,
  projects,
  seen,
  onSeen,
  onDone,
}: ProjectNoteRemindersProps) {
  const today = formatDateToISO(useNow(CHECK_MS));
  const openDialogs = useOpenDialogCount();
  const due = dueProjectNotes(notes, today, seen);
  if (openDialogs > 0 || due.length === 0) return null;

  const dismiss = () => onSeen(due);
  const titleOf = (note: ProjectNote) =>
    projects.find((project) => project.id === note.projectId)?.title ?? 'Progetto';

  return (
    <Dialog
      title={due.length === 1 ? 'Scadenza di un progetto' : `${due.length} scadenze dei progetti`}
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
          <CalendarClock className="h-5 w-5" aria-hidden="true" />
        </div>
      }
      unprompted
      onClose={dismiss}
      className="max-w-md"
      footer={
        <Button variant="primary" onClick={dismiss} data-autofocus>
          Chiudi
        </Button>
      }
    >
      <ul className="space-y-2">
        {due.map((note) => (
          <li
            key={note.id}
            className="rounded-lg border border-warning bg-warning-soft p-3 text-sm"
          >
            <p className="text-xs font-bold tracking-wide text-fg-muted uppercase">
              {titleOf(note)}
            </p>
            <p className="mt-1 whitespace-pre-line wrap-break-word">{note.text}</p>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold first-letter:uppercase">{dueText(note, today)}</span>
              <Button size="sm" onClick={() => onDone(note.id)} aria-label={`Fatta: ${note.text}`}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Fatta
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
