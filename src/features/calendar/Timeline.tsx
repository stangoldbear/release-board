import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { EyeOff, MoveHorizontal, Plus, StickyNote } from 'lucide-react';
import { sumInRange } from '../../domain/metrics';
import { formatLocaleNumber, formatShortNumber } from '../../domain/numberFormat';
import { DAILY_METRIC } from '../../domain/plan';
import type { TaskChanges } from '../../domain/plan';
import { ZOOM_COLUMN_UNIT, placeTasks, rangeColumns } from '../../domain/schedule';
import type { DateRange, ZoomLevel } from '../../domain/schedule';
import type { DailyMetric, DailyNotes, Lane, RowVisibility, TaskItem } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import {
  ITALIAN_DAYS_SHORT,
  ITALIAN_MONTHS_SHORT,
  addDaysIso,
  diffDays,
  formatDateToIT,
  getItalianHolidayName,
  isWeekend,
  parseISODate,
  todayIso,
} from '../../utils/dateUtils';
import { DailyNoteDialog } from '../notes/DailyNoteDialog';
import { TaskBar } from './TaskBar';
import { TaskContextMenu } from './TaskContextMenu';
import { useNoteDrag } from './useNoteDrag';
import { draggedTask, useTaskDrag } from './useTaskDrag';
import { useZoomGestures } from './useZoomGestures';

/** Width of the sticky column with the row names. */
const LABEL_WIDTH = 96;

/** Pixels per day and height of a task bar at each zoom level. */
const SCALES: Record<ZoomLevel, { dayWidth: number; barHeight: number }> = {
  detail: { dayWidth: 112, barHeight: 46 },
  month: { dayWidth: 56, barHeight: 46 },
  quarter: { dayWidth: 12, barHeight: 28 },
};
const TRACK_GAP = 6;
const LANE_PADDING = 8;

