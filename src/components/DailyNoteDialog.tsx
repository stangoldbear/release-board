import { useEffect, useId, useRef, useState } from 'react';
import { CircleCheck, StickyNote, Trash } from 'lucide-react';
import { formatDateToIT } from '../utils/dateUtils';
import { Dialog } from './Dialog';

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
        <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
          <StickyNote className="w-4 h-4" aria-hidden="true" />
        </div>
      }
      onClose={onClose}
      className="max-w-md"
      footer={
        <>
          {note && (
            <button
              type="button"
              onClick={() => save('')}
              className="mr-auto px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-medium flex items-center gap-1 transition-colors"
            >
              <Trash className="w-3.5 h-3.5" aria-hidden="true" />
              Elimina Nota
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => save(draft)}
            className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <CircleCheck className="w-3.5 h-3.5" aria-hidden="true" />
            Salva Nota
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
          >
            Testo della Nota Giornaliera
          </label>
          <textarea
            id={textareaId}
            ref={textareaRef}
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Scrivi qui promemoria, eventi, scadenze o note operative per questo giorno..."
            className="w-full px-3 py-2 text-sm bg-amber-50/30 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-400 text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-slate-400 mr-1">Suggeriti:</span>
          {SUGGESTED_NOTES.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setDraft((prev) => (prev ? `${prev} - ${tag}` : tag))}
              className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 rounded transition-colors"
            >
              +{tag}
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
