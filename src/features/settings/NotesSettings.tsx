import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { TaskColorId } from '../../domain/colors';
import {
  NOTES_BOARDS,
  NOTES_LAYOUTS,
  NOTES_PAPERS,
  NOTES_TOPS,
  NOTE_SHAPES,
} from '../../domain/notesLook';
import type { NoteShape, NotesLayout, NotesLook, NotesTop } from '../../domain/notesLook';
import { TIMELINE_NOTE_KINDS, kindHasOwnColors } from '../../domain/timelineNotes';
import type {
  TimelineNoteKind,
  TimelineNoteShow,
  TimelineNotesLayout,
  TimelineNotesLook,
} from '../../domain/timelineNotes';
import { SEGMENT, SEGMENTED, SEGMENT_OFF, SEGMENT_ON } from '../../shared/ui/segmented';
import { boardStyle, memoSurface, noteShapeClass, plainEdge } from '../memos/memoUi';
import { DiamondSymbol, FlagSymbol, PostitSymbol } from '../notes/noteSymbols';
import { KindSymbol } from '../timeline/TimelineNotesRow';
import { OPTION } from './AppearanceSettings';
import { ColorMenu } from './ColorMenu';

// The look of the notes in this browser: the row «Note sulla timeline» and the board of Notes.
// Every choice has a miniature beside it, drawn with the app's own symbols and colors.

