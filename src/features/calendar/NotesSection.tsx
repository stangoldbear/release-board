import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { DailyNotes } from '../../domain/types';
import { useStableCallback } from '../../shared/useStableCallback';
import { addDaysIso } from '../../utils/dateUtils';
import { DailyNoteDialog } from '../notes/DailyNoteDialog';
import type { TimelineGeometry } from '../timeline/TimelineFrame';
import { DragHint } from './DragHint';
import { NotesRow, noteCellId } from './NotesRow';
import { dayName } from './timelineLayout';
import type { TimelineMetrics } from './timelineLayout';
import { useNoteDrag } from './useNoteDrag';

interface NotesSectionProps {
  geometry: TimelineGeometry;
  dailyNotes: DailyNotes;
  /** The days whose note the search finds; null while nothing is searched. */
  noteMatches: Set<string> | null;
  sizes: Pick<TimelineMetrics, 'noteHeight' | 'weekNoteHeight' | 'noteLines'>;
  /** The text on one line, out of its day when longer. */
  oneLineTitles: boolean;
  /** Every note shows its whole text; the row grows to hold it. */
  expanded: boolean;
  onToggleExpanded: () => void;
  onSaveNote: (date: string, text: string) => void;
  /** Moves the note of a day to another day, with a new text when one is given. */
  onMoveNote: (from: string, to: string, text?: string) => void;
}

/**
 * The notes of the days, one per day: a note moves by dragging or with the arrows, to a day
 * without a note; a click opens it, or adds one. The section keeps its drag and its window.
 */
export function NotesSection({
  geometry,
  dailyNotes,
  noteMatches,
  sizes,
  oneLineTitles,
  expanded,
  onToggleExpanded,
  onSaveNote,
  onMoveNote,
}: NotesSectionProps) {
  const { range, dayWidth, columns, weekColumns, onShowDays } = geometry;
  const noteHelpId = useId();
  const [editingNoteDate, setEditingNoteDate] = useState<string | null>(null);
  const isDayFree = (date: string) => dailyNotes[date] === undefined;
  const noteDrag = useNoteDrag(dayWidth, range, isDayFree, onMoveNote);

  // Stable handlers for the memoized row, which a drag or a scroll does not redraw.
  const openNote = useStableCallback((date: string) => {
    if (!noteDrag.isClickAfterDrag()) setEditingNoteDate(date);
  });
  const startNoteDrag = useStableCallback(noteDrag.startDrag);
  const toggleExpanded = useStableCallback(onToggleExpanded);
  // Arrows move a note by a day, within the timeline and only to a day without a note; the focus
  // follows the note to its new cell.
  const moveNoteByKey = useStableCallback((event: KeyboardEvent, date: string) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const to = addDaysIso(date, event.key === 'ArrowRight' ? 1 : -1);
    if (to < range.start || to > range.end || !isDayFree(to)) return;
    onMoveNote(date, to);
    window.requestAnimationFrame(() => document.getElementById(noteCellId(to))?.focus());
  });

  return (
    <>
      <p id={noteHelpId} className="sr-only">
        Frecce sinistra e destra spostano la nota di un giorno, su un giorno senza nota. Invio la
        apre.
      </p>
      <NotesRow
        columns={columns}
        dailyNotes={dailyNotes}
        matches={noteMatches}
        weekColumns={weekColumns}
        dayHeight={sizes.noteHeight}
        weekHeight={sizes.weekNoteHeight}
        lines={sizes.noteLines}
        oneLine={oneLineTitles}
        expanded={expanded}
        onToggleExpanded={toggleExpanded}
        drag={noteDrag.drag}
        describedBy={noteHelpId}
        onStartDrag={startNoteDrag}
        onOpen={openNote}
        onKeyDown={moveNoteByKey}
        onShowDays={onShowDays}
      />

      {noteDrag.drag && (
        <DragHint>
          {noteDrag.drag.allowed ? (
            <>
              Sposta la nota a <strong>{dayName(noteDrag.drag.to)}</strong>
            </>
          ) : (
            <>
              <strong>{dayName(noteDrag.drag.to)}</strong> ha già una nota
            </>
          )}
        </DragHint>
      )}

      {editingNoteDate && (
        <DailyNoteDialog
          date={editingNoteDate}
          note={dailyNotes[editingNoteDate] ?? ''}
          isDayFree={isDayFree}
          onSave={(text) => onSaveNote(editingNoteDate, text)}
          onMove={(to, text) => onMoveNote(editingNoteDate, to, text)}
          onClose={() => setEditingNoteDate(null)}
        />
      )}
    </>
  );
}
