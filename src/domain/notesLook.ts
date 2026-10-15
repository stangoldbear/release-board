// How this browser draws the area Notes when it is expanded: a board of notes, with the notes of
// the days ahead on top.

/** On top of the board: the days ahead with their notes, or six weeks drawn as a small timeline. */
export type NotesTop = 'agenda' | 'timeline';
/** The notes as post-its, as cards, or plain with a band of their color. */
export type NoteShape = 'postit' | 'card' | 'plain';
/** As tall as their text in columns, in rows of equal height, or one under the other. */
export type NotesLayout = 'masonry' | 'grid' | 'list';
/** What is behind the notes. */
export type NotesBoard = 'cork' | 'neutral' | 'dots' | 'slate';
/** The notes without a color: yellow as a post-it, or the colors of the theme. */
export type NotesPaper = 'yellow' | 'theme';

export interface NotesLook {
  top: NotesTop;
  shape: NoteShape;
  layout: NotesLayout;
  board: NotesBoard;
  paper: NotesPaper;
}

export const NOTES_TOPS: readonly { id: NotesTop; label: string; description: string }[] = [
  {
    id: 'agenda',
    label: 'Agenda',
    description: 'I giorni con note, da oggi in avanti, con i promemoria passati in testa.',
  },
  {
    id: 'timeline',
    label: 'Mini timeline',
    description: 'Sei settimane da oggi, con i simboli della riga «Note sulla timeline».',
  },
];

export const NOTE_SHAPES: readonly { id: NoteShape; label: string; description: string }[] = [
  { id: 'postit', label: 'Post-it', description: 'Angoli vivi, ombra e un angolo piegato.' },
  { id: 'card', label: 'Scheda', description: 'Angoli arrotondati e un bordo leggero.' },
  { id: 'plain', label: 'Essenziale', description: 'Fondo neutro con una banda del colore.' },
];

export const NOTES_LAYOUTS: readonly { id: NotesLayout; label: string; description: string }[] = [
  {
    id: 'masonry',
    label: 'Muratura',
    description: 'Colonne di note alte quanto il loro testo, in ordine da sinistra a destra.',
  },
  {
    id: 'grid',
    label: 'Griglia',
    description: 'Righe di note alte uguali, con il testo accorciato.',
  },
  { id: 'list', label: 'Lista', description: 'Una nota sotto l’altra, larga quanto l’area.' },
];

export const NOTES_BOARDS: readonly { id: NotesBoard; label: string }[] = [
  { id: 'cork', label: 'Sughero' },
  { id: 'neutral', label: 'Neutra' },
  { id: 'dots', label: 'Puntinata' },
  { id: 'slate', label: 'Ardesia' },
];

export const NOTES_PAPERS: readonly { id: NotesPaper; label: string }[] = [
  { id: 'yellow', label: 'Giallo post-it' },
  { id: 'theme', label: 'Come il tema' },
];

export const DEFAULT_NOTES_LOOK: NotesLook = {
  top: 'agenda',
  shape: 'postit',
  layout: 'masonry',
  board: 'cork',
  paper: 'yellow',
};

function oneOf<T extends string>(options: readonly { id: T }[], value: unknown, fallback: T): T {
  return options.some((option) => option.id === value) ? (value as T) : fallback;
}

/**
 * The look a browser saved, or a settings file holds; what it does not know takes the default.
 * Null when it is not a look.
 */
export function parseNotesLook(value: unknown): NotesLook | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const saved = value as Record<string, unknown>;
  return {
    top: oneOf(NOTES_TOPS, saved.top, DEFAULT_NOTES_LOOK.top),
    shape: oneOf(NOTE_SHAPES, saved.shape, DEFAULT_NOTES_LOOK.shape),
    layout: oneOf(NOTES_LAYOUTS, saved.layout, DEFAULT_NOTES_LOOK.layout),
    board: oneOf(NOTES_BOARDS, saved.board, DEFAULT_NOTES_LOOK.board),
    paper: oneOf(NOTES_PAPERS, saved.paper, DEFAULT_NOTES_LOOK.paper),
  };
}