/** The frame of a miniature: a small piece of page. */
function Miniature({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative block h-12 w-28 shrink-0 overflow-hidden rounded-md border border-line-strong bg-surface ${className}`}
    >
      {children}
    </span>
  );
}

/** Four days of a row, with their borders, behind the symbols of a miniature. */
function MiniDays() {
  return (
    <span className="absolute inset-0 flex">
      {[0, 1, 2, 3].map((day) => (
        <span key={day} className="h-full flex-1 border-l border-line first:border-l-0" />
      ))}
    </span>
  );
}

/** A symbol of a miniature, with its middle at a point of it, in percent. */
function At({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <span
      className="absolute flex -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {children}
    </span>
  );
}

/** The row with all the notes on one line, or a line for each kind. */
function LayoutMiniature({ layout }: { layout: TimelineNotesLayout }) {
  const one = layout === 'line';
  return (
    <Miniature>
      <MiniDays />
      <At x={one ? 30 : 37.5} y={one ? 50 : 22}>
        <FlagSymbol colorId="amber" size={11} />
      </At>
      <At x={one ? 40 : 37.5} y={one ? 50 : 50}>
        <PostitSymbol colorIds={['blue', 'yellow']} size={10} />
      </At>
      <At x={one ? 50 : 37.5} y={one ? 50 : 78}>
        <DiamondSymbol colorId="purple" size={10} />
      </At>
      <At x={87.5} y={one ? 50 : 78}>
        <DiamondSymbol colorId="red" size={10} />
      </At>
    </Miniature>
  );
}

/** The agenda of the days ahead, or the small timeline of six weeks. */
function TopMiniature({ top }: { top: NotesTop }) {
  if (top === 'agenda') {
    return (
      <Miniature className="flex gap-1 bg-surface-muted p-1">
        {[
          [
            <FlagSymbol key="f" colorId="amber" size={8} />,
            <PostitSymbol key="p" colorIds={['teal']} size={8} />,
          ],
          [<DiamondSymbol key="d" colorId="purple" size={7} />],
          [
            <PostitSymbol key="p" colorIds={['yellow']} size={8} />,
            <DiamondSymbol key="d" colorId="red" size={7} />,
          ],
        ].map((lines, index) => (
          <span
            key={index}
            className="flex flex-1 flex-col gap-0.5 rounded-sm border border-line bg-surface p-0.5"
          >
            <span className="h-1 w-3/4 rounded-full bg-fg-muted" />
            {lines.map((symbol, line) => (
              <span key={line} className="flex items-center gap-0.5">
                {symbol}
                <span className="h-0.5 flex-1 rounded-full bg-line-strong" />
              </span>
            ))}
          </span>
        ))}
      </Miniature>
    );
  }
  return (
    <Miniature>
      <span className="absolute inset-x-0 top-0 h-2.5 border-b border-line bg-surface-muted" />
      <span className="absolute inset-x-0 top-2.5 bottom-0 flex">
        {Array.from({ length: 12 }, (_, day) => (
          <span
            key={day}
            className={`h-full flex-1 border-l border-line first:border-l-0 ${
              day % 7 === 5 || day % 7 === 6 ? 'bg-surface-muted' : ''
            }`}
          />
        ))}
      </span>
      <At x={12} y={62}>
        <FlagSymbol colorId="amber" size={10} />
      </At>
      <At x={46} y={62}>
        <PostitSymbol colorIds={['blue', 'yellow']} size={9} />
      </At>
      <At x={79} y={62}>
        <DiamondSymbol colorId="red" size={9} />
      </At>
    </Miniature>
  );
}

/** A note in a shape, on the board of Notes. */
function ShapeMiniature({ shape }: { shape: NoteShape }) {
  const surface =
    shape === 'plain'
      ? { style: plainEdge({ colorId: 'blue' }), className: 'bg-surface text-fg' }
      : memoSurface({ colorId: 'blue' });
  return (
    <Miniature className="bg-surface-muted p-2">
      <span
        style={surface.style}
        className={`flex h-full flex-col gap-1 border px-1.5 py-1 ${surface.className} ${noteShapeClass(shape, 0)}`}
      >
        <span className="h-1 w-2/3 rounded-full bg-current" />
        <span className="h-0.5 w-full rounded-full bg-current opacity-60" />
        <span className="h-0.5 w-4/5 rounded-full bg-current opacity-60" />
      </span>
    </Miniature>
  );
}

/** Notes as tall as their text, in rows of equal height, or one under the other. */
function NotesLayoutMiniature({ layout }: { layout: NotesLayout }) {
  const block = (height: string, colorId: TaskColorId, key: number) => (
    <span
      key={key}
      style={memoSurface({ colorId }).style}
      className={`block rounded-[2px] border ${height}`}
    />
  );
  if (layout === 'list') {
    return (
      <Miniature className="flex flex-col gap-1 bg-surface-muted p-1.5">
        {block('h-2', 'blue', 0)}
        {block('h-2', 'yellow', 1)}
        {block('h-2', 'green', 2)}
      </Miniature>
    );
  }
  const columns: [string, TaskColorId][][] =
    layout === 'masonry'
      ? [
          [
            ['h-5', 'blue'],
            ['h-2.5', 'pink'],
          ],
          [
            ['h-2.5', 'yellow'],
            ['h-5', 'green'],
          ],
          [
            ['h-3.5', 'purple'],
            ['h-3.5', 'orange'],
          ],
        ]
      : [
          [
            ['h-3.5', 'blue'],
            ['h-3.5', 'pink'],
          ],
          [
            ['h-3.5', 'yellow'],
            ['h-3.5', 'green'],
          ],
          [
            ['h-3.5', 'purple'],
            ['h-3.5', 'orange'],
          ],
        ];
  return (
    <Miniature className="flex gap-1 bg-surface-muted p-1.5">
      {columns.map((column, index) => (
        <span key={index} className="flex flex-1 flex-col gap-1">
          {column.map(([height, colorId], line) => block(height, colorId, line))}
        </span>
      ))}
    </Miniature>
  );
}

/** A choice among a few, each a line with its radio, its miniature, its name and what it does. */
function Choices<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  miniature,
  columns = 'sm:grid-cols-2',
}: {
  legend: string;
  name: string;
  options: readonly { id: T; label: string; description?: string }[];
  value: T;
  onChange: (value: T) => void;
  miniature: (id: T) => ReactNode;
  columns?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold text-fg">{legend}</legend>
      <div className={`grid gap-1.5 ${columns}`}>
        {options.map((option) => (
          <label key={option.id} className={OPTION}>
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              aria-label={option.label}
              aria-describedby={option.description ? `${name}-${option.id}` : undefined}
            />
            {miniature(option.id)}
            <span className="min-w-0">
              <span className="block font-semibold">{option.label}</span>
              {option.description && (
                <span id={`${name}-${option.id}`} className="block text-xs text-fg-muted">
                  {option.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const ROW_LAYOUTS: readonly { id: TimelineNotesLayout; label: string; description: string }[] = [
  {
    id: 'line',
    label: 'Una linea',
    description:
      'Le note di un giorno una accanto all’altra: la riga resta bassa; nelle viste strette i simboli si avvicinano.',
  },
  {
    id: 'lanes',
    label: 'Una linea per tipo',
    description:
      'Note dei giorni, Notes e note sulla timeline ognuna sulla sua linea: niente si copre, la riga è più alta.',
  },
];

const KIND_INFO: Record<TimelineNoteKind, { label: string; description: string }> = {
  dayNote: {
    label: 'Note dei giorni di Next Releases',
    description: 'Una bandierina per la nota del giorno, quando c’è. Il clic apre la nota.',
  },
  memos: {
    label: 'Note di Notes con promemoria',
    description:
      'Un post-it nel giorno del promemoria; più note dello stesso giorno fanno una pila con il numero.',
  },
  milestone: {
    label: 'Note sulla timeline',
    description: 'I rombi aggiunti con un clic su un giorno della riga, da spostare trascinandoli.',
  },
};

const SHOW_LABELS: Record<TimelineNoteShow, string> = {
  title: 'Simbolo e titolo',
  symbol: 'Solo simbolo',
  hidden: 'Nascoste',
};

/**
 * Aspetto › Note sulla timeline: one line for all the notes or a line for each kind, and for each
 * kind whether it shows with its title, the symbol alone or not at all, and its color.
 */
export function TimelineNotesSettings({
  look,
  onChange,
}: {
  look: TimelineNotesLook;
  onChange: (look: TimelineNotesLook) => void;
}) {
  const setKind = (
    kind: TimelineNoteKind,
    changes: Partial<TimelineNotesLook['kinds'][typeof kind]>,
  ) => onChange({ ...look, kinds: { ...look.kinds, [kind]: { ...look.kinds[kind], ...changes } } });
  return (
    <div className="space-y-5">
      <p className="text-xs text-fg-muted">
        La riga in cima alla timeline raccoglie le note che hanno un giorno, ognuna con la forma
        della sua provenienza. La stessa scelta vale per l’agenda di Notes.
      </p>
      <Choices
        legend="Disposizione"
        name="timeline-notes-layout"
        options={ROW_LAYOUTS}
        value={look.layout}
        onChange={(layout) => onChange({ ...look, layout })}
        miniature={(layout) => <LayoutMiniature layout={layout} />}
      />
      {TIMELINE_NOTE_KINDS.map((kind) => {
        const kindLook = look.kinds[kind];
        const info = KIND_INFO[kind];
        const own = kindHasOwnColors(kind);
        return (
          <fieldset key={kind} className="space-y-2 rounded-lg border border-line p-3">
            <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
              <KindSymbol kind={kind} look={look} size={16} />
              {info.label}
            </legend>
            <p className="text-xs text-fg-muted">{info.description}</p>
            <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
              <div
                role="group"
                aria-label={`Come si vedono: ${info.label}`}
                className={`${SEGMENTED} flex-wrap`}
              >
                {(Object.keys(SHOW_LABELS) as TimelineNoteShow[]).map((show) => (
                  <button
                    key={show}
                    type="button"
                    aria-pressed={kindLook.show === show}
                    onClick={() => setKind(kind, { show })}
                    className={`${SEGMENT} ${kindLook.show === show ? SEGMENT_ON : SEGMENT_OFF}`}
                  >
                    {kindLook.show === show && (
                      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    )}
                    {SHOW_LABELS[show]}
                  </button>
                ))}
              </div>
              <ColorMenu
                label={`Colore: ${info.label}`}
                value={kindLook.color === 'own' ? undefined : kindLook.color}
                onChange={(colorId) => setKind(kind, { color: colorId ?? 'own' })}
                noneLabel="Il colore di ogni nota"
                allowNone={own}
              />
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

/**
 * Aspetto › Notes: what is on top of the board, the shape and the layout of the notes, the board
 * behind them and the color of the notes without one.
 */
export function NotesLookSettings({
  look,
  onChange,
}: {
  look: NotesLook;
  onChange: (look: NotesLook) => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-xs text-fg-muted">
        Come appare l’area Notes espansa: sempre nella scheda Notes, a scelta in All.
      </p>
      <Choices
        legend="In alto"
        name="notes-top"
        options={NOTES_TOPS}
        value={look.top}
        onChange={(top) => onChange({ ...look, top })}
        miniature={(top) => <TopMiniature top={top} />}
      />
      <Choices
        legend="Forma delle note"
        name="notes-shape"
        options={NOTE_SHAPES}
        value={look.shape}
        onChange={(shape) => onChange({ ...look, shape })}
        miniature={(shape) => <ShapeMiniature shape={shape} />}
        columns=""
      />
      <Choices
        legend="Layout"
        name="notes-layout"
        options={NOTES_LAYOUTS}
        value={look.layout}
        onChange={(layout) => onChange({ ...look, layout })}
        miniature={(layout) => <NotesLayoutMiniature layout={layout} />}
        columns=""
      />
      <Choices
        legend="Lavagna"
        name="notes-board"
        options={NOTES_BOARDS}
        value={look.board}
        onChange={(board) => onChange({ ...look, board })}
        miniature={(board) => {
          const style = boardStyle(board);
          return (
            <span
              aria-hidden="true"
              style={style.style}
              className={`block h-8 w-12 shrink-0 rounded-md border border-line-strong ${style.className}`}
            />
          );
        }}
      />
      <Choices
        legend="Note senza colore"
        name="notes-paper"
        options={NOTES_PAPERS}
        value={look.paper}
        onChange={(paper) => onChange({ ...look, paper })}
        miniature={(paper) => {
          const surface = memoSurface({}, paper === 'yellow' ? 'yellow' : undefined);
          return (
            <span
              aria-hidden="true"
              style={surface.style}
              className={`block h-8 w-12 shrink-0 rounded-[3px] border shadow-xs ${surface.className}`}
            />
          );
        }}
      />
    </div>
  );
}