interface TimelineProps {
  range: DateRange;
  zoom: ZoomLevel;
  tasks: TaskItem[];
  lanes: Lane[];
  metrics: DailyMetric[];
  dailyNotes: DailyNotes;
  showMetrics: boolean;
  highlightWeekends: boolean;
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

interface Column {
  start: string;
  end: string;
  width: number;
  /** Weekend or holiday shown in red; day columns only. */
  red: boolean;
  holidays: string[];
  isToday: boolean;
}

function buildColumns(
  range: DateRange,
  zoom: ZoomLevel,
  highlightWeekends: boolean,
  today: string,
): Column[] {
  const { dayWidth } = SCALES[zoom];
  return rangeColumns(range, ZOOM_COLUMN_UNIT[zoom]).map(({ start, end }) => {
    const days = diffDays(start, end) + 1;
    const holidays: string[] = [];
    for (let offset = 0; offset < days; offset += 1) {
      const date = parseISODate(start);
      date.setDate(date.getDate() + offset);
      const name = getItalianHolidayName(date);
      if (name) holidays.push(name);
    }
    const weekend = days === 1 && isWeekend(parseISODate(start));
    return {
      start,
      end,
      width: days * dayWidth,
      red: days === 1 && (holidays.length > 0 || (highlightWeekends && weekend)),
      holidays,
      isToday: start <= today && today <= end,
    };
  });
}

function dayLabel(iso: string): { weekday: string; day: number; month: string } {
  const date = parseISODate(iso);
  return {
    weekday: ITALIAN_DAYS_SHORT[date.getDay()] ?? '',
    day: date.getDate(),
    month: ITALIAN_MONTHS_SHORT[date.getMonth()] ?? '',
  };
}

function columnTone(column: Column): string {
  if (column.red) return 'bg-holiday text-holiday-fg';
  if (column.isToday) return 'bg-accent-soft text-link';
  return '';
}

/** What a drag is about to do, at the bottom of the screen. */
function DragHint({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm text-fg shadow-2xl">
      <MoveHorizontal className="h-4 w-4 text-link" aria-hidden="true" />
      <span>{children}</span>
      <span className="text-xs text-fg-muted">Esc annulla</span>
    </div>
  );
}

function dayName(iso: string): string {
  const { weekday, day, month } = dayLabel(iso);
  return `${weekday.toLowerCase()} ${day} ${month}`;
}

/** The lanes as rows of task bars over columns of days, or of weeks when zoomed out. */
export function Timeline({
  range,
  zoom,
  tasks,
  lanes,
  metrics,
  dailyNotes,
  showMetrics,
  highlightWeekends,
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
  const { dayWidth, barHeight } = SCALES[zoom];
  const today = todayIso();
  const columns = useMemo(
    () => buildColumns(range, zoom, highlightWeekends, today),
    [range, zoom, highlightWeekends, today],
  );
  const isWeekColumns = ZOOM_COLUMN_UNIT[zoom] === 'week';
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);

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

  // Each new period opens on today when it is visible, otherwise on its first day.
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const visibleWidth = container.clientWidth - LABEL_WIDTH;
    const todayOffset = diffDays(range.start, today) * dayWidth;
    const inRange = range.start <= today && today <= range.end;
    container.scrollLeft = inRange ? todayOffset - visibleWidth / 2 + dayWidth / 2 : 0;
  }, [range.start, range.end, dayWidth, today]);

  // While dragging, the task is drawn where it would land.
  const shownTasks = drag
    ? tasks.map((task) => (task.id === drag.task.id ? draggedTask(drag) : task))
    : tasks;
  const visibleLanes = lanes.filter((lane) => !visibility.hiddenLaneIds.includes(lane.id));
  const allRowsHidden = visibleLanes.length === 0 && !visibility.showNotes;
  const periodTotal = sumInRange(metrics, range);
  // Roughly how many characters of a number fit in a column.
  const maxDigits = Math.floor((columns[0]?.width ?? dayWidth) / 7);

  const focusBar = (taskId: string) => document.getElementById(`task-rect-${taskId}`)?.focus();

  // Arrows move a note by a day, within the period and only to a day without a note; the focus
  // follows the note to its new cell.
  const handleNoteKeyDown = (event: KeyboardEvent, date: string) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const to = addDaysIso(date, event.key === 'ArrowRight' ? 1 : -1);
    if (to < range.start || to > range.end || !isDayFree(to)) return;
    onMoveNote(date, to);
    window.requestAnimationFrame(() => document.getElementById(`note-cell-${to}`)?.focus());
  };

  const labelCell = 'sticky left-0 z-20 shrink-0 border-r border-line-strong p-2';

  return (
    <div className="w-full overflow-hidden rounded-xl border border-line bg-surface shadow-xs select-none">
      <p className="border-b border-line bg-surface-muted px-4 py-1.5 text-xs text-fg-muted">
        <span className="pointer-coarse:hidden">
          Trascina un&apos;attività o una nota per spostarla; un&apos;attività anche dai bordi, per
          cambiarne le date. Ctrl + rotellina cambia lo zoom.
        </span>
        <span className="hidden pointer-coarse:inline">
          Tocca un&apos;attività per modificarla. Avvicina o allontana due dita per lo zoom.
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

      <div ref={scrollRef} className="w-full touch-pan-x touch-pan-y overflow-x-auto">
        <div style={{ width: LABEL_WIDTH + totalWidth }}>
          {showMetrics && (
            <div className="flex border-b border-line bg-surface-muted text-xs">
              <div
                className={`${labelCell} bg-surface-muted font-bold`}
                style={{ width: LABEL_WIDTH }}
                title={periodTotal === null ? undefined : formatLocaleNumber(periodTotal)}
              >
                <span className="block truncate">{DAILY_METRIC.label}</span>
                {periodTotal !== null && (
                  <span className="block truncate font-normal text-fg-muted tabular-nums">
                    Tot. {formatShortNumber(periodTotal, DAILY_METRIC.decimals, 9)}
                  </span>
                )}
              </div>
              {columns.map((column) => {
                const value = sumInRange(metrics, column);
                const full = value === null ? '' : formatLocaleNumber(value, DAILY_METRIC.decimals);
                return (
                  <div
                    key={column.start}
                    style={{ width: column.width }}
                    title={
                      full
                        ? `${formatDateToIT(column.start)}: ${full} ${DAILY_METRIC.unit}`
                        : undefined
                    }
                    className={`flex shrink-0 items-center justify-center truncate border-r border-line px-0.5 tabular-nums ${columnTone(column)}`}
                  >
                    {value === null
                      ? ''
                      : formatShortNumber(value, DAILY_METRIC.decimals, maxDigits)}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex border-b border-line-strong">
            <div
              className={`${labelCell} flex items-center bg-surface text-xs font-bold uppercase`}
              style={{ width: LABEL_WIDTH }}
            >
              {isWeekColumns ? 'Settimana' : 'Giorno'}
            </div>
            {columns.map((column) => {
              const start = dayLabel(column.start);
              const holidayText = column.holidays.join(', ');
              if (isWeekColumns) {
                const end = dayLabel(column.end);
                return (
                  <button
                    key={column.start}
                    type="button"
                    onClick={() => onShowDays(column.start)}
                    style={{ width: column.width }}
                    title={`Mostra i giorni dal ${formatDateToIT(column.start)} al ${formatDateToIT(column.end)}${holidayText ? ` · ${holidayText}` : ''}`}
                    className={`shrink-0 cursor-pointer border-r border-line py-1 text-center text-xs hover:bg-surface-strong ${columnTone(column)}`}
                  >
                    <span className="block font-bold">
                      {start.day} {start.month}
                      {holidayText && (
                        <>
                          <span className="ml-0.5 text-holiday-fg" aria-hidden="true">
                            •
                          </span>
                          <span className="sr-only">, festività: {holidayText}</span>
                        </>
                      )}
                    </span>
                    <span className="block text-fg-muted">
                      – {end.day} {end.month}
                    </span>
                  </button>
                );
              }
              return (
                <div
                  key={column.start}
                  style={{ width: column.width }}
                  title={`${formatDateToIT(column.start)}${holidayText ? ` · Festività: ${holidayText}` : ''}`}
                  className={`shrink-0 border-r border-line py-1 text-center ${columnTone(column)} ${column.isToday ? 'font-bold' : ''}`}
                >
                  <span className="block text-xs uppercase">
                    {start.weekday}
                    {holidayText && <span aria-hidden="true"> •</span>}
                  </span>
                  <span className="block text-sm leading-tight font-bold">
                    {start.day}
                    {zoom === 'detail' && ` ${start.month}`}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="divide-y divide-line">
            {visibleLanes.map((lane) => {
              const laneTasks = shownTasks.filter((task) => task.laneId === lane.id);
              const { placed, tracks } = placeTasks(laneTasks, range);
              const height = Math.max(1, tracks) * (barHeight + TRACK_GAP) + LANE_PADDING * 2;
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
                    className={`${labelCell} flex flex-col justify-center bg-surface-muted`}
                    style={{ width: LABEL_WIDTH }}
                    title={lane.name}
                  >
                    <span className="text-xs font-bold tracking-wide break-words uppercase">
                      {lane.name}
                    </span>
                    <span className="text-xs text-fg-muted">{placed.length} attività</span>
                  </div>

                  <div className="relative flex">
                    {columns.map((column) => (
                      <div
                        key={column.start}
                        onClick={() => {
                          if (!isClickAfterDrag()) onAddTaskAt(column.start, lane.id);
                        }}
                        style={{ width: column.width }}
                        className={`group/cell flex shrink-0 cursor-pointer items-center justify-center border-r border-line hover:bg-accent-soft ${column.red ? 'bg-holiday' : ''}`}
                      >
                        <Plus
                          className="h-4 w-4 text-link opacity-0 group-hover/cell:opacity-100 pointer-coarse:hidden"
                          aria-hidden="true"
                        />
                      </div>
                    ))}

                    <div className="pointer-events-none absolute inset-0">
                      {placed.map((item) => (
                        <TaskBar
                          key={item.task.id}
                          placed={item}
                          dayWidth={dayWidth}
                          top={LANE_PADDING + item.track * (barHeight + TRACK_GAP)}
                          height={barHeight}
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
            <div className="flex border-t-2 border-warning">
              <div
                className={`${labelCell} flex flex-col justify-center bg-warning-soft`}
                style={{ width: LABEL_WIDTH }}
              >
                <span className="flex items-center gap-1 text-xs font-bold uppercase">
                  <StickyNote className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                  Note
                </span>
                <span className="text-xs text-fg-muted">
                  {isWeekColumns ? 'Per settimana' : 'Per giorno'}
                </span>
              </div>
              {columns.map((column) => {
                const notes = Object.entries(dailyNotes)
                  .filter(([date]) => column.start <= date && date <= column.end)
                  .sort(([a], [b]) => a.localeCompare(b));
                if (isWeekColumns) {
                  return (
                    <button
                      key={column.start}
                      type="button"
                      onClick={() => onShowDays(column.start)}
                      style={{ width: column.width }}
                      title={
                        notes.length > 0
                          ? notes
                              .map(([date, text]) => `${formatDateToIT(date)}: ${text}`)
                              .join('\n')
                          : `Mostra i giorni dal ${formatDateToIT(column.start)}`
                      }
                      className="min-h-14 shrink-0 cursor-pointer border-r border-line p-1 text-xs hover:bg-warning-soft"
                    >
                      {notes.length > 0 && (
                        <span className="rounded-sm bg-warning-soft px-1 font-semibold">
                          {notes.length} {notes.length === 1 ? 'nota' : 'note'}
                        </span>
                      )}
                    </button>
                  );
                }
                const date = column.start;
                const text = dailyNotes[date] ?? '';
                const moving = noteDrag.drag;
                const isSource = moving?.from === date;
                const isTarget = moving !== null && moving.to === date && moving.to !== moving.from;
                // Where the note would land: its text, faded, in the free day under the pointer.
                const preview = isTarget && moving.allowed ? dailyNotes[moving.from] : undefined;
                return (
                  <button
                    key={date}
                    id={`note-cell-${date}`}
                    type="button"
                    onPointerDown={text ? (event) => noteDrag.startDrag(event, date) : undefined}
                    onClick={() => {
                      if (!noteDrag.isClickAfterDrag()) setEditingNoteDate(date);
                    }}
                    onKeyDown={text ? (event) => handleNoteKeyDown(event, date) : undefined}
                    style={{ width: column.width }}
                    aria-label={
                      text
                        ? `Nota del ${formatDateToIT(date)}: ${text}`
                        : `Aggiungi una nota per il ${formatDateToIT(date)}`
                    }
                    aria-describedby={text ? noteHelpId : undefined}
                    title={text || undefined}
                    className={`group/note flex min-h-16 shrink-0 border-r border-line p-1 text-left ${
                      text ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                    } ${column.red ? 'bg-holiday' : ''} ${
                      isTarget
                        ? `ring-2 ring-inset ${moving.allowed ? 'ring-link' : 'ring-danger'}`
                        : ''
                    }`}
                  >
                    {text ? (
                      <span
                        className={`line-clamp-3 w-full rounded-xs border border-warning bg-warning-soft p-1 text-xs leading-4 break-words group-hover/note:shadow-sm ${
                          isSource ? 'opacity-40' : ''
                        }`}
                      >
                        {text}
                      </span>
                    ) : preview ? (
                      <span className="line-clamp-3 w-full rounded-xs border border-dashed border-warning bg-warning-soft p-1 text-xs leading-4 break-words opacity-80">
                        {preview}
                      </span>
                    ) : (
                      <span className="flex w-full items-center justify-center rounded-xs border border-dashed border-line text-fg-muted opacity-60 group-hover/note:border-warning group-hover/note:opacity-100">
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
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
