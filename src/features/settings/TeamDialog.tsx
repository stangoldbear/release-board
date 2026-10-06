import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Trash, Users } from 'lucide-react';
import { TASK_COLORS } from '../../domain/colors';
import type { TaskColorId } from '../../domain/colors';
import {
  TEAM_NAME_MAX,
  TEAM_TAG_MAX,
  nextPosition,
  stakeholdersByTeam,
  uniqueId,
} from '../../domain/roadmapConfig';
import type { RoadmapConfig, Stakeholder, Team } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Dialog } from '../../shared/ui/Dialog';
import { FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { taskColorStyle } from '../../themes';
import type { RoadmapConfigActions } from '../roadmaps/roadmapActions';
import { StakeholderDialog } from '../roadmaps/StakeholderDialog';

interface TeamEditorProps {
  /** The team to edit; null for a new one. */
  team: Team | null;
  config: RoadmapConfig;
  onSave: (team: Team) => void;
  onClose: () => void;
}

/** A team: its name, the short tag on the bars, and its color among those of the tasks. */
function TeamEditor({ team, config, onSave, onClose }: TeamEditorProps) {
  const [name, setName] = useState(team?.name ?? '');
  const [tag, setTag] = useState(team?.tag ?? '');
  const [colorId, setColorId] = useState<TaskColorId>(team?.colorId ?? 'gray');
  const formId = useId();
  const nameId = useId();
  const tagId = useId();
  const valid = name.trim() !== '' && tag.trim() !== '';

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onSave({
      id: team?.id ?? uniqueId(name, config.teams),
      name: name.trim(),
      tag: tag.trim(),
      colorId,
      position: team?.position ?? nextPosition(config.teams),
    });
    onClose();
  };

  return (
    <Dialog
      title={team ? 'Team' : 'Nuovo team'}
      onClose={onClose}
      className="max-w-lg"
      footer={
        <>
          <Button onClick={onClose}>Annulla</Button>
          <Button variant="primary" type="submit" form={formId} disabled={!valid}>
            {team ? 'Salva' : 'Aggiungi'}
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
              maxLength={TEAM_NAME_MAX}
              placeholder="es. Server side"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={FIELD_CLASS}
            />
          </div>
          <div>
            <label htmlFor={tagId} className={LABEL_CLASS}>
              Tag *
            </label>
            <input
              id={tagId}
              type="text"
              required
              maxLength={TEAM_TAG_MAX}
              placeholder="es. ServerSide"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
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
          <p className="mt-1.5 text-xs text-fg-muted">
            I colori sono quelli delle attività, leggibili in ogni tema; un team già usato da un
            altro resta distinguibile dal suo tag.
          </p>
        </fieldset>
      </form>
    </Dialog>
  );
}

interface TeamDialogProps {
  config: RoadmapConfig;
  actions: RoadmapConfigActions;
  onClose: () => void;
}

/**
 * The teams and the people who work on the projects: each team with its color and tag, its
 * people under it, to edit, add or remove.
 */
export function TeamDialog({ config, actions, onClose }: TeamDialogProps) {
  const groups = stakeholdersByTeam(config);
  const [teamEditor, setTeamEditor] = useState<Team | null | 'new'>(null);
  const [personEditor, setPersonEditor] = useState<{
    stakeholder: Stakeholder | null;
    teamId?: string;
  } | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  return (
    <>
      <Dialog
        title="Team e persone"
        description="Roadmap · chi lavora ai progetti, e in quale team"
        icon={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-strong text-fg">
            <Users className="h-4 w-4" aria-hidden="true" />
          </div>
        }
        onClose={onClose}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="primary" className="mr-auto" onClick={() => setTeamEditor('new')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nuovo team
            </Button>
            <Button onClick={onClose}>Chiudi</Button>
          </>
        }
      >
        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-fg-muted">
            Nessun team: inizia da un team, poi aggiungi le persone.
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map(({ team, stakeholders }) => (
              <section
                key={team?.id ?? 'none'}
                aria-label={team?.name ?? 'Senza team'}
                className="rounded-lg border border-line"
              >
                <div
                  className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2"
                  style={team ? taskColorStyle(team.colorId) : undefined}
                >
                  <span className="text-sm font-bold">{team?.name ?? 'Senza team'}</span>
                  {team && <span className="text-xs">{team.tag}</span>}
                  {team && (
                    <div className="ml-auto flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-1.5 text-current hover:bg-current/15 hover:text-current"
                        onClick={() => setTeamEditor(team)}
                        aria-label={`Modifica il team ${team.name}`}
                        title="Modifica il team"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-1.5 text-current hover:bg-current/15 hover:text-current disabled:opacity-40"
                        disabled={stakeholders.length > 0}
                        onClick={() => setTeamToDelete(team)}
                        aria-label={`Elimina il team ${team.name}`}
                        title={
                          stakeholders.length > 0
                            ? 'Prima sposta le sue persone in un altro team'
                            : 'Elimina il team'
                        }
                      >
                        <Trash className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </div>
                <ul className="divide-y divide-line">
                  {stakeholders.map((stakeholder) => (
                    <li key={stakeholder.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{stakeholder.name}</p>
                        <p className="text-xs text-fg-muted">
                          {[
                            stakeholder.info,
                            stakeholder.absences.length > 0
                              ? `${stakeholder.absences.length} ${stakeholder.absences.length === 1 ? 'assenza' : 'assenze'}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'Nessuna info, nessuna assenza'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-1.5"
                        onClick={() => setPersonEditor({ stakeholder })}
                        aria-label={`Modifica ${stakeholder.name}`}
                        title="Modifica: nome, team, info e assenze"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                  {team && (
                    <li className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setPersonEditor({ stakeholder: null, teamId: team.id })}
                        className="flex cursor-pointer items-center gap-1 text-xs font-medium text-link hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        Persona in {team.name}
                      </button>
                    </li>
                  )}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Dialog>

      {teamEditor && (
        <TeamEditor
          team={teamEditor === 'new' ? null : teamEditor}
          config={config}
          onSave={actions.onSaveTeam}
          onClose={() => setTeamEditor(null)}
        />
      )}
      {personEditor && (
        <StakeholderDialog
          stakeholder={personEditor.stakeholder}
          config={config}
          defaultTeamId={personEditor.teamId}
          onSave={actions.onSaveStakeholder}
          onDelete={
            personEditor.stakeholder
              ? () => actions.onDeleteStakeholder(personEditor.stakeholder!.id)
              : undefined
          }
          onClose={() => setPersonEditor(null)}
        />
      )}
      {teamToDelete && (
        <ConfirmDialog
          title="Eliminare il team?"
          message="Il team sparisce dalla configurazione."
          itemTitle={teamToDelete.name}
          confirmLabel="Elimina"
          onConfirm={() => {
            actions.onDeleteTeam(teamToDelete.id);
            setTeamToDelete(null);
          }}
          onCancel={() => setTeamToDelete(null)}
        />
      )}
    </>
  );
}
