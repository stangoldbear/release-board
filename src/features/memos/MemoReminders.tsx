import { BellRing } from 'lucide-react';
import { dueMemos } from '../../domain/memos';
import type { SeenReminders } from '../../domain/memos';
import type { Memo } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { useOpenDialogCount } from '../../shared/ui/openDialogs';
import { useNow } from '../../shared/useNow';
import { formatDateToISO } from '../../utils/dateUtils';
import { MemoDot, MemoTitle, memoSurface, reminderText } from './memoUi';

/** How often the day is checked, so that a calendar left open shows the reminders of a new day. */
const CHECK_MS = 60_000;

interface MemoRemindersProps {
  /** The notes the strip shows: their reminders, not those of notes hidden by the scope. */
  memos: Memo[];
  /** The reminders this browser has already shown. */
  seen: SeenReminders;
  /** The reminders shown, to remember. */
  onSeen: (shown: Memo[]) => void;
  onOpen: (memo: Memo) => void;
}

/**
 * The free notes whose reminder day has come, in a window, once per browser: the browser
 * remembers the day each note was shown for, so moving the reminder to another day shows it again.
 * The window waits for the ones the user opened to close.
 */
export function MemoReminders({ memos, seen, onSeen, onOpen }: MemoRemindersProps) {
  const today = formatDateToISO(useNow(CHECK_MS));
  const openDialogs = useOpenDialogCount();
  const due = dueMemos(memos, today, seen);
  if (openDialogs > 0 || due.length === 0) return null;

  const markSeen = () => onSeen(due);

  return (
    <Dialog
      title={due.length === 1 ? 'Promemoria' : `${due.length} promemoria`}
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
          <BellRing className="h-5 w-5" aria-hidden="true" />
        </div>
      }
      unprompted
      onClose={markSeen}
      className="max-w-md"
      footer={
        <Button variant="primary" onClick={markSeen} data-autofocus>
          Ho visto
        </Button>
      }
    >
      <ul className="space-y-2">
        {due.map((memo) => (
          <li
            key={memo.id}
            style={memoSurface(memo).style}
            className={`rounded-lg border p-3 text-sm ${memoSurface(memo).className}`}
          >
            <p className="flex items-center gap-2 wrap-break-word">
              <MemoDot memo={memo} />
              <span className="min-w-0">
                <MemoTitle title={memo.title} />
              </span>
            </p>
            {memo.body && <p className="mt-1 whitespace-pre-line wrap-break-word">{memo.body}</p>}
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className="first-letter:uppercase">
                {reminderText(memo.remindOn ?? today, today)}
              </span>
              <Button
                size="sm"
                aria-label={`Apri la nota «${memo.title}»`}
                onClick={() => {
                  markSeen();
                  onOpen(memo);
                }}
              >
                Apri la nota
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
