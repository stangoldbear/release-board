import { useId, useState } from 'react';
import { StickyNote, Trash } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { formatDateToIT, isIsoDate } from '../../utils/dateUtils';

const SUGGESTED_NOTES = [
  'Kickoff Deploy',
  'Code Freeze',
  'Release Day',
  'QA Testing',
  'Sync Operativo',
];

interface DailyNoteDialogProps {
  date: string;
  /** The saved note of the day, empty if there is none. */
  note: string;
  /** Whether a day has no note yet: a day has one note. */
  isDayFree: (date: string) => boolean;
  /** Saves the note on its own day; blank text removes it. */
  onSave: (text: string) => void;
  /** Saves the note on another day, moving it there when it already exists. */
  onMove: (to: string, text: string) => void;
  onClose: () => void;
}

/**
 * Edits the note of one day, and moves it to another day without dragging it. Mounted only while
 * open, so it always starts from the saved note.
 */
export function DailyNoteDialog({
  date,
  note,
  isDayFree,
  onSave,
  onMove,
  onClose,
}: DailyNoteDialogProps) {
  const [draft, setDraft] = useState(note);
  const [day, setDay] = useState(date);
  const textareaId = useId();
  const dayId = useId();
  const dayErrorId = useId();

  const dayInvalid = day !== '' && !isIsoDate(day);
  const otherDay = day !== '' && day !== date && !dayInvalid;
  const dayTaken = otherDay && !isDayFree(day);

  const save = (text: string) => {
    if (otherDay && text.trim()) onMove(day, text);
    else onSave(text);
    onClose();
  };

  return (
    <Dialog
      title={`Nota per il ${formatDateToIT(date)}`}
      icon={
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-soft text-warning">
          <StickyNote className="h-4 w-4" aria-hidden="true" />
        </div>
      }
      onClose={onClose}
      className="max-w-md"
      footer={
        <>
          {note && (
            <Button variant="danger-subtle" className="mr-auto" onClick={() => save('')}>
              <Trash className="h-4 w-4" aria-hidden="true" />
              Elimina nota
            </Button>
          )}
          <Button onClick={onClose}>Annulla</Button>
          <Button
            variant="primary"
            disabled={dayTaken || dayInvalid || day === ''}
            onClick={() => save(draft)}
          >
            Salva nota
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label htmlFor={textareaId} className={LABEL_CLASS}>
            Testo della nota
          </label>
          <textarea
            id={textareaId}
            data-autofocus
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Eventi, scadenze o note operative per questo giorno…"
            className={FIELD_CLASS}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="mr-1 text-xs text-fg-muted">Suggeriti:</span>
          {SUGGESTED_NOTES.map((tag) => (
            <Button
              key={tag}
              size="sm"
              onClick={() => setDraft((previous) => (previous ? `${previous} - ${tag}` : tag))}
            >
              +{tag}
            </Button>
          ))}
        </div>

        <div>
          <label htmlFor={dayId} className={LABEL_CLASS}>
            Giorno
          </label>
          <input
            id={dayId}
            type="date"
            required
            max={DATE_MAX}
            value={day}
            onChange={(event) => setDay(event.target.value)}
            aria-invalid={dayTaken || dayInvalid}
            aria-describedby={dayErrorId}
            className={FIELD_CLASS}
          />
          <p id={dayErrorId} className="mt-1 text-xs text-fg-muted" aria-live="polite">
            {dayInvalid
              ? 'Data non valida: scegli un giorno entro il 9999.'
              : dayTaken
                ? `Il ${formatDateToIT(day)} ha già una nota: scegli un altro giorno.`
                : note
                  ? 'Cambia il giorno per spostare la nota, anche fuori dal periodo visibile.'
                  : 'La nota va su questo giorno; puoi sceglierne un altro.'}
          </p>
        </div>
      </div>
    </Dialog>
  );
}
