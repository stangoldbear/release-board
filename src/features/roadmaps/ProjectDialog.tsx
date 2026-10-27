import { useId, useMemo, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Milestone, Trash, UserRound, TriangleAlert } from 'lucide-react';
import { LABELS_FIELD_ID, customFields, labelsFieldOf } from '../../domain/labels';
import { TASK_COLORS } from '../../domain/colors';
import type { TaskColorId } from '../../domain/colors';
import { formatLocaleNumber } from '../../domain/numberFormat';
import { projectSpan } from '../../domain/projectSpan';
import {
  PROJECT_ARRANGEMENTS,
  PROJECT_ARRANGEMENT_INFO,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_OWNER_MAX,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  PROJECT_TITLE_MAX,
  arrangementOf,
} from '../../domain/projects';
import type { ProjectContent } from '../../domain/projects';
import type { StatusChange } from '../../domain/projectStatus';
import {
  DEFAULT_PROJECT_COLORS,
  projectColorField,
  projectColorOf,
  sortByPosition,
} from '../../domain/roadmapConfig';
import { REMIND_DAYS_OPTIONS } from '../../domain/projectReminders';
import { planTeam } from '../../domain/teamPlan';
import type { TeamPlan } from '../../domain/teamPlan';
import type {
  Assignment,
  MemoAuthor,
  Project,
  ProjectArrangement,
  ProjectNote,
  ProjectStatus,
  RoadmapConfig,
} from '../../domain/types';
import { oneOf, usePreference } from '../../infra/preferences';
import { useFormatDate } from '../../shared/dateFormat';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Dialog } from '../../shared/ui/Dialog';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { SEGMENT, SEGMENTED, SEGMENT_OFF, SEGMENT_ON } from '../../shared/ui/segmented';
import { taskColorStyle } from '../../themes';
import { isIsoDate } from '../../utils/dateUtils';
import { draftsFrom, valuesFrom } from './fieldDrafts';
import type { FieldDraft, FieldDrafts } from './fieldDrafts';
import { FieldEditor, ProjectFieldsEditor } from './ProjectFieldsEditor';
import { LabelsPicker } from './LabelsPicker';
import { ProjectNotesPanel } from './ProjectNotesPanel';
import { emptyNoteDraft, noteDraftContent } from './NoteEditor';
import { ProjectStatusMark } from './projectUi';
import type { NoteActions } from './roadmapActions';
import { projectPeriod } from './roadmapLayout';
import { initialRows, toTeamRows } from './teamEffort';
import type { EffortRow } from './teamEffort';
import { TeamEffortTable } from './TeamEffortTable';
import { MarkdownTextarea } from '../../shared/ui/MarkdownTextarea';

/** The two parts of the window: the project itself, and its notes. */
export type ProjectTab = 'project' | 'notes';

/** The standard view has the few fields that matter at once; the advanced one everything. */
type DialogView = 'standard' | 'advanced';
const VIEWS: readonly { id: DialogView; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'advanced', label: 'Avanzata' },
];

interface ProjectDialogProps {
  /** The project to edit; null for a new one, which starts from `defaultStart`. */
  project: Project | null;
  defaultStart: string;
  /** The color of a new project when the colors are free: the one after the last project's. */
  defaultColorId: TaskColorId;
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
  /** The state the dates give the project, when it differs from the stored one: proposed, saving confirms it. */
  statusChange?: StatusChange | null;
  initialTab?: ProjectTab;
  /** Saves the project, new or edited, and returns its id. */
  onSubmit: (content: ProjectContent) => string;
  onDelete: () => void;
  onClose: () => void;
  noteActions: NoteActions;
  /** Brings the work of the team to the rows of the table, once the project is saved. */
  onSaveTeam: (projectId: string, plan: TeamPlan) => void;
  /** Every project in the order of the members, for the choice of the position. */
  order: readonly Pick<Project, 'id' | 'title'>[];
  onReorder: (projectId: string, beforeId: string | null) => void;
  /** Opens the window of an assignment: its start and its note. */
  onOpenAssignment: (assignment: Assignment) => void;
  /** Adds a label to the plan and returns its id; absent when labels cannot be created. */
  onCreateLabel?: (name: string) => string | null;
  /** The labels a new project starts with: those the timeline filters by, so that it stays in view. */
  defaultLabelIds?: readonly string[];
}

