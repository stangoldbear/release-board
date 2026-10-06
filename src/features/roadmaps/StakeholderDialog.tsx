import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Trash, UserRound, X } from 'lucide-react';
import {
  ABSENCES_MAX,
  ABSENCE_REASON_MAX,
  STAKEHOLDER_INFO_MAX,
  STAKEHOLDER_NAME_MAX,
  nextPosition,
  uniqueId,
} from '../../domain/roadmapConfig';
import type { Absence, RoadmapConfig, Stakeholder } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Dialog } from '../../shared/ui/Dialog';
import { DATE_MAX, FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { formatDateToIT, isIsoDate } from '../../utils/dateUtils';
import { ABSENCE_STRIPES } from './AssignmentBar';

interface StakeholderDialogProps {
  /** The person to edit; null for a new one. */
  stakeholder: Stakeholder | null;
  config: RoadmapConfig;
  /** The team a new person starts in, when one is chosen already. */
  defaultTeamId?: string;
  onSave: (stakeholder: Stakeholder) => void;
  /** Removing the person, with their assignments; absent where it is not offered. */
  onDelete?: () => void;
  onClose: () => void;
}

/**
 * Someone who works on the projects: name, team, info and the days they are away, which the bars
 * of their assignments skip. A new person takes an id from the name.
 */
export function StakeholderDialog({
  stakeholder,
  config,
  defaultTeamId,
  onSave,
  onDelete,
  onClose,
}: StakeholderDialogProps) {
  const [name, setName] = useState(stakeholder?.name ?? '');
  const [teamId, setTeamId] = useState(
    stakeholder?.teamId ?? defaultTeamId ?? config.teams[0]?.id ?? '',
  );
  const [info, setInfo] = useState(stakeholder?.info ?? '');
  const [absences, setAbsences] = useState<Absence[]>(stakeholder?.absences ?? []);
  const [draft, setDraft] = useState({ start: '', end: '', reason: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const formId = useId();
  const nameId = useId();
  const teamId_ = useId();
  const infoId = useId();
  const fromId = useId();
  const toId = useId();
  const reasonId = useId();
  const valid = name.trim() !== '' && config.teams.some((team) => team.id === teamId);
  const draftValid = isIsoDate(draft.start) && isIsoDate(draft.end) && draft.start <= draft.end;

  const addAbsence = () => {
    if (!draftValid || absences.length >= ABSENCES_MAX) return;
    const absence: Absence = { start: draft.start, end: draft.end };
    if (draft.reason.trim()) absence.reason = draft.reason.trim();
    setAbsences([...absences, absence].sort((a, b) => a.start.localeCompare(b.start)));
    setDraft({ start: '', end: '', reason: '' });
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    const saved: Stakeholder = {
      id: stakeholder?.id ?? uniqueId(name, config.stakeholders),
      name: name.trim(),
      teamId,
      absences,
      position: stakeholder?.position ?? nextPosition(config.stakeholders),
    };
    if (info.trim()) saved.info = info.trim();
    onSave(saved);
    onClose();
  };

  return (
    <>
      <Dialog
        title={stakeholder ? 'Persona del team' : 'Nuova persona'}
        description="Roadmap · chi lavora ai progetti"
        icon={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-strong text-fg">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </div>
        }
        onClose={onClose}
        className="max-w-lg"
        footer={
          <>
            {stakeholder && onDelete && (
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
            <Button variant="primary" type="submit" form={formId} disabled={!valid}>
              {stakeholder ? 'Salva' : 'Aggiungi'}
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={nameId} className={LABEL_CLASS}>
                Nome *
              </label>
              <input
                id={nameId}
                data-autofocus
                type="text"
                required
                maxLength={STAKEHOLDER_NAME_MAX}
                placeholder="es. iOS Dev #4, o un nome"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor={teamId_} className={LABEL_CLASS}>
                Team *
              </label>
              <select
                id={teamId_}
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
                className={FIELD_CLASS}
              >
                {config.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.tag})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={infoId} className={LABEL_CLASS}>
              Info
            </label>
            <textarea
              id={infoId}
              rows={2}
              maxLength={STAKEHOLDER_INFO_MAX}
              placeholder="Competenze, orario, fornitore…"
              value={info}
              onChange={(event) => setInfo(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          <fieldset className="space-y-2 border-t border-line pt-4">
            <legend className={LABEL_CLASS}>Assenze</legend>
            <p className="text-xs text-fg-muted">
              Ferie e altri giorni in cui non lavora: le barre dei suoi progetti li saltano e li
              mostrano tratteggiati.
            </p>
            {absences.length > 0 && (
              <ul className="space-y-1.5">
                {absences.map((absence) => (
                  <li
                    key={`${absence.start}-${absence.end}`}
                    className="flex items-center gap-2 rounded-md border border-line bg-surface-muted px-2.5 py-1.5 text-sm"
                  >
                    <span
                      aria-hidden="true"
                      className="h-3 w-5 shrink-0 rounded-xs"
                      style={ABSENCE_STRIPES}
                    />
                    <span className="flex-1">
                      {formatDateToIT(absence.start)} – {formatDateToIT(absence.end)}
                      {absence.reason && <span className="text-fg-muted"> · {absence.reason}</span>}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-1"
                      onClick={() => setAbsences(absences.filter((item) => item !== absence))}
                      aria-label={`Rimuovi l'assenza dal ${formatDateToIT(absence.start)}`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor={fromId} className={LABEL_CLASS}>
                  Dal
                </label>
                <input
                  id={fromId}
                  type="date"
                  max={DATE_MAX}
                  value={draft.start}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      start: event.target.value,
                      end: draft.end < event.target.value ? event.target.value : draft.end,
                    })
                  }
                  className={FIELD_CLASS}
                />
              </div>
              <div>
                <label htmlFor={toId} className={LABEL_CLASS}>
                  Al (incluso)
                </label>
                <input
                  id={toId}
                  type="date"
                  max={DATE_MAX}
                  min={draft.start || undefined}
                  value={draft.end}
                  onChange={(event) => setDraft({ ...draft, end: event.target.value })}
                  className={FIELD_CLASS}
                />
              </div>
              <div className="min-w-32 flex-1">
                <label htmlFor={reasonId} className={LABEL_CLASS}>
                  Motivo
                </label>
                <input
                  id={reasonId}
                  type="text"
                  maxLength={ABSENCE_REASON_MAX}
                  placeholder="es. Ferie"
                  value={draft.reason}
                  onChange={(event) => setDraft({ ...draft, reason: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addAbsence();
                    }
                  }}
                  className={FIELD_CLASS}
                />
              </div>
              <Button onClick={addAbsence} disabled={!draftValid}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Aggiungi assenza
              </Button>
            </div>
          </fieldset>
        </form>
      </Dialog>

      {confirmDelete && stakeholder && onDelete && (
        <ConfirmDialog
          title="Eliminare la persona?"
          message="La persona sparisce dalla configurazione e il suo lavoro da tutti i progetti."
          itemTitle={stakeholder.name}
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
