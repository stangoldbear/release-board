import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  User,
} from 'lucide-react';
import type { DailyMetric, DailyNotes, Lane, RowVisibility, TaskItem } from '../types';
import { getColorById } from '../data/colors';
import { formatLocaleNumber } from '../domain/numberFormat';
import { DAILY_METRIC } from '../domain/plan';
import {
  addDays,
  daysBetween,
  formatDateToISO,
  formatDateToIT,
  getWeekDays,
  isRedDay,
  ITALIAN_DAYS_SHORT,
  parseISODate,
} from '../utils/dateUtils';

interface WeeklyDetailViewProps {
  currentDate: Date;
  onChangeWeek: (date: Date) => void;
  tasks: TaskItem[];
  lanes: Lane[];
  metrics: DailyMetric[];
  dailyNotes: DailyNotes;
  highlightWeekends: boolean;
  visibility: RowVisibility;
  onUpdateTask: (task: TaskItem) => void;
  onSelectTask: (task: TaskItem) => void;
  onDuplicateTask?: (task: TaskItem) => void;
  onAddTaskAt: (dateStr: string, laneId: string) => void;
}

export const WeeklyDetailView: React.FC<WeeklyDetailViewProps> = ({
  currentDate,
  onChangeWeek,
  tasks,
  lanes,
  metrics,
  dailyNotes,
  highlightWeekends,
  visibility,
  onUpdateTask,
  onSelectTask,
  onDuplicateTask,
  onAddTaskAt,
}) => {
  const weekDays = getWeekDays(currentDate);

  const startOfWeek = weekDays[0];
  const endOfWeek = weekDays[6];

  const metricsMap = React.useMemo(() => {
    const map = new Map<string, string>();
    metrics.forEach((m) => map.set(m.date, formatLocaleNumber(m.value, DAILY_METRIC.decimals)));
    return map;
  }, [metrics]);

  const handlePrevWeek = () => {
    onChangeWeek(addDays(currentDate, -7));
  };

  const handleNextWeek = () => {
    onChangeWeek(addDays(currentDate, 7));
  };

  const handleShiftDay = (task: TaskItem, daysToAdd: number) => {
    onUpdateTask({
      ...task,
      startDate: formatDateToISO(addDays(parseISODate(task.startDate), daysToAdd)),
      endDate: formatDateToISO(addDays(parseISODate(task.endDate), daysToAdd)),
    });
  };

  // Drag and drop onto a specific day: the task keeps its length and its lane.
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDropOnDay = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const length = daysBetween(task.startDate, task.endDate);
    onUpdateTask({
      ...task,
      startDate: targetDateStr,
      endDate: formatDateToISO(addDays(parseISODate(targetDateStr), length - 1)),
    });
  };

  return (
    <div className="space-y-4">
      {/* Week Navigator Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              id="prev-week-btn"
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 hover:bg-white text-slate-700 rounded-md transition-colors"
              title="Settimana precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="next-week-btn"
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 hover:bg-white text-slate-700 rounded-md transition-colors"
              title="Settimana successiva"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-sm text-slate-800">
              Settimana dal {formatDateToIT(startOfWeek)} al {formatDateToIT(endOfWeek)}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Trascina una scheda su un altro giorno per spostarla
        </div>
      </div>

      {/* 7 Days Columns Board */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((dayDate) => {
          const dateStr = formatDateToISO(dayDate);
          const dayName = ITALIAN_DAYS_SHORT[dayDate.getDay()];
          const redInfo = isRedDay(dayDate, highlightWeekends);
          const metricVal = metricsMap.get(dateStr);
          const isToday = dateStr === formatDateToISO(new Date());

          // Tasks that overlap this day, on visible lanes only
          const dayTasks = tasks.filter(
            (t) =>
              dateStr >= t.startDate &&
              dateStr <= t.endDate &&
              !visibility.hiddenLaneIds.includes(t.laneId),
          );

          const showThisNote = visibility.showNotes;

          return (
            <div
              key={dateStr}
              onDragOver={(e) => e.preventDefault()}
              className={`flex flex-col rounded-xl border transition-all min-h-[460px] ${
                redInfo.isRed
                  ? 'bg-rose-50/60 border-rose-200'
                  : isToday
                    ? 'bg-blue-50/30 border-blue-300 ring-1 ring-blue-300'
                    : 'bg-white border-slate-200'
              }`}
            >
              {/* Day Header */}
              <div
                className={`p-3 border-b rounded-t-xl ${
                  redInfo.isRed
                    ? 'bg-rose-200/50 border-rose-300 text-rose-950'
                    : isToday
                      ? 'bg-blue-100/60 border-blue-200 text-blue-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold tracking-wider flex items-center gap-1">
                    {dayName}
                    {redInfo.isHoliday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
                    )}
                  </span>
                  <span
                    className="text-[11px] font-mono font-bold text-slate-700 bg-black/5 px-1.5 py-0.5 rounded"
                    title={formatDateToIT(dayDate)}
                  >
                    {formatDateToIT(dayDate)}
                  </span>
                </div>

                {redInfo.isHoliday && (
                  <div
                    className="mt-1 text-[10px] font-bold text-rose-900 bg-white/80 px-1.5 py-0.5 rounded border border-rose-300 truncate"
                    title={`Festività italiana: ${redInfo.holidayName}`}
                  >
                    {redInfo.holidayName}
                  </div>
                )}

                {metricVal && (
                  <div className="mt-1 text-[10px] font-mono text-slate-600 bg-white/70 px-1.5 py-0.5 rounded flex items-center justify-between">
                    <span>{DAILY_METRIC.label}:</span>
                    <strong>{metricVal}</strong>
                  </div>
                )}

                {showThisNote && dailyNotes[dateStr] && (
                  <div className="mt-1 text-[10px] text-amber-950 bg-amber-100/90 border border-amber-300 rounded px-1.5 py-1">
                    <span className="font-bold text-amber-800 mr-1">Nota:</span>
                    <span>{dailyNotes[dateStr]}</span>
                  </div>
                )}
              </div>

              {/* Tasks List for this day */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnDay(e, dateStr)}
                className="p-2 space-y-2.5 flex-1 overflow-y-auto"
              >
                {dayTasks.map((task) => {
                  const color = getColorById(task.colorId);
                  const isDashed = task.borderStyle === 'dashed';
                  const lane = lanes.find((l) => l.id === task.laneId);
                  const isMultiDay = task.startDate !== task.endDate;

                  return (
                    <div
                      key={`${task.id}-${dateStr}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => onSelectTask(task)}
                      className={`p-2.5 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${
                        isDashed ? 'border-dashed' : 'border-solid'
                      } ${color.bg} ${color.border} ${color.text} shadow-xs group`}
                    >
                      {/* Top badges */}
                      <div className="flex items-center justify-between mb-1 text-[10px]">
                        <span className="font-semibold truncate max-w-[100px] opacity-75">
                          {lane?.name ?? 'Senza corsia'}
                        </span>
                        {isMultiDay && (
                          <span className="px-1.5 py-0.5 rounded bg-black/10 font-mono text-[9px] font-bold">
                            {formatDateToIT(task.startDate)} → {formatDateToIT(task.endDate)}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-xs leading-snug uppercase tracking-tight whitespace-pre-line">
                        {task.title}
                      </h4>

                      {/* Assignee & Deliverables counter */}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/10 text-[10px]">
                        <span className="flex items-center gap-1 font-medium opacity-85">
                          <User className="w-3 h-3" />
                          {task.assignee || 'Non assegnato'}
                        </span>

                        {task.deliverables && task.deliverables.length > 0 && (
                          <span className="font-mono text-[10px]">
                            ✓ {task.deliverables.length}
                          </span>
                        )}
                      </div>

                      {/* Quick Day Shift & Duplicate Controls on Hover */}
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShiftDay(task, -1);
                            }}
                            className="p-1 hover:bg-black/10 rounded text-[10px] flex items-center gap-0.5 cursor-pointer"
                            title="Sposta indietro di 1 giorno"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            -1d
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShiftDay(task, 1);
                            }}
                            className="p-1 hover:bg-black/10 rounded text-[10px] flex items-center gap-0.5 cursor-pointer"
                            title="Sposta avanti di 1 giorno"
                          >
                            +1d
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>

                        {onDuplicateTask && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateTask(task);
                            }}
                            className="px-1.5 py-0.5 hover:bg-black/10 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Duplica questa attività"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            <span>Copia</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {dayTasks.length === 0 && (
                  <div className="h-28 flex flex-col items-center justify-center text-slate-300 text-xs border border-dashed border-slate-200 rounded-lg">
                    <span>Nessuna attività</span>
                  </div>
                )}
              </div>

              {/* Quick Add Button on footer */}
              <div className="p-2 border-t border-slate-100 bg-white/40">
                <button
                  type="button"
                  onClick={() => onAddTaskAt(dateStr, lanes[0]?.id ?? '')}
                  className="w-full py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Aggiungi
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
