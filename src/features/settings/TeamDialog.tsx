import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Trash, Users } from 'lucide-react';
import { TASK_COLORS } from '../../domain/colors';
import type { TaskColorId } from '../../domain/colors';
import {
  TEAM_NAME_MAX,
  TEAM_PHASES,
  TEAM_PHASE_INFO,
  TEAM_TAG_MAX,
  nextPosition,
  stakeholdersByTeam,
  uniqueId,
} from '../../domain/roadmapConfig';
import { FORMULA_MAX, formulaExample, formulaProblem } from '../../domain/teamFormula';
import type { RoadmapConfig, Stakeholder, Team, TeamPhase } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { Dialog } from '../../shared/ui/Dialog';
import { FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { taskColorStyle } from '../../themes';
import type { RoadmapConfigActions } from '../roadmaps/roadmapActions';
import { StakeholderDialog } from '../roadmaps/StakeholderDialog';

const OPTION =
  'flex cursor-pointer items-start gap-2 rounded-lg border border-line p-2 text-sm hover:bg-surface-strong has-checked:border-accent has-checked:bg-accent-soft';

/** What a formula gives, or why it cannot be used, under its field. */
function FormulaHint({
  id,
  text,
  teams,
  selfId,
}: {
  id: string;
  text: string;
  teams: readonly Team[];
  selfId?: string;
}) {
  const problem = formulaProblem(text, teams, selfId);
  if (problem) {
    return (
      <p id={id} role="alert" className="mt-1 text-xs text-danger">
        {problem}
      </p>
    );
  }
  const example = text.trim() ? formulaExample(text) : null;
  return (
    <p id={id} className="mt-1 text-xs text-fg-muted">
      {example
        ? `Per esempio, ${example}.`
        : 'Numeri, i tag dei team senza formula, le quattro operazioni e le parentesi, per esempio 0.12*(ServerSide+iOSDev+AndDev). Vuota: i giorni si scrivono a mano.'}
    </p>
  );
}

interface TeamEditorProps {
  /** The team to edit; null for a new one. */
  team: Team | null;
  config: RoadmapConfig;
  onSave: (team: Team) => void;
  onClose: () => void;
}

/**
 * A team: its name, the short tag on the bars and in the formulas, its phase in the standard
 * arrangement of a project, the formula of its days, and its color among those of the tasks.
 */
function TeamEditor({ team, config, onSave, onClose }: TeamEditorProps) {
  const [name, setName] = useState(team?.name ?? '');
  const [tag, setTag] = useState(team?.tag ?? '');
  const [phase, setPhase] = useState<TeamPhase>(team?.phase ?? 'development');
  const [formula, setFormula] = useState(team?.formula ?? '');
  const [colorId, setColorId] = useState<TaskColorId>(team?.colorId ?? 'gray');
  const formId = useId();
  const nameId = useId();
  const tagId = useId();
  const formulaId = useId();
  const hintId = useId();
  const valid =
    name.trim() !== '' &&
    tag.trim() !== '' &&
    formulaProblem(formula, config.teams, team?.id) === null;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    const saved: Team = {
      id: team?.id ?? uniqueId(name, config.teams),
      name: name.trim(),
      tag: tag.trim(),
      colorId,
      phase,
      position: team?.position ?? nextPosition(config.teams),
    };
    if (formula.trim()) saved.formula = formula.trim();
    onSave(saved);
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
            <p className="mt-1 text-xs text-fg-muted">
              Sulle barre, e nelle formule degli altri team.
            </p>
          </div>
        </div>

        <fieldset>
          <legend className={LABEL_CLASS}>Fase</legend>
          <div className="grid gap-1.5 sm:grid-cols-3">
            {TEAM_PHASES.map((option) => (
              <label key={option} className={OPTION}>
                <input
                  type="radio"
                  name="phase"
                  value={option}
                  checked={phase === option}
                  onChange={() => setPhase(option)}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block font-semibold">{TEAM_PHASE_INFO[option].label}</span>
                  <span className="block text-xs text-fg-muted">
                    {TEAM_PHASE_INFO[option].description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor={formulaId} className={LABEL_CLASS}>
            Formula dei giorni uomo
          </label>
          <input
            id={formulaId}
            type="text"
            maxLength={FORMULA_MAX}
            placeholder="es. 0.12*(ServerSide+iOSDev+AndDev)"
            value={formula}
            onChange={(event) => setFormula(event.target.value)}
            aria-describedby={hintId}
            aria-invalid={formulaProblem(formula, config.teams, team?.id) ? true : undefined}
            className={`${FIELD_CLASS} font-mono`}
          />
          <FormulaHint id={hintId} text={formula} teams={config.teams} selfId={team?.id} />
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

/**
 * The formula of the contingency: the days of reserve of a project, in a bar of its own after
 * the tests, without a person. Shared by every member, saved with its button.
 */
function ContingencyFormula({
  config,
  onSave,
}: {
  config: RoadmapConfig;
  onSave: (formula: string | null) => void;
}) {
  const [text, setText] = useState(config.contingencyFormula ?? '');
  const fieldId = useId();
  const hintId = useId();
  const headingId = useId();
  const problem = formulaProblem(text, config.teams);
  const dirty = text.trim() !== (config.contingencyFormula ?? '');
  const save = () => {
    if (problem || !dirty) return;
    onSave(text.trim() || null);
  };
  return (
    <section aria-labelledby={headingId} className="rounded-lg border border-line">
      <div
        className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2"
        style={taskColorStyle('gray')}
      >
        <span id={headingId} className="text-sm font-bold">
          Contingency
        </span>
        <span className="text-xs">CONT</span>
      </div>
      <div className="space-y-2 px-3 py-2">
        <p className="text-xs text-fg-muted">
          I giorni di riserva di un progetto: una barra del progetto dopo i test, senza persona. La
          formula li calcola dai giorni dei team, come quella di un team.
        </p>
        <label htmlFor={fieldId} className={LABEL_CLASS}>
          Formula della contingency
        </label>
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-48 flex-1">
            <input
              id={fieldId}
              type="text"
              maxLength={FORMULA_MAX}
              placeholder="es. 0.10*(ServerSide+iOSDev+AndDev)"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  save();
                }
              }}
              aria-describedby={hintId}
              aria-invalid={problem ? true : undefined}
              className={`${FIELD_CLASS} font-mono`}
            />
            <FormulaHint id={hintId} text={text} teams={config.teams} />
          </div>
          <Button onClick={save} disabled={!dirty || problem !== null}>
            Salva la formula
          </Button>
        </div>
      </div>
    </section>
  );
}

interface TeamDialogProps {
  config: RoadmapConfig;
  actions: RoadmapConfigActions;
  onClose: () => void;
}

/**
 * The teams and the people who work on the projects: each team with its color, tag, phase and
 * formula, its people under it, to edit, add or remove; at the bottom, the formula of the
 * contingency.
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
        description="Roadmap · chi lavora ai progetti, in quale team e in quale fase"
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
        <div className="space-y-4">
          {groups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-fg-muted">
              Nessun team: inizia da un team, poi aggiungi le persone.
            </p>
          ) : (
            groups.map(({ team, stakeholders }) => (
              <section
                key={team?.id ?? 'none'}
                aria-label={team?.name ?? 'Senza team'}
                className="rounded-lg border border-line"
              >
                <div
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-line px-3 py-2"
                  style={team ? taskColorStyle(team.colorId) : undefined}
                >
                  <span className="text-sm font-bold">{team?.name ?? 'Senza team'}</span>
                  {team && <span className="text-xs">{team.tag}</span>}
                  {team && <span className="text-xs">· {TEAM_PHASE_INFO[team.phase].label}</span>}
                  {team?.formula && (
                    <span className="font-mono text-xs" title="Formula dei giorni uomo">
                      · {team.formula}
                    </span>
                  )}
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
                        <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                          {stakeholder.name}
                          {stakeholder.default && (
                            <span className="rounded-sm border border-line-strong px-1 text-xs font-medium text-fg-muted">
                              di default
                            </span>
                          )}
                        </p>
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
                        title="Modifica: nome, team, info, membro di default e assenze"
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
            ))
          )}
          <ContingencyFormula
            key={config.contingencyFormula ?? ''}
            config={config}
            onSave={(formula) => actions.onSaveSettings({ contingencyFormula: formula })}
          />
        </div>
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
          message="Il team sparisce dalla configurazione. Le formule che nominano il suo tag non valgono più."
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
