import { useId, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Lock, Plus, Trash } from 'lucide-react';
import { LANE_NAME_MAX, laneFollowerAt, laneNameError, tasksOfLane } from '../../domain/lanes';
import type { Lane, TaskItem } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { FIELD_CLASS } from '../../shared/ui/field';
import { useListDrag } from '../../shared/useListDrag';
import type { TaskColorId } from '../../domain/colors';
import { ColorMenu } from './ColorMenu';

/** What the lanes of the plan can do, for every member. */
export interface LaneActions {
  /** Adds a lane at the end, with a color no other lane has. */
  onCreate: (name: string) => void;
  onRename: (laneId: string, name: string) => void;
  /** The color of a lane, which its tasks take; undefined leaves each task its own. */
  onRecolor: (laneId: string, colorId: TaskColorId | undefined) => void;
  /** The color of the row «Note» and of the notes of the days. */
  onRecolorNotes: (colorId: TaskColorId) => void;
  /** Puts a lane right before another one, or last when `beforeId` is null. */
  onMove: (laneId: string, beforeId: string | null) => void;
  onDelete: (laneId: string) => void;
}

/** The lanes travel with their own type, so that nothing else lands among them. */
const LANE_DRAG_TYPE = 'application/x-release-board-lane';
const LIST = 'lanes';

/** The field of the name of a lane, to give it the focus back. */
function nameFieldId(laneId: string): string {
  return `lane-name-${laneId}`;
}

