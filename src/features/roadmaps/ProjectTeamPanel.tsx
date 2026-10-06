import { useState } from 'react';
import { Pencil, Plus, Trash } from 'lucide-react';
import { scheduleAssignment } from '../../domain/assignments';
import { teamOf } from '../../domain/roadmapConfig';
import type { Assignment, RoadmapConfig, Stakeholder } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { RulesNotice } from '../../shared/ui/RulesNotice';
import { describeSchedule } from './AssignmentBar';

interface ProjectTeamPanelProps {
  /** The assignments of the project, by start. */
  assignments: Assignment[];
  config: RoadmapConfig;
  /** The published rules do not know the assignments yet: the panel says so, and no more. */
  unavailable: boolean;
  onAdd: () => void;
  onEdit: (assignment: Assignment) => void;
  onDelete: (assignment: Assignment) => void;
  onOpenStakeholder: (stakeholder: Stakeholder) => void;
}

/**
 * Who works on a project: one line per assignment, with the person, their team, the effort and
 * the days it falls on, the absences included; each opens in its window.
 */
export function ProjectTeamPanel({
  assignments,
  config,
  unavailable,
  onAdd,
  onEdit,
  onDelete,
  onOpenStakeholder,
}: ProjectTeamPanelProps) {
  const [toDelete, setToDelete] = useState<Assignment | null>(null);

  if (unavailable) return <RulesNotice what="Le assegnazioni" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-muted">
          Ogni persona lavora al progetto da un giorno, per i giorni del suo impegno: la barra salta
          weekend, festivi e le sue assenze.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={onAdd}
          disabled={config.stakeholders.length === 0}
          title={
            config.stakeholders.length === 0
              ? 'Prima aggiungi le persone in Impostazioni → Roadmap'
              : undefined
          }
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Aggiungi persona
        </Button>
      </div>

      {assignments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-fg-muted">
          {config.stakeholders.length === 0
            ? 'Nessuna persona configurata: le persone e i team si definiscono in Impostazioni → Roadmap.'
            : 'Nessuno lavora ancora a questo progetto.'}
        </p>
      ) : (
        <ul aria-label="Persone che lavorano al progetto" className="space-y-2">
          {assignments.map((assignment) => {
            const stakeholder =
              config.stakeholders.find((item) => item.id === assignment.stakeholderId) ?? null;
            const team = stakeholder ? teamOf(config, stakeholder) : null;
            const schedule = scheduleAssignment(assignment, stakeholder?.absences ?? []);
            return (
              <li
                key={assignment.id}
                className="flex items-start gap-2 rounded-lg border border-line bg-surface p-2.5 text-sm"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-line-strong"
                  style={
                    team ? { backgroundColor: `var(--rb-task-${team.colorId}-border)` } : undefined
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2">
                    {stakeholder ? (
                      <button
                        type="button"
                        onClick={() => onOpenStakeholder(stakeholder)}
                        title="Modifica la persona: nome, team, info e assenze"
                        className="cursor-pointer font-semibold hover:underline"
                      >
                        {stakeholder.name}
                      </button>
                    ) : (
                      <span className="font-semibold text-fg-muted">
                        Persona non più in configurazione
                      </span>
                    )}
                    {team && <span className="text-xs text-fg-muted">{team.tag}</span>}
                  </p>
                  <p className="text-xs text-fg-muted first-letter:uppercase">
                    {describeSchedule(assignment, schedule)}
                  </p>
                  {assignment.note && (
                    <p className="mt-0.5 text-xs whitespace-pre-line">{assignment.note}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1.5"
                    onClick={() => onEdit(assignment)}
                    aria-label={`Modifica il lavoro di ${stakeholder?.name ?? 'questa persona'}`}
                    title="Modifica"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="p-1.5"
                    onClick={() => setToDelete(assignment)}
                    aria-label={`Togli ${stakeholder?.name ?? 'questa persona'} dal progetto`}
                    title="Togli dal progetto"
                  >
                    <Trash className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Togliere la persona dal progetto?"
          message="Il suo lavoro su questo progetto viene tolto dalla roadmap; la persona resta in configurazione."
          itemTitle={
            config.stakeholders.find((item) => item.id === toDelete.stakeholderId)?.name ??
            toDelete.stakeholderId
          }
          confirmLabel="Togli"
          onConfirm={() => {
            onDelete(toDelete);
            setToDelete(null);
          }}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