const TABS: readonly { id: ProjectTab; label: string }[] = [
  { id: 'project', label: 'Progetto' },
  { id: 'notes', label: 'Note' },
];

/**
 * A project of the roadmap: the project itself, in a standard view with the title, the start, the
 * days of the team, the arrangement, the main fields and the deadline, or in an advanced view with
 * everything, both over the same draft; and its notes, saved as they change. Saving the project
 * also brings the work of the team to the rows of its table.
 */
export function ProjectDialog({
  project,
  defaultStart,
  defaultColorId,
  gone,
  config,
  notes,
  assignments,
  detailsUnavailable,
  me,
  nameOf,
  today,
  statusChange = null,
  initialTab = 'project',
  onSubmit,
  onDelete,
  onClose,
  noteActions,
  onSaveTeam,
  order,
  onReorder,
  onOpenAssignment,
  onCreateLabel,
  defaultLabelIds = [],
}: ProjectDialogProps) {
  const formatDate = useFormatDate();
  // The field of the tag of the project, as «Dimensione», comes right after the title in both
  // views; the other fields follow the view.
  const sizeField = projectColorField(config);
  // The labels have a field of their own, right after the tag, in both views too.
  const labelsField = labelsFieldOf(config);
  const fields = sortByPosition(customFields(config.fields)).filter(
    (field) => field.id !== sizeField?.id,
  );
  const quickFields = fields.filter((field) => field.quick);
  const [view, setView] = usePreference<DialogView>(
    'project-dialog-view',
    oneOf(VIEWS.map((item) => item.id)),
    'standard',
  );
  const [tab, setTab] = useState<ProjectTab>(project ? initialTab : 'project');
  const [noteDraft, setNoteDraft] = useState(emptyNoteDraft);
  const [title, setTitle] = useState(project?.title ?? '');
  const [startDate, setStartDate] = useState(project?.startDate ?? defaultStart);
  const [deadline, setDeadline] = useState(project?.deadline ?? '');
  const [remind, setRemind] = useState<number | null>(project?.remindDaysBefore ?? null);
  const remindId = useId();
  const [arrangement, setArrangement] = useState<ProjectArrangement>(
    project ? arrangementOf(project) : 'standard',
  );
  const [status, setStatus] = useState<ProjectStatus>(
    statusChange?.to ?? project?.status ?? 'planned',
  );
  const [colorId, setColorId] = useState<TaskColorId>(project?.colorId ?? defaultColorId);
  const [owner, setOwner] = useState(project?.owner ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [drafts, setDrafts] = useState<FieldDrafts>(() =>
    draftsFrom(
      config.fields,
      project?.fields ??
        (defaultLabelIds.length > 0 ? { [LABELS_FIELD_ID]: [...defaultLabelIds] } : {}),
    ),
  );
  // The field that colors the projects, when the colors come from a field: the window shows the
  // color it gives rather than asking for one.
  const colorField =
    (config.projectColors ?? DEFAULT_PROJECT_COLORS) === 'field' ? projectColorField(config) : null;
  const shownColorId = colorField
    ? projectColorOf({ colorId, fields: valuesFrom(config.fields, drafts).values }, config)
    : colorId;
  const [rows, setRows] = useState<EffortRow[]>(() => initialRows(project, assignments, config));
  const [problems, setProblems] = useState<Record<string, string>>({});
  // The project that comes before this one; "start" for the first place.
  const others = order.filter((item) => item.id !== project?.id);
  const currentAt = project ? order.findIndex((item) => item.id === project.id) : -1;
  const initialAfter = currentAt > 0 ? (order[currentAt - 1]?.id ?? 'start') : 'start';
  const [after, setAfter] = useState(initialAfter);
  const positionId = useId();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formId = useId();
  const titleId = useId();
  const startId = useId();
  const deadlineId = useId();
  const arrangementId = useId();
  const statusId = useId();
  const ownerId = useId();
  const descriptionId = useId();
  const tabsId = useId();
  const viewsId = useId();

  const startValid = isIsoDate(startDate);
  const deadlineValid = deadline === '' || isIsoDate(deadline);
  const teamRows = useMemo(() => toTeamRows(rows, config), [rows, config]);
  const teamDays = teamRows.team.length > 0 || teamRows.contingency !== null;

  // Where the project would fall once saved: the bars placed by the arrangement, the span after them.
  const preview = useMemo(() => {
    if (!startValid) return null;
    const base = {
      id: project?.id ?? 'new',
      startDate,
      arrangement,
      contingency: project?.contingency,
    };
    const plan = planTeam(base, assignments, teamRows.team, teamRows.contingency, config);
    const kept = assignments
      .filter((item) => !plan.remove.includes(item.id))
      .map((item) => {
        const update = plan.update.find((change) => change.id === item.id);
        return update ? { ...item, ...update.changes, note: item.note } : item;
      });
    const created = plan.create.map((content, index) => ({ ...content, id: `new-${index}` }));
    const draft: Project = {
      id: base.id,
      title: title || 'Progetto',
      startDate,
      colorId,
      status,
    };
    if (deadline && isIsoDate(deadline)) draft.deadline = deadline;
    if (plan.contingency) draft.contingency = plan.contingency;
    return {
      plan,
      span: projectSpan(draft, [...kept, ...created] as Assignment[], config),
    };
  }, [
    startValid,
    startDate,
    arrangement,
    project,
    assignments,
    teamRows,
    config,
    title,
    colorId,
    status,
    deadline,
  ]);

  const labelsDraft = drafts[LABELS_FIELD_ID];
  const labelIds = labelsDraft?.kind === 'choice' ? labelsDraft.ids : [];

  const changeDraft = (fieldId: string, draft: FieldDraft) => {
    setDrafts((current) => ({ ...current, [fieldId]: draft }));
    setProblems((current) => {
      if (!(fieldId in current)) return current;
      const { [fieldId]: _gone, ...rest } = current;
      return rest;
    });
  };

  const pendingNote = project ? noteDraftContent(project.id, noteDraft) : null;
  const canSave =
    title.trim() !== '' &&
    startValid &&
    deadlineValid &&
    !gone &&
    (!noteDraft.text.trim() || pendingNote !== null);

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || !preview) return;
    const { values, problems: found } = valuesFrom(config.fields, drafts);
    if (Object.keys(found).length > 0) {
      setProblems(found);
      setTab('project');
      // The field with the problem may be in the advanced view only.
      if (!sizeField || !(sizeField.id in found)) {
        if (!quickFields.some((field) => field.id in found)) setView('advanced');
      }
      return;
    }
    const content: ProjectContent = { title: title.trim(), startDate, colorId, status };
    if (deadline && isIsoDate(deadline)) content.deadline = deadline;
    if (remind !== null) content.remindDaysBefore = remind;
    if (preview.plan.contingency) content.contingency = preview.plan.contingency;
    if (arrangement !== 'standard') content.arrangement = arrangement;
    if (owner.trim()) content.owner = owner.trim();
    if (description.trim()) content.description = description.trim();
    if (Object.keys(values).length > 0) content.fields = values;
    const id = onSubmit(content);
    onSaveTeam(id, preview.plan);
    if (pendingNote) noteActions.onCreate(pendingNote);
    if (project && after !== initialAfter) {
      const at = after === 'start' ? 0 : others.findIndex((item) => item.id === after) + 1;
      onReorder(id, others[at]?.id ?? null);
    }
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

  const advanced = view === 'advanced';
  const span = preview?.span ?? null;
  const summary = span ? (
    <>
      <span className="tabular-nums">
        {formatLocaleNumber(span.totalManDays, Number.isInteger(span.totalManDays) ? 0 : 1)}
      </span>{' '}
      {span.totalManDays === 1 ? 'giorno uomo' : 'giorni uomo'}
      {span.work && (
        <span className="font-normal text-fg-muted">
          {' '}
          · lavoro dal {formatDate(span.work.start)} al {formatDate(span.work.end)}
        </span>
      )}
      {span.late && <span className="font-semibold text-danger"> · oltre la deadline</span>}
    </>
  ) : (
    '—'
  );

  const dateField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { required?: boolean; min?: string; hint?: string } = {},
  ) => (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {options.required && ' *'}
      </label>
      <input
        id={id}
        type="date"
        required={options.required}
        max={DATE_MAX}
        min={options.min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={FIELD_CLASS}
      />
      {options.hint && <p className="mt-1 text-xs text-fg-muted">{options.hint}</p>}
    </div>
  );

  return (
    <>
      <Dialog
        title={project ? 'Progetto' : 'Nuovo progetto'}
        description={
          span
            ? `Roadmap · ${projectPeriod({ startDate: span.start, endDate: span.end })}`
            : 'Roadmap'
        }
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

        <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-line">
          <div
            role="tablist"
            aria-label="Parti del progetto"
            onKeyDown={handleTabKey}
            className="flex items-center gap-1"
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
                  title={disabled ? 'Crea il progetto per aggiungere le note' : undefined}
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
                  {item.id === 'notes' && (
                    <span className="rounded-full bg-surface-strong px-1.5 text-xs tabular-nums">
                      {notes.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {tab === 'project' && (
            <div
              role="group"
              aria-labelledby={viewsId}
              className="mb-1.5 ml-auto flex items-center gap-2"
            >
              <span id={viewsId} className="text-xs font-bold tracking-wide uppercase">
                Vista
              </span>
              <div className={SEGMENTED}>
                {VIEWS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={view === item.id}
                    onClick={() => setView(item.id)}
                    className={`${SEGMENT} ${view === item.id ? SEGMENT_ON : SEGMENT_OFF}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          id={`${tabsId}-panel-project`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-project`}
          hidden={tab !== 'project'}
        >
          <form id={formId} onSubmit={save} className="space-y-4">
            {statusChange && status === statusChange.to && (
              <p className="flex items-start gap-2 rounded-lg border border-warning bg-warning-soft px-3 py-2 text-xs">
                <TriangleAlert
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning"
                  aria-hidden="true"
                />
                <span>
                  Le date dicono «{PROJECT_STATUS_LABELS[statusChange.to]}» (era «
                  {PROJECT_STATUS_LABELS[statusChange.from]}»): salvando confermi il nuovo stato. Lo
                  stato si cambia nella vista avanzata.
                </span>
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

            {sizeField && (
              <FieldEditor
                field={sizeField}
                drafts={drafts}
                problems={problems}
                onChange={changeDraft}
              />
            )}

            {(labelsField || onCreateLabel) && (
              <LabelsPicker
                labels={labelsField?.options ?? []}
                selected={labelIds}
                onChange={(ids) => changeDraft(LABELS_FIELD_ID, { kind: 'choice', ids })}
                onCreate={onCreateLabel}
              />
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {dateField(startId, 'Data inizio lavori del team', startDate, setStartDate, {
                required: true,
              })}
              {dateField(deadlineId, 'Deadline', deadline, setDeadline, {
                min: startDate || undefined,
                hint: 'Oltre questo giorno il progetto non può andare online: la roadmap segna dove il lavoro la supera.',
              })}
            </div>

            {advanced && (
              <div>
                <label htmlFor={remindId} className={LABEL_CLASS}>
                  Avviso di scadenza
                </label>
                <select
                  id={remindId}
                  value={remind === null ? '' : String(remind)}
                  onChange={(event) =>
                    setRemind(event.target.value === '' ? null : Number(event.target.value))
                  }
                  className={FIELD_CLASS}
                >
                  {REMIND_DAYS_OPTIONS.map((option) => (
                    <option key={option.days ?? 'none'} value={option.days ?? ''}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-fg-muted">
                  Una finestra all&apos;apertura della bacheca, una volta per browser: sulla
                  deadline, o senza di essa sulla fine del lavoro del progetto.
                </p>
              </div>
            )}

            <div>
              <span className={LABEL_CLASS}>Giorni uomo del team</span>
              <TeamEffortTable
                rows={rows}
                onRowsChange={setRows}
                config={config}
                summary={summary}
                onOpenAssignment={(assignmentId) => {
                  const assignment = assignments.find((item) => item.id === assignmentId);
                  if (assignment) onOpenAssignment(assignment);
                }}
              />
              {!teamDays && (
                <p className="mt-1.5 text-xs text-fg-muted">
                  Il progetto dura quanto il lavoro del team: senza giorni la barra è lunga un
                  giorno, quello d&apos;inizio.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={arrangementId} className={LABEL_CLASS}>
                  Disposizione nel Gantt
                </label>
                <select
                  id={arrangementId}
                  value={arrangement}
                  onChange={(event) => setArrangement(event.target.value as ProjectArrangement)}
                  className={FIELD_CLASS}
                >
                  {PROJECT_ARRANGEMENTS.map((option) => (
                    <option key={option} value={option}>
                      {PROJECT_ARRANGEMENT_INFO[option].label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-fg-muted">
                  {PROJECT_ARRANGEMENT_INFO[arrangement].description}
                </p>
              </div>
              {advanced && (
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
                  {statusChange && (
                    <p className="mt-1 text-xs text-fg-muted">
                      Suggerito dalle date: era «{PROJECT_STATUS_LABELS[statusChange.from]}».
                    </p>
                  )}
                </div>
              )}
            </div>

            {advanced && (
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
            )}

            {colorField ? (
              <p className="text-xs text-fg-muted">
                Il colore della barra viene dal campo «{colorField.label}», sotto il titolo: lo
                cambia Impostazioni → Roadmap → «Colori dei progetti».
              </p>
            ) : (
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
                        colorId === color.id
                          ? 'ring-2 ring-fg ring-offset-1 ring-offset-surface'
                          : ''
                      }`}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-full border-2 border-current" />
                      <span className="truncate">{color.name}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="rounded-lg border border-line bg-surface-muted p-3">
              <span className="mb-1.5 block text-xs font-semibold tracking-wide text-fg-muted uppercase">
                Anteprima
              </span>
              <div
                style={taskColorStyle(shownColorId)}
                className="flex items-center gap-1.5 rounded-xs border-2 px-2 py-1.5 text-xs font-semibold shadow-xs"
              >
                <ProjectStatusMark status={status} iconOnly />
                <span className="truncate">{title.trim() || 'Titolo del progetto'}</span>
                {span && span.totalManDays > 0 && (
                  <span className="ml-auto shrink-0 font-normal tabular-nums">
                    {formatLocaleNumber(
                      span.totalManDays,
                      Number.isInteger(span.totalManDays) ? 0 : 1,
                    )}{' '}
                    gg
                  </span>
                )}
              </div>
            </div>

            {advanced && project && others.length > 0 && (
              <div>
                <label htmlFor={positionId} className={LABEL_CLASS}>
                  Posizione nella roadmap
                </label>
                <select
                  id={positionId}
                  value={after}
                  onChange={(event) => setAfter(event.target.value)}
                  className={FIELD_CLASS}
                >
                  <option value="start">All&apos;inizio</option>
                  {others.map((item) => (
                    <option key={item.id} value={item.id}>
                      Dopo «{item.title}»
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-fg-muted">
                  L&apos;ordine «Personalizzato» delle righe, uguale per tutti; dalla roadmap si
                  trascina la riga, o Alt + frecce su e giù sulla barra.
                </p>
              </div>
            )}

            {advanced && (
              <div>
                <label htmlFor={descriptionId} className={LABEL_CLASS}>
                  Descrizione
                </label>
                <MarkdownTextarea
                  id={descriptionId}
                  label="Descrizione"
                  rows={4}
                  maxLength={PROJECT_DESCRIPTION_MAX}
                  placeholder="Obiettivi, tappe, link…"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            )}

            <ProjectFieldsEditor
              fields={advanced ? fields : quickFields}
              drafts={drafts}
              problems={problems}
              onChange={changeDraft}
            />
            {!advanced && fields.length > quickFields.length && (
              <p className="text-xs text-fg-muted">
                Stato, responsabile, descrizione e gli altri campi sono nella vista avanzata.
              </p>
            )}
          </form>
        </div>

        {project && (
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
                draft={noteDraft}
                onDraftChange={setNoteDraft}
              />
            )}
          </div>
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
