import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Trash, Users } from 'lucide-react';
import {
  ASSIGNMENT_NOTE_MAX,
  DAYS_PER_WEEK,
  MAN_DAYS_MAX,
  describeEffort,
  isValidManDays,
  scheduleAssignment,
} from '../../domain/assignments';
import type { AssignmentContent } from '../../domain/assignments';
import { stakeholdersByTeam } from '../../domain/roadmapConfig';
import type { Assignment, RoadmapConfig } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Dialog } from '../../shared/ui/Dialog';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { formatDateToIT, isIsoDate } from '../../utils/dateUtils';

interface AssignmentDialogProps {
  /** The assignment to edit; null for a new one on the project. */
  assignment: Assignment | null;
  projectId: string;
  projectTitle: string;
  config: RoadmapConfig;
  /** The day a new assignment starts from. */
  defaultStart: string;
  onSave: (content: AssignmentContent) => void;
  onDelete: () => void;
  onClose: () => void;
}

type Unit = 'days' | 'weeks';

/**
 * The work of a person on a project: who, from which day, for how many days or weeks, with a
 * note. The window shows where the work falls, the days away included.
 */
export function AssignmentDialog({
  assignment,
  projectId,
  projectTitle,
  config,
  defaultStart,
  onSave,
  onDelete,
  onClose,
}: AssignmentDialogProps) {
  const groups = stakeholdersByTeam(config);
  const [stakeholderId, setStakeholderId] = useState(
    assignment?.stakeholderId ?? config.stakeholders[0]?.id ?? '',
  );
  const [startDate, setStartDate] = useState(assignment?.startDate ?? defaultStart);
  const initialWeeks =
    assignment !== null &&
    assignment.manDays >= DAYS_PER_WEEK &&
    assignment.manDays % DAYS_PER_WEEK === 0;
  const [unit, setUnit] = useState<Unit>(initialWeeks ? 'weeks' : 'days');
  const [effort, setEffort] = useState(
    assignment
      ? String(initialWeeks ? assignment.manDays / DAYS_PER_WEEK : assignment.manDays)
      : '5',
  );
  const [note, setNote] = useState(assignment?.note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formId = useId();
  const whoId = useId();
  const startId = useId();
  const effortId = useId();
  const unitId = useId();
  const noteId = useId();
  const previewId = useId();

  const amount = Number(effort.replace(',', '.'));
  const manDays =
    Number.isFinite(amount) && amount > 0
      ? Math.round((unit === 'weeks' ? amount * DAYS_PER_WEEK : amount) * 2) / 2
      : NaN;
  const effortValid = isValidManDays(manDays);
  const stakeholder = config.stakeholders.find((item) => item.id === stakeholderId) ?? null;
  const valid = stakeholder !== null && isIsoDate(startDate) && effortValid;
  const schedule = valid ? scheduleAssignment({ startDate, manDays }, stakeholder.absences) : null;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    const content: AssignmentContent = { projectId, stakeholderId, startDate, manDays };
    if (note.trim()) content.note = note.trim();
    onSave(content);
    onClose();
  };

  return (
    <>
      <Dialog
        title={assignment ? 'Lavoro sul progetto' : 'Aggiungi una persona'}
        description={projectTitle}
        icon={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-strong text-fg">
            <Users className="h-4 w-4" aria-hidden="true" />
          </div>
        }
        onClose={onClose}
        className="max-w-lg"
        footer={
          <>
            {assignment && (
              <Button
                variant="danger-subtle"
                className="mr-auto"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash className="h-4 w-4" aria-hidden="true" />
                Togli dal progetto
              </Button>
            )}
            <Button onClick={onClose}>Annulla</Button>
            <Button variant="primary" type="submit" form={formId} disabled={!valid}>
              {assignment ? 'Salva' : 'Aggiungi'}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={save} className="space-y-4">
          <div>
            <label htmlFor={whoId} className={LABEL_CLASS}>
              Persona *
            </label>
            <select
              id={whoId}
              data-autofocus
              value={stakeholderId}
              onChange={(event) => setStakeholderId(event.target.value)}
              className={FIELD_CLASS}
            >
              {groups.map((group) => (
                <optgroup key={group.team?.id ?? 'none'} label={group.team?.name ?? 'Senza team'}>
                  {group.stakeholders.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {stakeholder?.info && <p className="mt-1 text-xs text-fg-muted">{stakeholder.info}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={startId} className={LABEL_CLASS}>
                Dal giorno *
              </label>
              <input
                id={startId}
                type="date"
                required
                max={DATE_MAX}
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor={effortId} className={LABEL_CLASS}>
                Impegno *
              </label>
              <div className="flex gap-2">
                <input
                  id={effortId}
                  type="number"
                  required
                  min={unit === 'weeks' ? 0.2 : 0.5}
                  max={unit === 'weeks' ? MAN_DAYS_MAX / DAYS_PER_WEEK : MAN_DAYS_MAX}
                  step={unit === 'weeks' ? 0.2 : 0.5}
                  value={effort}
                  onChange={(event) => setEffort(event.target.value)}
                  aria-invalid={effort !== '' && !effortValid ? true : undefined}
                  aria-describedby={previewId}
                  className={`${FIELD_CLASS} flex-1`}
                />
                <select
                  id={unitId}
                  aria-label="Unità dell'impegno"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value as Unit)}
                  className={`${FIELD_CLASS} w-32`}
                >
                  <option value="days">giorni</option>
                  <option value="weeks">settimane</option>
                </select>
              </div>
            </div>
          </div>

          <div
            id={previewId}
            className="rounded-lg border border-line bg-surface-muted px-3 py-2 text-xs text-fg-muted"
          >
            {schedule ? (
              <>
                <span className="font-semibold text-fg">{describeEffort(manDays)}</span> di lavoro,{' '}
                dal <strong className="text-fg">{formatDateToIT(schedule.start)}</strong> al{' '}
                <strong className="text-fg">{formatDateToIT(schedule.end)}</strong>, saltando
                weekend e festivi
                {schedule.absences.length > 0 && (
                  <>
                    {' '}
                    e le assenze:{' '}
                    {schedule.absences
                      .map(
                        (absence) =>
                          `${formatDateToIT(absence.start)} – ${formatDateToIT(absence.end)}`,
                      )
                      .join(', ')}
                  </>
                )}
                .{schedule.truncated && ' Il lavoro non entra nel limite dei giorni.'}
              </>
            ) : (
              `Una settimana vale ${DAYS_PER_WEEK} giorni di lavoro; l'impegno va da mezza giornata a ${MAN_DAYS_MAX} giorni.`
            )}
          </div>

          <div>
            <label htmlFor={noteId} className={LABEL_CLASS}>
              Nota
            </label>
            <textarea
              id={noteId}
              rows={2}
              maxLength={ASSIGNMENT_NOTE_MAX}
              placeholder="Cosa fa, su quale parte del progetto…"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
        </form>
      </Dialog>

      {confirmDelete && assignment && (
        <ConfirmDialog
          title="Togliere la persona dal progetto?"
          message="Il suo lavoro su questo progetto viene tolto dalla roadmap; la persona resta in configurazione."
          itemTitle={stakeholder?.name}
          confirmLabel="Togli"
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
