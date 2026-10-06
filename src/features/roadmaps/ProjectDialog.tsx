import { useId, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
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
import { sortByPosition } from '../../domain/roadmapConfig';
import type {
  Assignment,
  MemoAuthor,
  Project,
  ProjectNote,
  ProjectStatus,
  RoadmapConfig,
  Stakeholder,
} from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Dialog } from '../../shared/ui/Dialog';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { taskColorStyle } from '../../themes';
import { isIsoDate } from '../../utils/dateUtils';
import { draftsFrom, valuesFrom } from './fieldDrafts';
import type { FieldDrafts } from './fieldDrafts';
import { ProjectFieldsEditor } from './ProjectFieldsEditor';
import { ProjectNotesPanel } from './ProjectNotesPanel';
import { ProjectTeamPanel } from './ProjectTeamPanel';
import { ProjectStatusMark } from './projectUi';
import type { NoteActions } from './roadmapActions';
import { projectPeriod } from './roadmapLayout';

/** The three parts of the window: the project itself, its notes, who works on it. */
export type ProjectTab = 'project' | 'notes' | 'team';

interface ProjectDialogProps {
  /** The project to edit; null for a new one, which starts from `period`. */
  project: Project | null;
  period: { startDate: string; endDate: string };
  /** The project is no longer in the plan: nothing can be saved. */
  gone: boolean;
  config: RoadmapConfig;
  /** The notes and the assignments of the project, as the plan has them now. */
  notes: ProjectNote[];
  assignments: Assignment[];
  /** The published rules do not know notes, assignments and configuration yet. */
  detailsUnavailable: boolean;
  me: MemoAuthor | null;
  nameOf: (author: MemoAuthor) => string;
  today: string;
  initialTab?: ProjectTab;
  onSave: (content: ProjectContent) => void;
  onDelete: () => void;
  onClose: () => void;
  noteActions: NoteActions;
  /** Opens the window of an assignment, or of a new one when null. */
  onOpenAssignment: (assignment: Assignment | null) => void;
  onDeleteAssignment: (assignment: Assignment) => void;
  onOpenStakeholder: (stakeholder: Stakeholder) => void;
}

const TABS: readonly { id: ProjectTab; label: string }[] = [
  { id: 'project', label: 'Progetto' },
  { id: 'notes', label: 'Note' },
  { id: 'team', label: 'Team' },
];

/**
 * A project of the roadmap, in three tabs: the project (title, period, state, color, owner,
 * description and the custom fields, saved with «Salva»), its notes and the people who work on
 * it (both saved as they change). A new project has the last two tabs once it is created.
 */
