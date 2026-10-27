import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  GripVertical,
  Palette,
  Pencil,
  Plus,
  Trash,
  Users,
} from 'lucide-react';
import { TASK_COLORS } from '../../domain/colors';
import type { TaskColorId } from '../../domain/colors';
import {
  TEAM_NAME_MAX,
  TEAM_PHASES,
  TEAM_PHASE_INFO,
  TEAM_TAG_MAX,
  movedPositions,
  nextPosition,
  stakeholdersByTeam,
  uniqueId,
} from '../../domain/roadmapConfig';
import {
  FORMULA_MAX,
  formulaExample,
  formulaInputTeams,
  formulaProblem,
  formulaSamples,
} from '../../domain/teamFormula';
import type { RoadmapConfig, Stakeholder, Team, TeamPhase } from '../../domain/types';
import { usePreference } from '../../infra/preferences';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { CopyButton } from '../../shared/ui/CopyButton';
import { Dialog } from '../../shared/ui/Dialog';
import { FIELD_CLASS, LABEL_CLASS } from '../../shared/ui/field';
import { Menu } from '../../shared/ui/Menu';
import type { MenuItem } from '../../shared/ui/Menu';
import { useListDrag } from '../../shared/useListDrag';
import { taskColorStyle } from '../../themes';
import type { RoadmapConfigActions } from '../roadmaps/roadmapActions';
import { ColorSwatch } from './ColorMenu';
import { StakeholderDialog } from '../roadmaps/StakeholderDialog';
import { markdownToPlainText } from '../../utils/markdown';

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

/** The drag and drop type of the teams, so that nothing else lands among them. */
const TEAM_DRAG_TYPE = 'application/x-release-board-team';

/** The buttons of the header of a team, in its color. */
const HEADER_BUTTON = 'p-1.5 text-current hover:bg-current/15 hover:text-current';

/** The teams the user folded in this window, by id: a convenience of the browser. */
function readFolded(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;
}

/** The team with a new formula; null removes it. */
function withFormula(team: Team, formula: string | null): Team {
  const { formula: _previous, ...rest } = team;
  return formula ? { ...rest, formula } : rest;
}

interface FormulaFieldProps {
  /** The label; with words for the screen readers when several formulas share it. */
  label: ReactNode;
  /** The formula saved, if any. */
  value?: string;
  teams: readonly Team[];
  /** The team the formula is for, which it cannot name. */
  selfId?: string;
  placeholder: string;
  /** The name of the save button, different for every formula of the window. */
  saveLabel: string;
  onSave: (formula: string | null) => void;
}

/** A formula edited where it is shown, saved with its button or Enter; blank removes it. */
function FormulaField({
  label,
  value,
  teams,
  selfId,
  placeholder,
  saveLabel,
  onSave,
}: FormulaFieldProps) {
  const [text, setText] = useState(value ?? '');
  const fieldId = useId();
  const hintId = useId();
  const problem = formulaProblem(text, teams, selfId);
  const dirty = text.trim() !== (value ?? '');
  const save = () => {
    if (problem || !dirty) return;
    onSave(text.trim() || null);
  };
  return (
    <div>
      <label htmlFor={fieldId} className={LABEL_CLASS}>
        {label}
      </label>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-48 flex-1">
          <input
            id={fieldId}
            type="text"
            maxLength={FORMULA_MAX}
            placeholder={placeholder}
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
          <FormulaHint id={hintId} text={text} teams={teams} selfId={selfId} />
        </div>
        <Button onClick={save} disabled={!dirty || problem !== null} aria-label={saveLabel}>
          Salva
        </Button>
      </div>
    </div>
  );
}

/**
 * Three formulas to copy, on the tags of the teams that a formula can name, each with what it
 * does and what it gives with ten days per team.
 */
