import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Diamond, Trash } from 'lucide-react';
import { TASK_COLORS } from '../../domain/colors';
import type { TaskColorId } from '../../domain/colors';
import { MILESTONE_BODY_MAX, MILESTONE_TITLE_MAX } from '../../domain/milestones';
import type { MilestoneContent } from '../../domain/milestones';
import { customOrder } from '../../domain/projectOrder';
import type { Milestone, Project } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Dialog } from '../../shared/ui/Dialog';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { taskColorStyle } from '../../themes';
import { isIsoDate } from '../../utils/dateUtils';

interface MilestoneDialogProps {
  /** The note to edit; null for a new one on `date`, of `projectId` when given. */
  milestone: Milestone | null;
  date: string;
  projectId?: string;
  projects: Project[];
  defaultColorId: TaskColorId;
  onSubmit: (content: MilestoneContent) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * A note on a day of the roadmap: its title, its day, the project it belongs to or none, its
 * color, a text, and whether an alert comes on its day.
 */
export function MilestoneDialog({
  milestone,
  date: defaultDate,
  projectId: defaultProjectId,
  projects,
  defaultColorId,
  onSubmit,
  onDelete,
  onClose,
}: MilestoneDialogProps) {
  const [title, setTitle] = useState(milestone?.title ?? '');
  const [date, setDate] = useState(milestone?.date ?? defaultDate);
  const [projectId, setProjectId] = useState(milestone?.projectId ?? defaultProjectId ?? '');
  const [colorId, setColorId] = useState<TaskColorId>(milestone?.colorId ?? defaultColorId);
  const [body, setBody] = useState(milestone?.body ?? '');
  const [remind, setRemind] = useState(milestone?.remind === true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formId = useId();
  const titleId = useId();
  const dateId = useId();
  const projectSelectId = useId();
  const bodyId = useId();
  const remindId = useId();
  const canSave = title.trim() !== '' && isIsoDate(date);

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    const content: MilestoneContent = { date, title: title.trim(), colorId };
    if (body.trim()) content.body = body.trim();
    if (projectId) content.projectId = projectId;
    if (remind) content.remind = true;
    onSubmit(content);
    onClose();
  };

  return (
    <>
      <Dialog
        title={milestone ? 'Nota sulla timeline' : 'Nuova nota sulla timeline'}
        description="Un rombo su un giorno della roadmap, nella riga del suo progetto o in quella in cima"
        icon={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-strong text-fg">
            <Diamond className="h-4 w-4" aria-hidden="true" />
          </div>
        }
        onClose={onClose}
        className="max-w-lg"
        footer={
          <>
            {milestone && (
              <Button
                variant="danger-subtle"
                className="mr-auto"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash className="h-4 w-4" aria-hidden="true" />
                Elimina
              </Button>
            )}
            <Button onClick={onClose}>Annulla</Button>
            <Button variant="primary" type="submit" form={formId} disabled={!canSave}>
              {milestone ? 'Salva' : 'Crea nota'}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor={titleId} className={LABEL_CLASS}>
              Titolo *
            </label>
            <input
              id={titleId}
              data-autofocus
              type="text"
              required
              maxLength={MILESTONE_TITLE_MAX}
              placeholder="es. Demo al cliente"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={dateId} className={LABEL_CLASS}>
                Giorno *
              </label>
              <input
                id={dateId}
                type="date"
                required
                max={DATE_MAX}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor={projectSelectId} className={LABEL_CLASS}>
                Progetto
              </label>
              <select
                id={projectSelectId}
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">Nessuno: la riga in cima alla roadmap</option>
                {customOrder(projects).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <fieldset>
            <legend className={LABEL_CLASS}>Colore</legend>
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
                  <span className="h-3 w-3 shrink-0 rotate-45 rounded-[2px] border-2 border-current" />
                  <span className="truncate">{color.name}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor={bodyId} className={LABEL_CLASS}>
              Testo
            </label>
            <textarea
              id={bodyId}
              rows={3}
              maxLength={MILESTONE_BODY_MAX}
              placeholder="Cosa succede quel giorno, link, promemoria…"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <label htmlFor={remindId} className="flex items-start gap-2 text-sm">
            <input
              id={remindId}
              type="checkbox"
              checked={remind}
              onChange={(event) => setRemind(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              Avvisami il giorno della nota
              <span className="block text-xs text-fg-muted">
                Una finestra all&apos;apertura della bacheca, una volta per browser.
              </span>
            </span>
          </label>
        </form>
      </Dialog>

      {confirmDelete && milestone && (
        <ConfirmDialog
          title="Eliminare la nota?"
          message="La nota sparisce dalla roadmap per tutti."
          itemTitle={milestone.title}
          confirmLabel="Elimina"
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete();
            onClose();
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
