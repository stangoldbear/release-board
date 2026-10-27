import { useId, useState } from 'react';
import { Trash } from 'lucide-react';
import { ASSIGNMENT_NOTE_MAX, isValidManDays } from '../../domain/assignments';
import { Dialog } from '../../shared/ui/Dialog';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { isIsoDate } from '../../utils/dateUtils';
import type { WorkItem } from './barRendering';
import { MarkdownTextarea } from '../../shared/ui/MarkdownTextarea';

export function ContingencyDialog({
  item,
  onSave,
  onDelete,
  onClose,
}: {
  item: WorkItem;
  onSave: (changes: { startDate: string; manDays: number; note: string }) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [startDate, setStartDate] = useState(item.startDate);
  const [days, setDays] = useState(String(item.manDays));
  const [note, setNote] = useState(item.note ?? '');
  const [deleting, setDeleting] = useState(false);
  const formId = useId();
  const startId = useId();
  const daysId = useId();
  const noteId = useId();
  const manDays = Number(days.replace(',', '.'));
  const valid = isIsoDate(startDate) && isValidManDays(manDays);
  return (
    <>
      <Dialog
        title="Segmento di contingency"
        onClose={onClose}
        className="max-w-lg"
        footer={
          <>
            <Button variant="danger-subtle" className="mr-auto" onClick={() => setDeleting(true)}>
              <Trash className="h-4 w-4" aria-hidden="true" />
              Elimina segmento
            </Button>
            <Button onClick={onClose}>Annulla</Button>
            <Button variant="primary" type="submit" form={formId} disabled={!valid}>
              Salva
            </Button>
          </>
        }
      >
        <form
          id={formId}
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) {
              onSave({ startDate, manDays, note: note.trim() });
              onClose();
            }
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor={startId} className={LABEL_CLASS}>
              Dal giorno *
            </label>
            <input
              id={startId}
              type="date"
              data-autofocus
              max={DATE_MAX}
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label htmlFor={daysId} className={LABEL_CLASS}>
              Giorni uomo *
            </label>
            <input
              id={daysId}
              type="number"
              min={0.5}
              max={500}
              step={0.5}
              required
              value={days}
              onChange={(event) => setDays(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label htmlFor={noteId} className={LABEL_CLASS}>
              Nota
            </label>
            <MarkdownTextarea
              id={noteId}
              label="Nota"
              rows={3}
              maxLength={ASSIGNMENT_NOTE_MAX}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </form>
      </Dialog>
      {deleting && (
        <ConfirmDialog
          title="Eliminare il segmento?"
          message="Gli altri segmenti della contingency restano invariati."
          confirmLabel="Elimina"
          onConfirm={() => {
            onDelete();
            onClose();
          }}
          onCancel={() => setDeleting(false)}
        />
      )}
    </>
  );
}