function FormulaSamples({ config }: { config: RoadmapConfig }) {
  const tags = formulaInputTeams(config).map((team) => team.tag);
  const samples = formulaSamples(tags);
  // Closed at first on the phone, where they would fill the window.
  const [startOpen] = useState(() => window.matchMedia('(min-width: 640px)').matches);
  return (
    <details open={startOpen} className="group rounded-lg border border-line">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronDown
          className="h-4 w-4 shrink-0 -rotate-90 transition-transform group-open:rotate-0 motion-reduce:transition-none"
          aria-hidden="true"
        />
        Esempi di formule da copiare
      </summary>
      <div className="space-y-2 border-t border-line px-3 py-2">
        <p className="text-xs text-fg-muted">
          {tags.length > 0
            ? 'Con i tag dei tuoi team senza formula: copiane una e incollala nella formula di un team o della contingency.'
            : 'Nessun team senza formula: sostituisci i tag con quelli dei team che lavorano a mano.'}
        </p>
        <ul className="divide-y divide-line">
          {samples.map((sample) => (
            <li key={sample.formula} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <div className="min-w-0 flex-1">
                <code className="rounded-sm bg-surface-strong px-1.5 py-0.5 text-sm font-semibold break-all">
                  {sample.formula}
                </code>
                <p className="mt-1 text-xs text-fg-muted">
                  {sample.description} Per esempio, {formulaExample(sample.formula)}.
                </p>
              </div>
              <CopyButton
                text={sample.formula}
                confirmation="Formula copiata"
                ariaLabel={`Copia la formula ${sample.formula}`}
              />
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

interface TeamDialogProps {
  config: RoadmapConfig;
  actions: RoadmapConfigActions;
  onClose: () => void;
}

/**
 * The teams and the people who work on the projects, in the order of the table of the days of a
 * project: each team folds to its header, to be moved by dragging or with its arrows, and shows
 * under its name the formula of its days and its people, to edit, add or remove; at the top,
 * formulas to copy; at the bottom, the formula of the contingency.
 */
export function TeamDialog({ config, actions, onClose }: TeamDialogProps) {
  const groups = stakeholdersByTeam(config);
  const teamIds = config.teams.map((team) => team.id);
  const prefix = useId();
  const [folded, setFolded] = usePreference('teams-folded', readFolded, []);
  const [teamEditor, setTeamEditor] = useState<Team | null | 'new'>(null);
  const [personEditor, setPersonEditor] = useState<{
    stakeholder: Stakeholder | null;
    teamId?: string;
  } | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  // After a move with the arrows, the focus goes back to the arrow, or to the name of the team
  // when the arrow can no longer be used.
  const focusAfterMove = useRef<{ teamId: string; step: -1 | 1 } | null>(null);

  const moveTo = (teamId: string, index: number) => {
    for (const team of movedPositions(config.teams, teamId, index)) actions.onSaveTeam(team);
  };
  const drag = useListDrag(TEAM_DRAG_TYPE, (teamId, _list, index) => moveTo(teamId, index));
  const slot = drag.slot('teams');

  useEffect(() => {
    const pending = focusAfterMove.current;
    if (!pending) return;
    focusAfterMove.current = null;
    const arrow = document.getElementById(`${prefix}-move-${pending.step}-${pending.teamId}`);
    if (arrow instanceof HTMLButtonElement && !arrow.disabled) arrow.focus();
    else document.getElementById(`${prefix}-fold-${pending.teamId}`)?.focus();
  }, [config.teams, prefix]);

  const isFolded = (teamId: string) => folded.includes(teamId);
  const toggleFolded = (teamId: string) =>
    setFolded((ids) =>
      ids.includes(teamId) ? ids.filter((id) => id !== teamId) : [...ids, teamId],
    );
  const allFolded = teamIds.length > 0 && teamIds.every(isFolded);

  const colorItems = (team: Team): MenuItem[] =>
    TASK_COLORS.map((color) => ({
      kind: 'radio',
      label: color.name,
      checked: team.colorId === color.id,
      leading: <ColorSwatch colorId={color.id} />,
      onSelect: () => actions.onSaveTeam({ ...team, colorId: color.id }),
    }));

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
          <FormulaSamples config={config} />
          {groups.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-fg-muted">
              Nessun team: inizia da un team, poi aggiungi le persone.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 flex-1 text-xs text-fg-muted">
                  L&apos;ordine dei team è quello della tabella dei giorni di un progetto e delle
                  persone nella roadmap: trascina un team per la maniglia o usa le frecce.
                </p>
                {teamIds.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setFolded(allFolded ? [] : teamIds)}
                    aria-expanded={!allFolded}
                  >
                    {allFolded ? (
                      <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronsDownUp className="h-4 w-4" aria-hidden="true" />
                    )}
                    {allFolded ? 'Espandi tutti' : 'Riduci tutti'}
                  </Button>
                )}
              </div>
              <ol aria-label="Team, in ordine" className="space-y-2" {...drag.container}>
                {groups.map(({ team, stakeholders }) => {
                  if (!team) {
                    return (
                      <li key="none">
                        <TeamPeople
                          title="Senza team"
                          stakeholders={stakeholders}
                          onEdit={(stakeholder) => setPersonEditor({ stakeholder })}
                        />
                      </li>
                    );
                  }
                  const index = teamIds.indexOf(team.id);
                  const closed = isFolded(team.id);
                  const bodyId = `${prefix}-body-${team.id}`;
                  return (
                    <li
                      key={team.id}
                      className={`relative ${drag.dragged === team.id ? 'opacity-50' : ''}`}
                      {...drag.target('teams', teamIds, index, 'y')}
                    >
                      {slot === index && <DropLine at="top" />}
                      {slot === teamIds.length && index === teamIds.length - 1 && (
                        <DropLine at="bottom" />
                      )}
                      <section aria-label={team.name} className="rounded-lg border border-line">
                        <div
                          draggable
                          {...drag.source(team.id, 'teams')}
                          className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-1.5 ${closed ? 'rounded-lg' : 'rounded-t-lg border-b border-line'}`}
                          style={taskColorStyle(team.colorId)}
                        >
                          <GripVertical
                            className="h-4 w-4 shrink-0 cursor-grab opacity-70 active:cursor-grabbing"
                            aria-hidden="true"
                          />
                          <button
                            id={`${prefix}-fold-${team.id}`}
                            type="button"
                            onClick={() => toggleFolded(team.id)}
                            aria-expanded={!closed}
                            aria-controls={bodyId}
                            className="flex min-w-0 cursor-pointer items-center gap-1 rounded-sm text-left text-sm font-bold"
                          >
                            <ChevronDown
                              className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${closed ? '-rotate-90' : ''}`}
                              aria-hidden="true"
                            />
                            <span className="truncate">{team.name}</span>
                          </button>
                          <span className="text-xs">{team.tag}</span>
                          <span className="text-xs">· {TEAM_PHASE_INFO[team.phase].label}</span>
                          <span className="text-xs">
                            · {stakeholders.length}{' '}
                            {stakeholders.length === 1 ? 'persona' : 'persone'}
                          </span>
                          <div className="ml-auto flex items-center gap-0.5">
                            <Button
                              id={`${prefix}-move--1-${team.id}`}
                              variant="ghost"
                              size="icon"
                              className={`${HEADER_BUTTON} disabled:opacity-40`}
                              disabled={index === 0}
                              onClick={() => {
                                focusAfterMove.current = { teamId: team.id, step: -1 };
                                moveTo(team.id, index - 1);
                              }}
                              aria-label={`Sposta il team ${team.name} più in alto`}
                              title="Più in alto"
                            >
                              <ArrowUp className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              id={`${prefix}-move-1-${team.id}`}
                              variant="ghost"
                              size="icon"
                              className={`${HEADER_BUTTON} disabled:opacity-40`}
                              disabled={index === teamIds.length - 1}
                              onClick={() => {
                                focusAfterMove.current = { teamId: team.id, step: 1 };
                                moveTo(team.id, index + 1);
                              }}
                              aria-label={`Sposta il team ${team.name} più in basso`}
                              title="Più in basso"
                            >
                              <ArrowDown className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Menu
                              label={`Colore del team ${team.name}`}
                              items={colorItems(team)}
                              align="end"
                              variant="ghost"
                              size="icon"
                              chevron={false}
                              className={HEADER_BUTTON}
                              title="Colore"
                            >
                              <Palette className="h-4 w-4" aria-hidden="true" />
                            </Menu>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={HEADER_BUTTON}
                              onClick={() => setTeamEditor(team)}
                              aria-label={`Modifica il team ${team.name}`}
                              title="Modifica il team: nome, tag, fase, formula e colore"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`${HEADER_BUTTON} disabled:opacity-40`}
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
                        </div>
                        {/* Hidden rather than removed when folded: a formula being written stays. */}
                        <div id={bodyId} hidden={closed}>
                          <div className="border-b border-line px-3 py-2">
                            <FormulaField
                              key={team.formula ?? ''}
                              label={
                                <>
                                  Formula dei giorni uomo
                                  <span className="sr-only"> di {team.name}</span>
                                </>
                              }
                              value={team.formula}
                              teams={config.teams}
                              selfId={team.id}
                              placeholder="es. 0.12*(ServerSide+iOSDev+AndDev): vuota, i giorni si scrivono a mano"
                              saveLabel={`Salva la formula di ${team.name}`}
                              onSave={(formula) => actions.onSaveTeam(withFormula(team, formula))}
                            />
                          </div>
                          <TeamPeople
                            stakeholders={stakeholders}
                            onEdit={(stakeholder) => setPersonEditor({ stakeholder })}
                            onAdd={() => setPersonEditor({ stakeholder: null, teamId: team.id })}
                            addLabel={`Persona in ${team.name}`}
                          />
                        </div>
                      </section>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
          <section
            aria-labelledby={`${prefix}-contingency`}
            className="rounded-lg border border-line"
          >
            <div
              className="flex flex-wrap items-center gap-2 rounded-t-lg border-b border-line px-3 py-2"
              style={taskColorStyle('gray')}
            >
              <span id={`${prefix}-contingency`} className="text-sm font-bold">
                Contingency
              </span>
              <span className="text-xs">CONT</span>
            </div>
            <div className="space-y-2 px-3 py-2">
              <p className="text-xs text-fg-muted">
                I giorni di riserva di un progetto: una barra del progetto dopo i test, senza
                persona. La formula li calcola dai giorni dei team, come quella di un team.
              </p>
              <FormulaField
                key={config.contingencyFormula ?? ''}
                label="Formula della contingency"
                value={config.contingencyFormula}
                teams={config.teams}
                placeholder="es. 0.10*(ServerSide+iOSDev+AndDev)"
                saveLabel="Salva la formula della contingency"
                onSave={(formula) => actions.onSaveSettings({ contingencyFormula: formula })}
              />
            </div>
          </section>
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

/** Where a dragged team would land: a line over a team, or under the last one. */
function DropLine({ at }: { at: 'top' | 'bottom' }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 h-0.5 rounded-full bg-accent ${at === 'top' ? '-top-[5px]' : '-bottom-[5px]'}`}
    />
  );
}

interface TeamPeopleProps {
  /** A heading for the people of no team; a team has its own header. */
  title?: string;
  stakeholders: readonly Stakeholder[];
  onEdit: (stakeholder: Stakeholder) => void;
  /** Adds a person to the team, when the people belong to one. */
  onAdd?: () => void;
  addLabel?: string;
}

/** The people of a team, each to edit, and the button for a new one. */
function TeamPeople({ title, stakeholders, onEdit, onAdd, addLabel }: TeamPeopleProps) {
  return (
    <>
      {title && (
        <p className="rounded-t-lg border border-b-0 border-line px-3 py-2 text-sm font-bold">
          {title}
        </p>
      )}
      <ul className={`divide-y divide-line ${title ? 'rounded-b-lg border border-line' : ''}`}>
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
                  stakeholder.info ? markdownToPlainText(stakeholder.info) : null,
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
              onClick={() => onEdit(stakeholder)}
              aria-label={`Modifica ${stakeholder.name}`}
              title="Modifica: nome, team, info, membro di default e assenze"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
        {onAdd && (
          <li className="px-3 py-2">
            <button
              type="button"
              onClick={onAdd}
              className="flex cursor-pointer items-center gap-1 text-xs font-medium text-link hover:underline"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {addLabel}
            </button>
          </li>
        )}
      </ul>
    </>
  );
}
