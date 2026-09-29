import { useEffect, useId, useRef, useState } from 'react';
import { StickyNote, Trash } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { formatDateToIT } from '../../utils/dateUtils';

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
  onSave: (text: string) => void;
  onClose: () => void;
}

/** Edits the note of one day. Mounted only while open, so it always starts from the saved note. */
export function DailyNoteDialog({ date, note, onSave, onClose }: DailyNoteDialogProps) {
  const [draft, setDraft] = useState(note);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaId = useId();

  // `autoFocus` would run before the dialog opens, and a closed dialog cannot take focus.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const save = (text: string) => {
    onSave(text);
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
          <Button variant="primary" onClick={() => save(draft)}>
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
            ref={textareaRef}
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Promemoria, eventi, scadenze o note operative per questo giorno…"
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
      </div>
    </Dialog>
  );
}
