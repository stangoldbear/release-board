import { memo, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { EyeOff } from 'lucide-react';
import type { TaskChanges } from '../../domain/plan';
import { ZOOM_COLUMN_UNIT, placeTasks } from '../../domain/schedule';
import type { DateRange, ZoomLevel } from '../../domain/schedule';
import type { DailyMetric, DailyNotes, Lane, RowVisibility, TaskItem } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { scaledTextStyle } from '../../shared/ui/textScale';
import type { TextScale } from '../../shared/ui/textScale';
import { useStableCallback } from '../../shared/useStableCallback';
import { addDaysIso, diffDays, todayIso } from '../../utils/dateUtils';
import { DailyNoteDialog } from '../notes/DailyNoteDialog';
import type { CalendarJump } from './calendarView';
import { DragHint } from './DragHint';
import { MetricsRow } from './MetricsRow';
import { NotesRow, noteCellId } from './NotesRow';
import { TaskBar, taskBarId } from './TaskBar';
import { TaskContextMenu } from './TaskContextMenu';
import { DayHeaderRow, MonthBand } from './TimelineHeader';
import {
  LABEL_CELL,
  buildColumns,
  columnEdge,
  dayName,
  timelineMetrics,
  stackingOrder,
  TIMELINE_SCROLLER,
} from './timelineLayout';
import type { Column } from './timelineLayout';
import { useNoteDrag } from './useNoteDrag';
import { draggedTask, useTaskDrag } from './useTaskDrag';
import { useTimelineScroll } from './useTimelineScroll';
import { useZoomGestures } from './useZoomGestures';

interface TimelineProps {
  /** The days the timeline holds; it scrolls through them. */
  range: DateRange;
  zoom: ZoomLevel;
  /** The first day in view when the timeline opens, where the user left it. */
  anchor: string;
  /** The last navigation: the timeline scrolls so that its day is at the left edge. */
  jump: CalendarJump;
  /** First and last day in view, as the user scrolls; `settled` once scrolling has stopped. */
  onScrolled: (first: string, last: string, settled: boolean) => void;
  tasks: TaskItem[];
  lanes: Lane[];
  metrics: DailyMetric[];
  dailyNotes: DailyNotes;
  /** The days whose note the search finds; null while nothing is searched. */
  noteMatches: Set<string> | null;
  showMetrics: boolean;
  highlightWeekends: boolean;
  /** Size of the calendar's text, 1 being the normal one, and whether it is compact. */
  textScale: TextScale;
  compact: boolean;
  /** Titles on one line, out of their bars when longer; bars and notes one line tall. */
  oneLineTitles: boolean;
  visibility: RowVisibility;
  onShowAllRows: () => void;
  /** -1 zooms in, 1 zooms out. */
  onZoom: (step: -1 | 1) => void;
  /** Shows the days of a week, from the quarter view. */
  onShowDays: (date: string) => void;
  onChangeTask: (taskId: string, changes: TaskChanges) => void;
  onOpenTask: (task: TaskItem) => void;
  onDuplicateTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTaskAt: (date: string, laneId: string) => void;
  onSaveNote: (date: string, text: string) => void;
  /** Moves the note of a day to another day, with a new text when one is given. */
  onMoveNote: (from: string, to: string, text?: string) => void;
}

interface LaneCellsProps {
  columns: Column[];
  laneId: string;
  onAdd: (date: string, laneId: string) => void;
}

/** The days of a lane: a click adds a task there. Memoized, since a drag redraws only the bars. */
const LaneCells = memo(function LaneCells({ columns, laneId, onAdd }: LaneCellsProps) {
  return columns.map((column) => (
    <div
      key={column.start}
      onClick={() => onAdd(column.start, laneId)}
      style={{ width: column.width }}
      // The plus is drawn by CSS: one icon element per day would weigh on long timelines.
      className={`flex shrink-0 cursor-pointer items-center justify-center text-base text-link after:opacity-0 after:content-['+'] hover:bg-accent-soft hover:after:opacity-100 pointer-coarse:after:hidden ${columnEdge(column)} ${
        column.past ? 'bg-past' : column.red ? 'bg-holiday' : ''
      }`}
    />
  ));
});

/**
 * The lanes as rows of task bars over a continuous run of days, or of weeks when zoomed out, under
 * the months and the daily values.
 */
export function Timeline({
  range,
  zoom,
  anchor,
  jump,
  onScrolled,
  tasks,
  lanes,
  metrics,
  dailyNotes,
  noteMatches,
  showMetrics,
  highlightWeekends,
  textScale,
  compact,
  oneLineTitles,
  visibility,
  onShowAllRows,
  onZoom,
  onShowDays,
  onChangeTask,
  onOpenTask,
  onDuplicateTask,
  onDeleteTask,
  onAddTaskAt,
  onSaveNote,
  onMoveNote,
}: TimelineProps) {
  const sizes = timelineMetrics(zoom, textScale, compact, oneLineTitles);
  const { dayWidth, barHeight, trackGap, lanePadding, labelWidth } = sizes;
  const today = todayIso();
  const columns = useMemo(
    () => buildColumns({ start: range.start, end: range.end }, zoom, highlightWeekends, today),
    [range.start, range.end, zoom, highlightWeekends, today],
  );
  const weekColumns = ZOOM_COLUMN_UNIT[zoom] === 'week';
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const todayOffset =
    range.start <= today && today <= range.end
      ? (diffDays(range.start, today) + 0.5) * dayWidth
      : null;

  const scrollRef = useRef<HTMLDivElement>(null);
  const helpId = useId();
  const noteHelpId = useId();
  const [menu, setMenu] = useState<{ task: TaskItem; x: number; y: number } | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);
  const [editingNoteDate, setEditingNoteDate] = useState<string | null>(null);
  const { drag, startDrag, isClickAfterDrag } = useTaskDrag(dayWidth, onChangeTask);
  const isDayFree = (date: string) => dailyNotes[date] === undefined;
  const noteDrag = useNoteDrag(dayWidth, range, isDayFree, onMoveNote);

  useZoomGestures(scrollRef, onZoom);
  useTimelineScroll(scrollRef, {
    range,
    dayWidth,
    labelWidth,
    openOn: anchor,
    jump,
    onScrolled,
  });

  // Stable handlers for the memoized rows, which a drag or a scroll does not redraw.
  const addTaskAt = useStableCallback((date: string, laneId: string) => {
    if (!isClickAfterDrag()) onAddTaskAt(date, laneId);
  });
  const showDays = useStableCallback(onShowDays);
  const openNote = useStableCallback((date: string) => {
    if (!noteDrag.isClickAfterDrag()) setEditingNoteDate(date);
  });
  const startNoteDrag = useStableCallback(noteDrag.startDrag);
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

  // While dragging, the task is drawn where it would land.
  const shownTasks = drag
    ? tasks.map((task) => (task.id === drag.task.id ? draggedTask(drag) : task))
    : tasks;
  const visibleLanes = lanes.filter((lane) => !visibility.hiddenLaneIds.includes(lane.id));
  const allRowsHidden = visibleLanes.length === 0 && !visibility.showNotes;

  const focusBar = (taskId: string) => document.getElementById(taskBarId(taskId))?.focus();

  return (
    <div className="w-full bg-surface select-none">
      <p className="border-b border-line bg-surface-muted px-4 py-1.5 text-xs text-fg-muted">
        <span className="pointer-coarse:hidden">
          Trascina un&apos;attività o una nota per spostarla; un&apos;attività anche dai bordi, per
          cambiarne le date. Maiusc + rotellina scorre i giorni, Ctrl + rotellina cambia lo zoom.
        </span>
        <span className="hidden pointer-coarse:inline">
          Tocca un&apos;attività per modificarla. Scorri con un dito per vedere gli altri giorni,
          avvicina o allontana due dita per lo zoom.
        </span>
      </p>
      <p id={helpId} className="sr-only">
        Frecce sinistra e destra spostano l&apos;attività di un giorno; con Maiusc cambiano la data
        di fine. Invio la apre, il tasto menu mostra le altre azioni.
      </p>
      <p id={noteHelpId} className="sr-only">
        Frecce sinistra e destra spostano la nota di un giorno, su un giorno senza nota. Invio la
        apre.
      </p>

      {/*
        Relative, so that hidden labels placed absolutely stay inside the scroll area instead of
        widening the page. No scroll anchoring: the timeline keeps its place itself when it grows
        at the start.
      */}
      <div
        ref={scrollRef}
        data-compact={compact || undefined}
        style={
          {
            ...scaledTextStyle(textScale, compact),
            '--gantt-label-width': `${labelWidth}px`,
          } as CSSProperties
        }
        className={TIMELINE_SCROLLER}
      >
        <div style={{ width: labelWidth + totalWidth }}>
          <MonthBand range={range} dayWidth={dayWidth} metrics={showMetrics ? metrics : null} />
          {showMetrics && (
            <MetricsRow
              columns={columns}
              metrics={metrics}
              weekColumns={weekColumns}
              digitWidth={sizes.digitWidth}
            />
          )}
          <DayHeaderRow
            columns={columns}
            weekColumns={weekColumns}
            showMonth={zoom === 'detail'}
            onShowDays={showDays}
          />

          <div className="divide-y divide-line">
            {visibleLanes.map((lane) => {
              const laneTasks = shownTasks.filter((task) => task.laneId === lane.id);
              const { placed, tracks } = placeTasks(laneTasks, range);
              const height = Math.max(1, tracks) * (barHeight + trackGap) + lanePadding * 2;
              const isDropTarget =
                drag !== null && drag.laneId !== drag.task.laneId && drag.laneId === lane.id;
              return (
                <div
                  key={lane.id}
                  data-lane-id={lane.id}
                  className={`flex ${isDropTarget ? 'bg-accent-soft' : ''}`}
                  style={{ minHeight: height }}
                >
                  <div
                    className={`${LABEL_CELL} flex flex-col justify-center bg-surface-muted`}
                    title={lane.name}
                  >
                    <span className="text-xs font-bold tracking-wide break-words uppercase">
                      {lane.name}
                    </span>
                    <span className="text-xs text-fg-muted">{placed.length} attività</span>
                  </div>

                  <div className="relative flex">
                    <LaneCells columns={columns} laneId={lane.id} onAdd={addTaskAt} />
                    {todayOffset !== null && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-link"
                        style={{ left: todayOffset }}
                      />
                    )}

                    <div className="pointer-events-none absolute inset-0">
                      {placed.map((item) => (
                        <TaskBar
                          key={item.task.id}
                          placed={item}
                          dayWidth={dayWidth}
                          top={lanePadding + item.track * (barHeight + trackGap)}
                          height={barHeight}
                          lines={sizes.barLines}
                          overflowTitle={oneLineTitles}
                          stacking={stackingOrder(today, item.task.startDate)}
                          dragging={drag?.task.id === item.task.id}
                          describedBy={helpId}
                          onPointerDown={(event, kind) => {
                            const original = tasks.find((task) => task.id === item.task.id);
                            if (original) startDrag(event, original, kind);
                          }}
                          onOpen={() => {
                            if (!isClickAfterDrag()) onOpenTask(item.task);
                          }}
                          onContextMenu={(x, y) => setMenu({ task: item.task, x, y })}
                          onChange={(changes) => onChangeTask(item.task.id, changes)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {visibility.showNotes && (
            <NotesRow
              columns={columns}
              dailyNotes={dailyNotes}
              matches={noteMatches}
              weekColumns={weekColumns}
              dayHeight={sizes.noteHeight}
              weekHeight={sizes.weekNoteHeight}
              lines={sizes.noteLines}
              overflowText={oneLineTitles}
              drag={noteDrag.drag}
              describedBy={noteHelpId}
              onStartDrag={startNoteDrag}
              onOpen={openNote}
              onKeyDown={moveNoteByKey}
              onShowDays={showDays}
            />
          )}
        </div>

        {allRowsHidden && (
          <div className="flex flex-col items-center gap-2 bg-surface-muted p-12 text-center">
            <EyeOff className="h-6 w-6 text-fg-muted" aria-hidden="true" />
            <p className="text-sm font-bold">Tutte le righe del calendario sono nascoste</p>
            <Button variant="primary" onClick={onShowAllRows}>
              Mostra tutte le righe
            </Button>
          </div>
        )}
      </div>

      {drag && (
        <DragHint>
          {drag.kind === 'move' ? 'Sposta' : drag.kind === 'start' ? 'Inizio' : 'Fine'}{' '}
          <strong className="tabular-nums">
            {drag.days > 0 ? `+${drag.days}` : drag.days}{' '}
            {Math.abs(drag.days) === 1 ? 'giorno' : 'giorni'}
          </strong>
          {drag.laneId !== drag.task.laneId && " su un'altra corsia"}
        </DragHint>
      )}

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

      {menu && (
        <TaskContextMenu
          task={menu.task}
          x={menu.x}
          y={menu.y}
          onEdit={() => onOpenTask(menu.task)}
          onDuplicate={() => onDuplicateTask(menu.task)}
          onDelete={() => setTaskToDelete(menu.task)}
          onClose={() => {
            focusBar(menu.task.id);
            setMenu(null);
          }}
        />
      )}

      {taskToDelete && (
        <ConfirmDialog
          title="Eliminare l'attività?"
          message="L'attività viene rimossa dal calendario."
          itemTitle={taskToDelete.title}
          confirmLabel="Elimina"
          onConfirm={() => {
            onDeleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }}
          onCancel={() => setTaskToDelete(null)}
        />
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
    </div>
  );
}
