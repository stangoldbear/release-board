import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Copy, Layers, Plus, SquareCheckBig, Tag, Trash, User, X } from 'lucide-react';
import { DEFAULT_COLOR_ID, TASK_COLORS } from '../../domain/colors';
import type { TaskColorId } from '../../domain/colors';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '../../domain/plan';
import type { BorderStyle, Lane, TaskItem, TaskStatus } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Dialog } from '../../shared/ui/Dialog';
import { FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { taskColorStyle } from '../../themes';
import { addDaysIso, daysBetween, formatDateToISO, formatDateToIT } from '../../utils/dateUtils';

interface TaskDialogProps {
  onClose: () => void;
  onSave: (content: Omit<TaskItem, 'id'>) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (task: TaskItem) => void;
  /** The task to edit; null to create a new one. */
  initialTask: TaskItem | null;
  lanes: Lane[];
  defaultDate?: string;
  defaultLaneId?: string;
}

const DURATION_SHORTCUTS = [
  { label: '1 giorno', days: 1 },
  { label: '3 giorni', days: 3 },
  { label: '1 settimana', days: 7 },
];

/** Mounted only while open, so every opening starts from the task passed in. */
export function TaskDialog({
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  initialTask,
  lanes,
  defaultDate,
  defaultLaneId,
}: TaskDialogProps) {
  const initialDate = defaultDate ?? formatDateToISO(new Date());
  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [laneId, setLaneId] = useState(initialTask?.laneId ?? defaultLaneId ?? lanes[0]?.id ?? '');
  const [startDate, setStartDate] = useState(initialTask?.startDate ?? initialDate);
  const [endDate, setEndDate] = useState(initialTask?.endDate ?? initialDate);
  const [colorId, setColorId] = useState<TaskColorId>(initialTask?.colorId ?? DEFAULT_COLOR_ID);
  const [borderStyle, setBorderStyle] = useState<BorderStyle>(initialTask?.borderStyle ?? 'dashed');
  const [status, setStatus] = useState<TaskStatus>(initialTask?.status ?? 'planned');
  const [assignee, setAssignee] = useState(initialTask?.assignee ?? '');
  const [description, setDescription] = useState(initialTask?.description ?? '');
  const [deliverables, setDeliverables] = useState<string[]>(initialTask?.deliverables ?? []);
  const [newDeliverable, setNewDeliverable] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const formId = useId();

  const handleAddDeliverable = () => {
    if (!newDeliverable.trim()) return;
    setDeliverables([...deliverables, newDeliverable.trim()]);
    setNewDeliverable('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;
    onSave({
      title: title.trim(),
      laneId,
      startDate: startDate <= endDate ? startDate : endDate,
      endDate: startDate <= endDate ? endDate : startDate,
      colorId,
      borderStyle,
      status,
      assignee: assignee.trim(),
      description: description.trim(),
      deliverables,
    });
    onClose();
  };

  const durationDays = startDate && endDate ? daysBetween(startDate, endDate) : 1;

  return (
    <>
      <Dialog
        title={initialTask ? 'Modifica attività' : 'Nuova attività'}
        onClose={onClose}
        className="max-w-2xl"
        footer={
          <>
            {initialTask && (
              <div className="mr-auto flex items-center gap-2">
                <Button variant="danger-subtle" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash className="h-4 w-4" aria-hidden="true" />
                  Elimina
                </Button>
                <Button
                  onClick={() => {
                    onDuplicate(initialTask);
                    onClose();
                  }}
                  title="Crea una copia di questa attività"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Duplica
                </Button>
              </div>
            )}
            <Button onClick={onClose}>Annulla</Button>
            <Button variant="primary" type="submit" form={formId}>
              {initialTask ? 'Salva modifiche' : 'Crea attività'}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="task-title-input" className={LABEL_CLASS}>
              Titolo *
            </label>
            <textarea
              id="task-title-input"
              required
              rows={2}
              placeholder="es. Rilascio versione 2.8"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={`${FIELD_CLASS} font-mono`}
            />
            <p className="mt-1 text-xs text-fg-muted">Puoi andare a capo con Invio.</p>
          </div>

          <div>
            <label
              htmlFor="task-lane-select"
              className={`${LABEL_CLASS} flex items-center gap-1.5`}
            >
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              Corsia
            </label>
            <select
              id="task-lane-select"
              value={laneId}
              onChange={(event) => setLaneId(event.target.value)}
              className={FIELD_CLASS}
            >
              {lanes.map((lane) => (
                <option key={lane.id} value={lane.id}>
                  {lane.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="task-start-date" className={LABEL_CLASS}>
                Inizio *
              </label>
              <input
                id="task-start-date"
                type="date"
                required
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  if (event.target.value > endDate) setEndDate(event.target.value);
                }}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor="task-end-date" className={LABEL_CLASS}>
                Fine (inclusa) *
              </label>
              <input
                id="task-end-date"
                type="date"
                required
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  if (event.target.value < startDate) setStartDate(event.target.value);
                }}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-muted px-3 py-2 text-xs text-fg-muted">
            <span>
              Periodo:{' '}
              <strong className="font-mono font-semibold text-fg">
                {formatDateToIT(startDate)} → {formatDateToIT(endDate)}
              </strong>{' '}
              ({durationDays} {durationDays === 1 ? 'giorno' : 'giorni'})
            </span>
            <div className="flex items-center gap-1.5">
              {DURATION_SHORTCUTS.map(({ label, days }) => (
                <Button
                  key={label}
                  size="sm"
                  disabled={!startDate}
                  onClick={() => setEndDate(addDaysIso(startDate, days - 1))}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <fieldset className="space-y-3 border-t border-line pt-4">
            <legend className={`${LABEL_CLASS} flex items-center gap-1.5`}>
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              Aspetto nel calendario
            </legend>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TASK_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setColorId(color.id)}
                  aria-pressed={colorId === color.id}
                  style={taskColorStyle(color.id)}
                  className={`flex items-center gap-2 rounded-lg border-2 p-2 text-left text-xs font-medium transition-shadow ${
                    colorId === color.id ? 'ring-2 ring-fg ring-offset-1 ring-offset-surface' : ''
                  }`}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-current" />
                  <span className="truncate">{color.name}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-sm">
              <span className="text-fg-muted">Bordo:</span>
              {(
                [
                  ['dashed', 'Tratteggiato', 'border-dashed'],
                  ['solid', 'Continuo', 'border-solid'],
                ] as const
              ).map(([value, label, borderClass]) => (
                <label key={value} className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="borderStyle"
                    value={value}
                    checked={borderStyle === value}
                    onChange={() => setBorderStyle(value)}
                  />
                  <span
                    className={`rounded border-2 border-line-strong px-2 py-0.5 ${borderClass}`}
                  >
                    {label}
                  </span>
                </label>
              ))}
            </div>

            <div className="rounded-lg border border-line bg-surface-muted p-3">
              <span className="mb-1.5 block text-xs font-semibold tracking-wide text-fg-muted uppercase">
                Anteprima
              </span>
              <div
                style={taskColorStyle(colorId)}
                className={`rounded-xs border-2 p-2.5 text-center text-xs font-bold uppercase shadow-xs ${
                  borderStyle === 'dashed' ? 'border-dashed' : 'border-solid'
                }`}
              >
                {title.trim() || 'Titolo attività'}
              </div>
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <div>
              <label htmlFor="task-status-select" className={LABEL_CLASS}>
                Stato
              </label>
              <select
                id="task-status-select"
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
                className={FIELD_CLASS}
              >
                {TASK_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {TASK_STATUS_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="task-assignee-input"
                className={`${LABEL_CLASS} flex items-center gap-1.5`}
              >
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                Assegnatario
              </label>
              <input
                id="task-assignee-input"
                type="text"
                placeholder="es. Team mobile"
                value={assignee}
                onChange={(event) => setAssignee(event.target.value)}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-line pt-4">
            <label
              htmlFor="task-checklist-input"
              className={`${LABEL_CLASS} flex items-center gap-1.5`}
            >
              <SquareCheckBig className="h-3.5 w-3.5" aria-hidden="true" />
              Checklist
            </label>
            <div className="flex gap-2">
              <input
                id="task-checklist-input"
                type="text"
                placeholder="Aggiungi una voce (es. Revisione del codice)"
                value={newDeliverable}
                onChange={(event) => setNewDeliverable(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddDeliverable();
                  }
                }}
                className={`${FIELD_CLASS} flex-1`}
              />
              <Button onClick={handleAddDeliverable}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Aggiungi
              </Button>
            </div>

            {deliverables.length > 0 && (
              <ul className="mt-2 max-h-32 space-y-1.5 overflow-y-auto">
                {deliverables.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface-muted px-2.5 py-1.5 text-sm"
                  >
                    <span className="break-words">{item}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1"
                      onClick={() => setDeliverables(deliverables.filter((_, i) => i !== index))}
                      aria-label={`Rimuovi ${item}`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label htmlFor="task-description-input" className={LABEL_CLASS}>
              Note
            </label>
            <textarea
              id="task-description-input"
              rows={2}
              placeholder="Dettagli, link o note di rilascio…"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </form>
      </Dialog>

      {showDeleteConfirm && initialTask && (
        <ConfirmDialog
          title="Eliminare l'attività?"
          message="L'attività viene rimossa dal calendario."
          itemTitle={initialTask.title}
          confirmLabel="Elimina"
          onConfirm={() => {
            onDelete(initialTask.id);
            setShowDeleteConfirm(false);
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
