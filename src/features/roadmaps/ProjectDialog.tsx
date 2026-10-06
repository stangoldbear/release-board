import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Milestone, Trash, UserRound } from 'lucide-react';
import { TASK_COLORS } from '../../domain/colors';
import type { TaskColorId } from '../../domain/colors';
import {
  DEFAULT_PROJECT_COLOR_ID,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_OWNER_MAX,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  PROJECT_TITLE_MAX,
} from '../../domain/projects';
import type { ProjectContent } from '../../domain/projects';
import type { Project, ProjectStatus } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Dialog } from '../../shared/ui/Dialog';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { taskColorStyle } from '../../themes';
import { isIsoDate } from '../../utils/dateUtils';
import { ProjectStatusMark } from './projectUi';
import { projectPeriod } from './roadmapLayout';

interface ProjectDialogProps {
  /** The project to edit; null for a new one, which starts from `period`. */
  project: Project | null;
  period: { startDate: string; endDate: string };
  /** The project is no longer in the plan: nothing can be saved. */
  gone: boolean;
  onSave: (content: ProjectContent) => void;
  onDelete: () => void;
  onClose: () => void;
}

/** A project of the roadmap: title, period, state, color, owner and description. */
export function ProjectDialog({
  project,
  period,
  gone,
  onSave,
  onDelete,
  onClose,
}: ProjectDialogProps) {
  const [title, setTitle] = useState(project?.title ?? '');
  const [startDate, setStartDate] = useState(project?.startDate ?? period.startDate);
  const [endDate, setEndDate] = useState(project?.endDate ?? period.endDate);
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'planned');
  const [colorId, setColorId] = useState<TaskColorId>(project?.colorId ?? DEFAULT_PROJECT_COLOR_ID);
  const [owner, setOwner] = useState(project?.owner ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formId = useId();
  const titleId = useId();
  const startId = useId();
  const endId = useId();
  const statusId = useId();
  const ownerId = useId();
  const descriptionId = useId();
  const datesValid = isIsoDate(startDate) && isIsoDate(endDate);

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !datesValid || gone) return;
    const content: ProjectContent = {
      title: title.trim(),
      // Swapped dates are put in order rather than refused.
      startDate: startDate <= endDate ? startDate : endDate,
      endDate: startDate <= endDate ? endDate : startDate,
      colorId,
      status,
    };
    if (owner.trim()) content.owner = owner.trim();
    if (description.trim()) content.description = description.trim();
    onSave(content);
    onClose();
  };

  return (
    <>
      <Dialog
        title={project ? 'Progetto' : 'Nuovo progetto'}
        description={
          datesValid ? `Roadmaps · ${projectPeriod({ startDate, endDate })}` : 'Roadmaps'
        }
        icon={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-strong text-fg">
            <Milestone className="h-4 w-4" aria-hidden="true" />
          </div>
        }
        onClose={onClose}
        className="max-w-lg"
        footer={
          <>
            {project && (
              <Button
                variant="danger-subtle"
                className="mr-auto"
                disabled={gone}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash className="h-4 w-4" aria-hidden="true" />
                Elimina
              </Button>
            )}
            <Button onClick={onClose}>Annulla</Button>
            <Button
              variant="primary"
              type="submit"
              form={formId}
              disabled={!title.trim() || !datesValid || gone}
            >
              {project ? 'Salva' : 'Crea progetto'}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={save} className="space-y-4">
          {gone && (
            <p
              role="alert"
              className="rounded-lg border border-warning bg-warning-soft p-3 text-sm text-fg"
            >
              Questo progetto non c&apos;è più: un altro membro l&apos;ha eliminato. Le modifiche
              non si possono salvare.
            </p>
          )}

          <div>
            <label htmlFor={titleId} className={LABEL_CLASS}>
              Titolo *
            </label>
            <input
              id={titleId}
              data-autofocus
              type="text"
              required
              maxLength={PROJECT_TITLE_MAX}
              placeholder="es. App mobile 3.0"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={startId} className={LABEL_CLASS}>
                Inizio *
              </label>
              <input
                id={startId}
                type="date"
                required
                max={DATE_MAX}
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  if (event.target.value > endDate) setEndDate(event.target.value);
                }}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor={endId} className={LABEL_CLASS}>
                Fine (inclusa) *
              </label>
              <input
                id={endId}
                type="date"
                required
                max={DATE_MAX}
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  if (event.target.value < startDate) setStartDate(event.target.value);
                }}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={statusId} className={LABEL_CLASS}>
                Stato
              </label>
              <select
                id={statusId}
                value={status}
                onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                className={FIELD_CLASS}
              >
                {PROJECT_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {PROJECT_STATUS_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={ownerId} className={`${LABEL_CLASS} flex items-center gap-1.5`}>
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                Responsabile
              </label>
              <input
                id={ownerId}
                type="text"
                maxLength={PROJECT_OWNER_MAX}
                placeholder="es. Giulia"
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                className={FIELD_CLASS}
              />
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
                  <span className="h-3 w-3 shrink-0 rounded-full border-2 border-current" />
                  <span className="truncate">{color.name}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="rounded-lg border border-line bg-surface-muted p-3">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-fg-muted uppercase">
              Anteprima
            </span>
            <div
              style={taskColorStyle(colorId)}
              className="flex items-center gap-1.5 rounded-xs border-2 px-2 py-1.5 text-xs font-semibold shadow-xs"
            >
              <ProjectStatusMark status={status} iconOnly />
              <span className="truncate">{title.trim() || 'Titolo del progetto'}</span>
            </div>
          </div>

          <div>
            <label htmlFor={descriptionId} className={LABEL_CLASS}>
              Descrizione
            </label>
            <textarea
              id={descriptionId}
              rows={4}
              maxLength={PROJECT_DESCRIPTION_MAX}
              placeholder="Obiettivi, tappe, link…"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </form>
      </Dialog>

      {confirmDelete && project && !gone && (
        <ConfirmDialog
          title="Eliminare il progetto?"
          message="Il progetto viene tolto dalla roadmap."
          itemTitle={project.title}
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