/** The name of a lane, saved when the field is left or with Enter; Esc gives the saved one back. */
function LaneNameField({
  lane,
  lanes,
  onRename,
}: {
  lane: Lane;
  lanes: readonly Lane[];
  onRename: (name: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const errorId = useId();
  const value = draft ?? lane.name;
  const error = draft === null ? null : laneNameError(draft, lanes, lane.id);
  const save = () => {
    if (draft === null) return;
    if (!error && draft.trim() !== lane.name) onRename(draft.trim());
    if (!error) setDraft(null);
  };
  return (
    // At least a name's width: on phones the color and the commands go to a line of their own.
    <span className="flex min-w-48 flex-1 flex-col gap-0.5">
      <input
        id={nameFieldId(lane.id)}
        type="text"
        value={value}
        maxLength={LANE_NAME_MAX}
        aria-label={`Nome della corsia ${lane.name}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            save();
          } else if (event.key === 'Escape' && draft !== null) {
            // The window stays open: Esc gives back the saved name only.
            event.preventDefault();
            event.stopPropagation();
            setDraft(null);
          }
        }}
        className={`${FIELD_CLASS} py-1.5 font-semibold`}
      />
      {error && (
        <span id={errorId} role="alert" className="text-xs font-semibold text-danger">
          {error}
        </span>
      )}
    </span>
  );
}

/**
 * Impostazioni › Next Releases › Corsie: the rows of the tasks, in the order of the timeline,
 * each with its color, which its tasks take. A name changes in its field, a new lane goes last
 * with a color of its own, the order changes by dragging or with the arrows, and a lane goes away
 * only without tasks, so that none is lost. The row of the notes of the days is no lane: it stays
 * under the last one, with a color for its notes.
 */
export function LanesSettings({
  lanes,
  tasks,
  notesColorId,
  actions,
}: {
  lanes: readonly Lane[];
  tasks: readonly TaskItem[];
  notesColorId: TaskColorId;
  actions: LaneActions;
}) {
  const [name, setName] = useState('');
  const [tried, setTried] = useState(false);
  const [toDelete, setToDelete] = useState<Lane | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const newId = useId();
  const newErrorId = useId();
  const helpId = useId();
  const ids = lanes.map((lane) => lane.id);
  const newError = tried ? laneNameError(name, lanes) : null;

  const moveTo = (lane: Lane, index: number, focusId: string) => {
    actions.onMove(lane.id, laneFollowerAt(lanes, lane.id, index));
    setAnnouncement(`${lane.name} in posizione ${index + 1} di ${lanes.length}`);
    window.requestAnimationFrame(() => document.getElementById(focusId)?.focus());
  };
  const drag = useListDrag(LANE_DRAG_TYPE, (laneId, _list, index) => {
    const lane = lanes.find((item) => item.id === laneId);
    if (lane) moveTo(lane, index, nameFieldId(laneId));
  });
  const step = (lane: Lane, index: number, delta: -1 | 1, focusId: string) => {
    const target = index + delta;
    if (target < 0) setAnnouncement(`${lane.name} è già la prima`);
    else if (target >= lanes.length) setAnnouncement(`${lane.name} è già l'ultima`);
    else moveTo(lane, target, focusId);
  };
  const handleKey = (event: KeyboardEvent, lane: Lane, index: number) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    step(lane, index, event.key === 'ArrowUp' ? -1 : 1, nameFieldId(lane.id));
  };

  const add = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (laneNameError(name, lanes)) return;
    actions.onCreate(name.trim());
    setAnnouncement(`Corsia ${name.trim()} aggiunta in fondo`);
    setName('');
    setTried(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-fg-muted">
        Le righe delle attività di Next Releases, nell’ordine della timeline, ognuna con il suo
        colore: le attività prendono quello della loro corsia, anche quando cambiano corsia.
        Un’attività passa da una corsia all’altra trascinandola sulla timeline o dalla sua finestra.
        La riga «Note» dei giorni resta sempre l’ultima e colora le note.
      </p>
      <ul {...drag.container} aria-describedby={helpId} className="space-y-1.5">
        {lanes.map((lane, index) => {
          const count = tasksOfLane(tasks, lane.id).length;
          const slot = drag.slot(LIST);
          return (
            <li
              key={lane.id}
              {...drag.target(LIST, ids, index, 'y')}
              onKeyDown={(event) => handleKey(event, lane, index)}
              className={`relative flex flex-wrap items-start gap-2 rounded-lg border border-line bg-surface p-2 sm:flex-nowrap ${
                drag.dragged === lane.id ? 'opacity-50' : ''
              }`}
            >
              {slot === index && (
                <span aria-hidden="true" className="absolute inset-x-0 -top-1 h-0.5 bg-link" />
              )}
              {slot === lanes.length && index === lanes.length - 1 && (
                <span aria-hidden="true" className="absolute inset-x-0 -bottom-1 h-0.5 bg-link" />
              )}
              <span
                draggable
                {...drag.source(lane.id, LIST)}
                title="Trascina per cambiare l’ordine"
                className="mt-2 cursor-grab text-fg-muted active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" aria-hidden="true" />
              </span>
              <LaneNameField
                lane={lane}
                lanes={lanes}
                onRename={(next) => {
                  actions.onRename(lane.id, next);
                  setAnnouncement(`Corsia rinominata: ${next}`);
                }}
              />
              {/* A column of its own, so that the names line up whatever the color is called. */}
              <span className="mt-0.5 w-36 shrink-0">
                <ColorMenu
                  label={`Colore della corsia ${lane.name}`}
                  value={lane.colorId}
                  noneLabel="Di ogni attività"
                  onChange={(colorId) => {
                    actions.onRecolor(lane.id, colorId);
                    setAnnouncement(
                      colorId
                        ? `Corsia ${lane.name}: le attività prendono il suo colore`
                        : `Corsia ${lane.name}: ogni attività ha il suo colore`,
                    );
                  }}
                />
              </span>
              <span className="mt-2 shrink-0 text-xs text-fg-muted tabular-nums">
                {count === 1 ? '1 attività' : `${count} attività`}
              </span>
              <span className="flex shrink-0 items-center">
                {([-1, 1] as const).map((delta) => {
                  const controlId = `lane-move-${delta}-${lane.id}`;
                  const atEnd = delta === -1 ? index === 0 : index === lanes.length - 1;
                  const Icon = delta === -1 ? ArrowUp : ArrowDown;
                  return (
                    <Button
                      key={delta}
                      id={controlId}
                      variant="ghost"
                      size="icon"
                      aria-disabled={atEnd}
                      aria-label={`Sposta la corsia ${lane.name} più ${delta === -1 ? 'in alto' : 'in basso'}`}
                      title={delta === -1 ? 'Più in alto' : 'Più in basso'}
                      onClick={() => step(lane, index, delta, controlId)}
                      className="aria-disabled:cursor-default aria-disabled:opacity-40"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  );
                })}
                <Button
                  variant="danger-subtle"
                  size="icon"
                  aria-disabled={count > 0}
                  aria-label={
                    count > 0
                      ? `Elimina la corsia ${lane.name}: prima sposta le sue attività`
                      : `Elimina la corsia ${lane.name}`
                  }
                  title={
                    count > 0
                      ? 'Sposta prima le sue attività in un’altra corsia: così nessuna si perde'
                      : 'Elimina la corsia'
                  }
                  onClick={() => {
                    if (count === 0) setToDelete(lane);
                    else setAnnouncement(`Sposta prima le attività di ${lane.name}`);
                  }}
                  className="aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                >
                  <Trash className="h-4 w-4" aria-hidden="true" />
                </Button>
              </span>
            </li>
          );
        })}
        <li className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm text-fg-muted sm:flex-nowrap">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-fg">Note</span> · una per giorno, sempre l’ultima
            riga: non si sposta né si rinomina.
          </span>
          <ColorMenu
            label="Colore delle note dei giorni"
            value={notesColorId}
            allowNone={false}
            onChange={(colorId) => {
              if (colorId) actions.onRecolorNotes(colorId);
            }}
          />
        </li>
      </ul>
      <p id={helpId} className="sr-only">
        Alt e le frecce su e giù spostano la corsia del campo con il focus.
      </p>

      <form onSubmit={add} className="space-y-1">
        <label htmlFor={newId} className="text-xs font-semibold">
          Nuova corsia, in fondo
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={newId}
            type="text"
            value={name}
            maxLength={LANE_NAME_MAX}
            placeholder="QA"
            aria-invalid={newError ? true : undefined}
            aria-describedby={newError ? newErrorId : undefined}
            onChange={(event) => setName(event.target.value)}
            className={`${FIELD_CLASS} min-w-40 flex-1`}
          />
          <Button type="submit">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Aggiungi la corsia
          </Button>
        </div>
        {newError && (
          <p id={newErrorId} role="alert" className="text-xs font-semibold text-danger">
            {newError}
          </p>
        )}
      </form>
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {toDelete && (
        <ConfirmDialog
          title={`Eliminare la corsia ${toDelete.name}?`}
          message="Non ha attività. La corsia sparisce dalla timeline per tutti i membri; la cronologia la ricorda."
          confirmLabel="Elimina"
          onConfirm={() => {
            actions.onDelete(toDelete.id);
            setAnnouncement(`Corsia ${toDelete.name} eliminata`);
            setToDelete(null);
          }}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