export function ProjectDialog({
  project,
  period,
  gone,
  config,
  notes,
  assignments,
  detailsUnavailable,
  me,
  nameOf,
  today,
  initialTab = 'project',
  onSave,
  onDelete,
  onClose,
  noteActions,
  onOpenAssignment,
  onDeleteAssignment,
  onOpenStakeholder,
}: ProjectDialogProps) {
  const fields = sortByPosition(config.fields);
  const [tab, setTab] = useState<ProjectTab>(project ? initialTab : 'project');
  const [title, setTitle] = useState(project?.title ?? '');
  const [startDate, setStartDate] = useState(project?.startDate ?? period.startDate);
  const [endDate, setEndDate] = useState(project?.endDate ?? period.endDate);
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'planned');
  const [colorId, setColorId] = useState<TaskColorId>(project?.colorId ?? DEFAULT_PROJECT_COLOR_ID);
  const [owner, setOwner] = useState(project?.owner ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [drafts, setDrafts] = useState<FieldDrafts>(() =>
    draftsFrom(fields, project?.fields ?? {}),
  );
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formId = useId();
  const titleId = useId();
  const startId = useId();
  const endId = useId();
  const statusId = useId();
  const ownerId = useId();
  const descriptionId = useId();
  const tabsId = useId();
  const datesValid = isIsoDate(startDate) && isIsoDate(endDate);
  const canSave = title.trim() !== '' && datesValid && !gone;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    const { values, problems: found } = valuesFrom(fields, drafts);
    if (Object.keys(found).length > 0) {
      setProblems(found);
      setTab('project');
      return;
    }
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
    if (Object.keys(values).length > 0) content.fields = values;
    onSave(content);
    onClose();
  };

  // One stop of the Tab key: the arrows move between the tabs, and move the focus with them.
  const handleTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const enabled = TABS.filter((item) => project || item.id === 'project');
    const at = enabled.findIndex((item) => item.id === tab);
    const next =
      event.key === 'ArrowRight'
        ? enabled[(at + 1) % enabled.length]
        : event.key === 'ArrowLeft'
          ? enabled[(at - 1 + enabled.length) % enabled.length]
          : event.key === 'Home'
            ? enabled[0]
            : event.key === 'End'
              ? enabled.at(-1)
              : undefined;
    if (!next) return;
    event.preventDefault();
    setTab(next.id);
    document.getElementById(`${tabsId}-${next.id}`)?.focus();
  };

  const counts: Record<ProjectTab, number | null> = {
    project: null,
    notes: notes.length,
    team: assignments.length,
  };

  return (
    <>
      <Dialog
        title={project ? 'Progetto' : 'Nuovo progetto'}
        description={datesValid ? `Roadmap · ${projectPeriod({ startDate, endDate })}` : 'Roadmap'}
        icon={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-strong text-fg">
            <Milestone className="h-4 w-4" aria-hidden="true" />
          </div>
        }
        onClose={onClose}
        className="max-w-2xl"
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
            <Button variant="primary" type="submit" form={formId} disabled={!canSave}>
              {project ? 'Salva' : 'Crea progetto'}
            </Button>
          </>
        }
      >
        {gone && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-warning bg-warning-soft p-3 text-sm text-fg"
          >
            Questo progetto non c&apos;è più: un altro membro l&apos;ha eliminato. Le modifiche non
            si possono salvare.
          </p>
        )}

        <div
          role="tablist"
          aria-label="Parti del progetto"
          onKeyDown={handleTabKey}
          className="mb-4 flex items-center gap-1 border-b border-line"
        >
          {TABS.map((item) => {
            const disabled = !project && item.id !== 'project';
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                id={`${tabsId}-${item.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${tabsId}-panel-${item.id}`}
                aria-disabled={disabled || undefined}
                tabIndex={selected ? 0 : -1}
                title={disabled ? 'Crea il progetto per aggiungere note e persone' : undefined}
                onClick={() => {
                  if (!disabled) setTab(item.id);
                }}
                className={`-mb-px flex cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  selected
                    ? 'border-link text-fg'
                    : 'border-transparent text-fg-muted hover:text-fg'
                } ${disabled ? 'cursor-not-allowed opacity-50 hover:text-fg-muted' : ''}`}
              >
                {item.label}
                {counts[item.id] !== null && (
                  <span className="rounded-full bg-surface-strong px-1.5 text-xs tabular-nums">
                    {counts[item.id]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          id={`${tabsId}-panel-project`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-project`}
          hidden={tab !== 'project'}
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

            <ProjectFieldsEditor
              fields={fields}
              drafts={drafts}
              problems={problems}
              onChange={(fieldId, draft) => {
                setDrafts((current) => ({ ...current, [fieldId]: draft }));
                setProblems((current) => {
                  if (!(fieldId in current)) return current;
                  const { [fieldId]: _gone, ...rest } = current;
                  return rest;
                });
              }}
            />
          </form>
        </div>

        {project && (
          <>
            <div
              id={`${tabsId}-panel-notes`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-notes`}
              hidden={tab !== 'notes'}
            >
              {tab === 'notes' && (
                <ProjectNotesPanel
                  projectId={project.id}
                  notes={notes}
                  unavailable={detailsUnavailable}
                  me={me}
                  nameOf={nameOf}
                  today={today}
                  actions={noteActions}
                />
              )}
            </div>
            <div
              id={`${tabsId}-panel-team`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-team`}
              hidden={tab !== 'team'}
            >
              {tab === 'team' && (
                <ProjectTeamPanel
                  assignments={assignments}
                  config={config}
                  unavailable={detailsUnavailable}
                  onAdd={() => onOpenAssignment(null)}
                  onEdit={onOpenAssignment}
                  onDelete={onDeleteAssignment}
                  onOpenStakeholder={onOpenStakeholder}
                />
              )}
            </div>
          </>
        )}
      </Dialog>

      {confirmDelete && project && !gone && (
        <ConfirmDialog
          title="Eliminare il progetto?"
          message="Il progetto viene tolto dalla roadmap, con le sue note e il lavoro delle persone."
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
