import type { DragEvent } from 'react';
import { ArrowLeft, ArrowRight, Copy, Plus, StickyNote, User } from 'lucide-react';
import { formatLocaleNumber } from '../../domain/numberFormat';
import { DAILY_METRIC } from '../../domain/plan';
import type { TaskChanges } from '../../domain/plan';
import { moveTask, moveTaskTo, rangeDays, tasksOnDay } from '../../domain/schedule';
import type { DateRange } from '../../domain/schedule';
import type { DailyMetric, DailyNotes, Lane, RowVisibility, TaskItem } from '../../domain/types';
import { Button } from '../../shared/ui/Button';
import { taskColorStyle } from '../../themes';
import {
  ITALIAN_DAYS_SHORT,
  formatDateToIT,
  isRedDay,
  parseISODate,
  todayIso,
} from '../../utils/dateUtils';

interface WeekBoardProps {
  week: DateRange;
  tasks: TaskItem[];
  lanes: Lane[];
  metrics: DailyMetric[];
  dailyNotes: DailyNotes;
  highlightWeekends: boolean;
  visibility: RowVisibility;
  onChangeTask: (taskId: string, changes: TaskChanges) => void;
  onOpenTask: (task: TaskItem) => void;
  onDuplicateTask: (task: TaskItem) => void;
  onAddTaskAt: (date: string, laneId: string) => void;
}

const DRAG_TYPE = 'text/plain';

/** One column per day of the week with the tasks of that day as cards. */
export function WeekBoard({
  week,
  tasks,
  lanes,
  metrics,
  dailyNotes,
  highlightWeekends,
  visibility,
  onChangeTask,
  onOpenTask,
  onDuplicateTask,
  onAddTaskAt,
}: WeekBoardProps) {
  const today = todayIso();
  const visibleTasks = tasks.filter((task) => !visibility.hiddenLaneIds.includes(task.laneId));
  const laneNames = new Map(lanes.map((lane) => [lane.id, lane.name]));

  const shift = (task: TaskItem, days: number) => {
    const { startDate, endDate } = moveTask(task, days);
    onChangeTask(task.id, { startDate, endDate });
  };

  const handleDrop = (event: DragEvent, date: string) => {
    event.preventDefault();
    const task = tasks.find((item) => item.id === event.dataTransfer.getData(DRAG_TYPE));
    if (!task || task.startDate === date) return;
    const { startDate, endDate } = moveTaskTo(task, date);
    onChangeTask(task.id, { startDate, endDate });
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-muted pointer-coarse:hidden">
        Trascina una scheda su un altro giorno per spostarla.
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {rangeDays(week).map((date) => {
          const red = isRedDay(parseISODate(date), highlightWeekends);
          const metric = metrics.find((item) => item.date === date);
          const note = visibility.showNotes ? dailyNotes[date] : undefined;
          const dayTasks = tasksOnDay(visibleTasks, date);
          const isToday = date === today;

          return (
            <section
              key={date}
              aria-label={`${ITALIAN_DAYS_SHORT[parseISODate(date).getDay()]} ${formatDateToIT(date)}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleDrop(event, date)}
              className={`flex min-h-72 flex-col rounded-xl border bg-surface md:min-h-[460px] ${
                isToday ? 'border-link ring-1 ring-link' : 'border-line'
              }`}
            >
              <header
                className={`space-y-1 rounded-t-xl border-b border-line p-3 ${
                  red.isRed ? 'bg-holiday' : isToday ? 'bg-accent-soft' : 'bg-surface-muted'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase">
                    {ITALIAN_DAYS_SHORT[parseISODate(date).getDay()]}
                    {isToday && <span className="ml-1 font-normal normal-case">(oggi)</span>}
                  </span>
                  <span className="font-mono font-bold">{formatDateToIT(date)}</span>
                </div>
                {red.holidayName && (
                  <p className="truncate text-xs font-bold text-holiday-fg" title={red.holidayName}>
                    {red.holidayName}
                  </p>
                )}
                {metric && (
                  <p className="flex justify-between gap-2 text-xs">
                    <span className="text-fg-muted">{DAILY_METRIC.label}</span>
                    <strong className="tabular-nums">
                      {formatLocaleNumber(metric.value, DAILY_METRIC.decimals)}
                    </strong>
                  </p>
                )}
                {note && (
                  <p className="flex gap-1 rounded-sm border border-warning bg-warning-soft px-1.5 py-1 text-xs">
                    <StickyNote
                      className="mt-0.5 h-3 w-3 shrink-0 text-warning"
                      aria-hidden="true"
                    />
                    <span className="break-words">{note}</span>
                  </p>
                )}
              </header>

              <ul className="flex-1 space-y-2 p-2">
                {dayTasks.map((task) => (
                  <li
                    key={task.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData(DRAG_TYPE, task.id)}
                    style={taskColorStyle(task.colorId)}
                    className={`group rounded-lg border-2 p-2 shadow-xs ${
                      task.borderStyle === 'dashed' ? 'border-dashed' : 'border-solid'
                    }`}
                  >
                    <p className="mb-1 truncate text-xs font-semibold opacity-80">
                      {laneNames.get(task.laneId) ?? 'Senza corsia'}
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenTask(task)}
                      className="block w-full cursor-pointer text-left text-xs leading-snug font-bold tracking-tight whitespace-pre-line uppercase hover:underline"
                    >
                      {task.title}
                    </button>
                    {task.startDate !== task.endDate && (
                      <p className="mt-1 font-mono text-xs">
                        {formatDateToIT(task.startDate).slice(0, 5)} →{' '}
                        {formatDateToIT(task.endDate).slice(0, 5)}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between border-t border-current/15 pt-1.5 text-xs">
                      <span className="flex items-center gap-1 opacity-85">
                        <User className="h-3 w-3" aria-hidden="true" />
                        {task.assignee || 'Non assegnato'}
                      </span>
                      {task.deliverables && task.deliverables.length > 0 && (
                        <span className="font-mono">✓ {task.deliverables.length}</span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
                      <span className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => shift(task, -1)}
                          aria-label={`Sposta ${task.title} indietro di un giorno`}
                          className="flex cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 text-xs hover:bg-current/15"
                        >
                          <ArrowLeft className="h-3 w-3" aria-hidden="true" />1 g
                        </button>
                        <button
                          type="button"
                          onClick={() => shift(task, 1)}
                          aria-label={`Sposta ${task.title} avanti di un giorno`}
                          className="flex cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 text-xs hover:bg-current/15"
                        >
                          1 g<ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </span>
                      <button
                        type="button"
                        onClick={() => onDuplicateTask(task)}
                        aria-label={`Duplica ${task.title}`}
                        className="flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs font-semibold hover:bg-current/15"
                      >
                        <Copy className="h-3 w-3" aria-hidden="true" />
                        Copia
                      </button>
                    </div>
                  </li>
                ))}
                {dayTasks.length === 0 && (
                  <li className="flex h-24 items-center justify-center rounded-lg border border-dashed border-line text-xs text-fg-muted">
                    Nessuna attività
                  </li>
                )}
              </ul>

              <div className="border-t border-line p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => onAddTaskAt(date, lanes[0]?.id ?? '')}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Aggiungi
                </Button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
