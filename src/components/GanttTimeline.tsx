import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  CircleCheck,
  Copy,
  Pen,
  EyeOff,
  MoveHorizontal,
  Plus,
  StickyNote,
  Trash,
  X,
} from 'lucide-react';
import type { DailyMetric, DailyNotes, Lane, RowVisibility, TaskItem } from '../types';
import { getColorById } from '../data/colors';
import { formatLocaleNumber } from '../domain/numberFormat';
import { DAILY_METRIC } from '../domain/plan';
import {
  formatDateToISO,
  parseISODate,
  getDaysInMonth,
  isRedDay,
  ITALIAN_MONTHS,
  ITALIAN_DAYS_SHORT,
  formatDateToIT,
} from '../utils/dateUtils';

interface GanttTimelineProps {
  year: number;
  month: number; // 0-11
  tasks: TaskItem[];
  lanes: Lane[];
  metrics: DailyMetric[];
  dailyNotes: DailyNotes;
  onUpdateDailyNote: (dateStr: string, text: string) => void;
  showMetrics: boolean;
  highlightWeekends: boolean;
  visibility: RowVisibility;
  onShowAllRows: () => void;
  onUpdateTask: (task: TaskItem) => void;
  onSelectTask: (task: TaskItem) => void;
  onDuplicateTask?: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
  onAddTaskAt: (dateStr: string, laneId: string) => void;
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
  year,
  month,
  tasks,
  lanes,
  metrics,
  dailyNotes,
  onUpdateDailyNote,
  showMetrics,
  highlightWeekends,
  visibility,
  onShowAllRows,
  onUpdateTask,
  onSelectTask,
  onDuplicateTask,
  onDeleteTask,
  onAddTaskAt,
}) => {
  const days = getDaysInMonth(year, month);
  const containerRef = useRef<HTMLDivElement>(null);

  // Note editing modal state
  const [editingNoteDate, setEditingNoteDate] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');

  // Context Menu state (for right-clicking tasks)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    task: TaskItem;
  } | null>(null);

  useEffect(() => {
    const handleDismiss = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleDismiss);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleDismiss);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Dragging state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'move' | 'resize-left' | 'resize-right' | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState(0);
  const [targetLaneId, setTargetLaneId] = useState<string | null>(null);
  const dragStartPos = useRef<{
    x: number;
    y: number;
    startIdx: number;
    endIdx: number;
    laneId: string;
  } | null>(null);

  // Hover state for creating task
  const [hoveredCell, setHoveredCell] = useState<{ dateStr: string; laneId: string } | null>(null);

  // Quick lookup for daily metric
  const metricsMap = React.useMemo(() => {
    const map = new Map<string, string>();
    metrics.forEach((m) => map.set(m.date, formatLocaleNumber(m.value, DAILY_METRIC.decimals)));
    return map;
  }, [metrics]);

  // Map of date string to day index in month (0 to days.length - 1)
  const dateIndexMap = React.useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((d, idx) => {
      map.set(formatDateToISO(d), idx);
    });
    return map;
  }, [days]);

  // Handle global mouse move / up during drag
  useEffect(() => {
    if (!draggingTaskId || !dragStartPos.current) return;

    const DAY_COLUMN_WIDTH = 56; // estimated column width in px

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartPos.current) return;
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaDays = Math.round(deltaX / DAY_COLUMN_WIDTH);
      setDragOffsetDays(deltaDays);

      // Check vertical lane switch if moving
      if (dragType === 'move') {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const laneElement = elements.find((el) => el.hasAttribute('data-lane-id'));
        if (laneElement) {
          const lId = laneElement.getAttribute('data-lane-id');
          if (lId) setTargetLaneId(lId);
        }
      }
    };

    const handleMouseUp = () => {
      if (dragStartPos.current && draggingTaskId) {
        const task = tasks.find((t) => t.id === draggingTaskId);
        if (task && dragOffsetDays !== 0) {
          const sDate = parseISODate(task.startDate);
          const eDate = parseISODate(task.endDate);

          let newStart = new Date(sDate);
          let newEnd = new Date(eDate);

          if (dragType === 'move') {
            newStart.setDate(newStart.getDate() + dragOffsetDays);
            newEnd.setDate(newEnd.getDate() + dragOffsetDays);
          } else if (dragType === 'resize-left') {
            newStart.setDate(newStart.getDate() + dragOffsetDays);
            if (newStart > newEnd) newStart = new Date(newEnd);
          } else if (dragType === 'resize-right') {
            newEnd.setDate(newEnd.getDate() + dragOffsetDays);
            if (newEnd < newStart) newEnd = new Date(newStart);
          }

          onUpdateTask({
            ...task,
            startDate: formatDateToISO(newStart),
            endDate: formatDateToISO(newEnd),
            laneId: dragType === 'move' && targetLaneId ? targetLaneId : task.laneId,
          });
        }
      }

      setDraggingTaskId(null);
      setDragType(null);
      setDragOffsetDays(0);
      setTargetLaneId(null);
      dragStartPos.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTaskId, dragType, dragOffsetDays, targetLaneId, tasks, onUpdateTask]);

  const firstDayStr = React.useMemo(
    () => (days.length > 0 ? formatDateToISO(days[0]) : ''),
    [days],
  );
  const lastDayStr = React.useMemo(
    () => (days.length > 0 ? formatDateToISO(days[days.length - 1]) : ''),
    [days],
  );

  const startDrag = (
    e: React.MouseEvent,
    task: TaskItem,
    type: 'move' | 'resize-left' | 'resize-right',
  ) => {
    e.stopPropagation();
    let sIdx = dateIndexMap.get(task.startDate);
    if (sIdx === undefined) {
      sIdx = task.startDate < firstDayStr ? 0 : days.length - 1;
    }
    let eIdx = dateIndexMap.get(task.endDate);
    if (eIdx === undefined) {
      eIdx = task.endDate > lastDayStr ? days.length - 1 : 0;
    }

    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      startIdx: sIdx,
      endIdx: eIdx,
      laneId: task.laneId,
    };
    setDraggingTaskId(task.id);
    setDragType(type);
    setDragOffsetDays(0);
    setTargetLaneId(task.laneId);
  };

  // Group tasks by lane
  const laneTasksMap = React.useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    lanes.forEach((l) => map.set(l.id, []));
    tasks.forEach((t) => {
      const list = map.get(t.laneId) || [];
      list.push(t);
      map.set(t.laneId, list);
    });
    return map;
  }, [lanes, tasks]);

  const draggedTask = draggingTaskId ? tasks.find((task) => task.id === draggingTaskId) : undefined;
  const isLaneVisible = (lane: Lane) => !visibility.hiddenLaneIds.includes(lane.id);
  const allRowsHidden = lanes.every((lane) => !isLaneVisible(lane)) && !visibility.showNotes;

  return (
    <div className="w-full bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden select-none">
      {/* Scrollable Container */}
      <div
        ref={containerRef}
        id="gantt-scroll-container"
        className="w-full overflow-x-auto overflow-y-visible scrollbar-thin"
      >
        <div className="min-w-max">
          {/* Header Rows */}
          <div className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300">
            {/* Top Month Header Row */}
            <div className="w-full py-2 px-4 bg-slate-200 border-b border-slate-300 font-bold text-xs tracking-wider text-slate-800 uppercase flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-700" />
                <span>
                  {ITALIAN_MONTHS[month]} {year}
                </span>
              </div>
              <span className="text-[11px] font-normal text-slate-600 normal-case">
                Trascina per spostare, ridimensiona dai bordi
              </span>
            </div>

            {/* Daily metric row */}
            {showMetrics && (
              <div className="flex border-b border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-600">
                <div className="sticky left-0 z-20 w-24 shrink-0 bg-slate-100/95 backdrop-blur-xs border-r border-slate-300 p-1.5 flex items-center justify-center font-sans text-[11px] font-bold text-slate-700 uppercase tracking-wider select-none shadow-2xs">
                  {DAILY_METRIC.label}
                </div>
                {days.map((d) => {
                  const dateStr = formatDateToISO(d);
                  const val = metricsMap.get(dateStr) || '';
                  const redInfo = isRedDay(d, highlightWeekends);
                  const tooltip = redInfo.isHoliday
                    ? `${formatDateToIT(dateStr)}: ${val || '0'} • Festivo: ${redInfo.holidayName}`
                    : val
                      ? `${formatDateToIT(dateStr)}: ${val}`
                      : undefined;

                  return (
                    <div
                      key={`metric-${dateStr}`}
                      className={`w-14 shrink-0 text-center py-1 border-r border-slate-200 truncate px-0.5 text-[10px] font-medium ${
                        redInfo.isRed ? 'bg-rose-200/40 text-rose-900' : 'text-slate-600'
                      }`}
                      title={tooltip}
                    >
                      {val}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Day Numbers and Day Names */}
            <div className="flex bg-white">
              <div className="sticky left-0 z-20 w-24 shrink-0 bg-white/95 backdrop-blur-xs border-r border-slate-300 p-1.5 flex flex-col items-center justify-center font-sans text-[10px] font-bold text-slate-700 uppercase tracking-wider select-none shadow-2xs">
                <span>Giorno</span>
              </div>
              {days.map((d) => {
                const dayNum = d.getDate();
                const dayLetter = ITALIAN_DAYS_SHORT[d.getDay()];
                const redInfo = isRedDay(d, highlightWeekends);
                const isToday = formatDateToISO(d) === formatDateToISO(new Date());

                return (
                  <div
                    key={`day-${dayNum}`}
                    title={
                      redInfo.isHoliday
                        ? `${formatDateToIT(d)} • Festività italiana: ${redInfo.holidayName}`
                        : formatDateToIT(d)
                    }
                    className={`w-14 shrink-0 text-center border-r border-slate-200 py-1.5 transition-colors relative ${
                      redInfo.isRed
                        ? 'bg-rose-300/50 text-rose-950 font-semibold'
                        : isToday
                          ? 'bg-blue-50 text-blue-800 font-bold ring-1 ring-blue-300'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-semibold text-slate-400 flex items-center justify-center gap-0.5">
                      {dayLetter}
                      {redInfo.isHoliday && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block"
                          title={redInfo.holidayName || ''}
                        />
                      )}
                    </div>
                    <div className="text-xs font-bold leading-tight">{dayNum}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lanes & Task Rows */}
          <div className="divide-y divide-slate-200">
            {lanes.map((lane) => {
              if (!isLaneVisible(lane)) return null;

              // Only include tasks that intersect with the current month (or the task currently being dragged)
              const laneTasks = (laneTasksMap.get(lane.id) || []).filter(
                (task) =>
                  (task.startDate <= lastDayStr && task.endDate >= firstDayStr) ||
                  task.id === draggingTaskId,
              );
              const isTargetLane = targetLaneId === lane.id && draggingTaskId !== null;

              // Calculate tracks for non-overlapping tasks
              const sorted = [...laneTasks].sort((a, b) => a.startDate.localeCompare(b.startDate));
              const trackEndCols: number[] = [];

              const positioned = sorted.map((task) => {
                const isDragging = draggingTaskId === task.id;
                let sIdx = dateIndexMap.get(task.startDate);
                if (sIdx === undefined) {
                  sIdx = task.startDate < firstDayStr ? 0 : days.length - 1;
                }
                let eIdx = dateIndexMap.get(task.endDate);
                if (eIdx === undefined) {
                  eIdx = task.endDate > lastDayStr ? days.length - 1 : 0;
                }

                if (isDragging) {
                  if (dragType === 'move') {
                    sIdx += dragOffsetDays;
                    eIdx += dragOffsetDays;
                  } else if (dragType === 'resize-left') {
                    sIdx += dragOffsetDays;
                    if (sIdx > eIdx) sIdx = eIdx;
                  } else if (dragType === 'resize-right') {
                    eIdx += dragOffsetDays;
                    if (eIdx < sIdx) eIdx = sIdx;
                  }
                }

                const startCol = Math.max(0, Math.min(days.length - 1, sIdx));
                const endCol = Math.max(0, Math.min(days.length - 1, eIdx));
                const spanDays = Math.max(1, endCol - startCol + 1);

                let trackIndex = -1;
                for (let t = 0; t < trackEndCols.length; t++) {
                  if (trackEndCols[t] < startCol) {
                    trackIndex = t;
                    trackEndCols[t] = endCol;
                    break;
                  }
                }
                if (trackIndex === -1) {
                  trackIndex = trackEndCols.length;
                  trackEndCols.push(endCol);
                }

                const leftPx = startCol * 56 + 2;
                const widthPx = Math.max(52, spanDays * 56 - 4);
                const topPx = trackIndex * 52 + 8;

                return {
                  task,
                  trackIndex,
                  startCol,
                  endCol,
                  spanDays,
                  leftPx,
                  widthPx,
                  topPx,
                  isDragging,
                };
              });

              const totalTracks = Math.max(1, trackEndCols.length);
              const laneMinHeight = totalTracks * 52 + 20;

              return (
                <div
                  key={lane.id}
                  data-lane-id={lane.id}
                  style={{ minHeight: `${laneMinHeight}px` }}
                  className={`flex relative transition-colors group ${
                    isTargetLane ? 'bg-blue-50/40 ring-1 ring-blue-300' : 'hover:bg-slate-50/40'
                  }`}
                >
                  {/* Sticky Row Identifier on Left */}
                  <div
                    className="sticky left-0 z-20 w-24 shrink-0 bg-slate-50/95 backdrop-blur-xs border-r border-slate-300 p-2 flex flex-col justify-center select-none shadow-2xs"
                    title={lane.name}
                  >
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider break-words">
                      {lane.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {laneTasks.length} attività
                    </span>
                  </div>

                  {/* Day Grid Background Cells */}
                  <div className="flex relative flex-1" style={{ minHeight: `${laneMinHeight}px` }}>
                    {days.map((d) => {
                      const dateStr = formatDateToISO(d);
                      const redInfo = isRedDay(d, highlightWeekends);

                      return (
                        <div
                          key={`cell-${lane.id}-${dateStr}`}
                          onClick={() => onAddTaskAt(dateStr, lane.id)}
                          onMouseEnter={() => setHoveredCell({ dateStr, laneId: lane.id })}
                          onMouseLeave={() => setHoveredCell(null)}
                          title={
                            redInfo.isHoliday
                              ? `Festività italiana: ${redInfo.holidayName}`
                              : undefined
                          }
                          className={`w-14 shrink-0 border-r border-slate-200 cursor-pointer relative transition-colors ${
                            redInfo.isRed ? 'bg-rose-300/40' : 'hover:bg-blue-50/60'
                          }`}
                        >
                          {/* Quick "+" hover trigger */}
                          {hoveredCell?.dateStr === dateStr &&
                            hoveredCell?.laneId === lane.id &&
                            !draggingTaskId && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="w-5 h-5 rounded-full bg-slate-800/80 text-white flex items-center justify-center text-[11px] font-bold shadow-xs">
                                  +
                                </span>
                              </div>
                            )}
                        </div>
                      );
                    })}

                    {/* Task Rectangles Absolute Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                      {positioned.map((pos) => {
                        const { task, leftPx, widthPx, topPx, spanDays, isDragging } = pos;
                        const color = getColorById(task.colorId);
                        const isDashed = task.borderStyle === 'dashed';

                        return (
                          <div
                            key={task.id}
                            id={`task-rect-${task.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTask(task);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                task,
                              });
                            }}
                            onMouseDown={(e) => startDrag(e, task, 'move')}
                            style={{
                              position: 'absolute',
                              left: `${leftPx}px`,
                              width: `${widthPx}px`,
                              top: `${topPx}px`,
                              height: '46px',
                            }}
                            className={`group/task relative pointer-events-auto rounded-xs p-1 cursor-grab active:cursor-grabbing border-2 transition-shadow flex flex-col justify-center select-none ${
                              isDashed ? 'border-dashed' : 'border-solid'
                            } ${color.bg} ${color.border} ${color.text} ${
                              isDragging
                                ? 'shadow-xl ring-2 ring-slate-800 z-40 opacity-90 scale-[1.01]'
                                : 'shadow-xs hover:shadow-md z-10'
                            }`}
                            title={`${task.title}\n${formatDateToIT(task.startDate)} → ${formatDateToIT(task.endDate)}\n(Fai clic destro per duplicare o eliminare)`}
                          >
                            {/* Left resize handle */}
                            <div
                              onMouseDown={(e) => startDrag(e, task, 'resize-left')}
                              className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-black/15 flex items-center justify-center rounded-l-xs z-20 group/left"
                              title="Trascina per anticipare o posticipare l'inizio"
                            >
                              <div className="w-0.5 h-3 bg-slate-400 group-hover/left:bg-slate-800 rounded-full" />
                            </div>

                            {/* Content Block */}
                            <div className="px-1.5 flex flex-col justify-center overflow-hidden">
                              <div className="font-bold text-[10.5px] leading-tight uppercase line-clamp-2 tracking-tight">
                                {task.title}
                              </div>

                              <div className="flex items-center gap-1.5 mt-0.5 text-[9px] opacity-80">
                                {task.assignee && (
                                  <span className="truncate max-w-[80px] font-medium">
                                    {task.assignee}
                                  </span>
                                )}
                                {spanDays > 1 && (
                                  <span className="font-mono ml-auto font-semibold">
                                    {spanDays}g
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right resize handle */}
                            <div
                              onMouseDown={(e) => startDrag(e, task, 'resize-right')}
                              className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-black/15 flex items-center justify-center rounded-r-xs z-20 group/right"
                              title="Trascina per estendere o accorciare la durata"
                            >
                              <div className="w-0.5 h-3 bg-slate-400 group-hover/right:bg-slate-800 rounded-full" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Daily notes row */}
          {visibility.showNotes && (
            <div className="flex border-t-2 border-amber-300/80 bg-amber-50/20 group">
              {/* Sticky Row Identifier on Left */}
              <div
                className="sticky left-0 z-20 w-24 shrink-0 bg-amber-50/95 backdrop-blur-xs border-r border-slate-300 p-2 flex flex-col justify-center select-none shadow-2xs"
                title="Note per giorno"
              >
                <div className="flex items-center gap-1 text-amber-900">
                  <StickyNote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Note</span>
                </div>
                <span className="text-[10px] text-amber-700 font-medium">Per giorno</span>
              </div>

              {/* Day Grid Cells for Notes */}
              <div className="flex relative flex-1 min-h-[62px]">
                {days.map((d) => {
                  const dateStr = formatDateToISO(d);
                  const noteText = dailyNotes[dateStr] || '';
                  const hasNote = Boolean(noteText.trim());
                  const redInfo = isRedDay(d, highlightWeekends);

                  return (
                    <div
                      key={`note-cell-${dateStr}`}
                      onClick={() => {
                        setEditingNoteDate(dateStr);
                        setTempNoteText(noteText);
                      }}
                      className={`w-14 shrink-0 border-r border-slate-200 p-1 flex flex-col justify-center cursor-pointer transition-all relative ${
                        redInfo.isRed
                          ? 'bg-rose-50/30 hover:bg-rose-100/50'
                          : 'hover:bg-amber-100/45'
                      }`}
                      title={
                        hasNote
                          ? `Nota del ${formatDateToIT(d)}:\n${noteText}\n\n(Clicca per modificare)`
                          : `Clicca per inserire una nota per il ${formatDateToIT(d)}`
                      }
                    >
                      {hasNote ? (
                        <div className="h-full w-full bg-amber-100/95 hover:bg-amber-200 border border-amber-300/90 rounded-xs p-1 shadow-2xs flex flex-col justify-between transition-transform active:scale-95">
                          <div className="text-[10px] text-amber-950 font-medium leading-tight line-clamp-2 select-none break-words">
                            {noteText}
                          </div>
                          <div className="flex items-center justify-between text-[8px] font-semibold text-amber-800/80 mt-0.5">
                            <span className="truncate">G.{d.getDate()}</span>
                            <span className="underline">Modifica</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full w-full rounded-xs border border-dashed border-slate-200 hover:border-amber-400 flex flex-col items-center justify-center text-slate-300 hover:text-amber-700 transition-colors">
                          <Plus className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                          <span className="text-[8.5px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Nota
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state when all rows are hidden */}
          {allRowsHidden && (
            <div className="p-12 text-center text-slate-500 bg-slate-50/70 flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shadow-2xs">
                <EyeOff className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                Tutte le righe del calendario sono nascoste
              </p>
              <button
                type="button"
                onClick={onShowAllRows}
                className="mt-1 px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer shadow-xs"
              >
                Mostra tutte le righe
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Note Editing Modal */}
      {editingNoteDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-amber-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
                  <StickyNote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Nota per il {formatDateToIT(editingNoteDate)}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingNoteDate(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Testo della Nota Giornaliera
                </label>
                <textarea
                  autoFocus
                  rows={4}
                  value={tempNoteText}
                  onChange={(e) => setTempNoteText(e.target.value)}
                  placeholder="Scrivi qui promemoria, eventi, scadenze o note operative per questo giorno..."
                  className="w-full px-3 py-2 text-sm bg-amber-50/30 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-400 text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* Quick tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-slate-400 mr-1">Suggeriti:</span>
                {[
                  'Kickoff Deploy',
                  'Code Freeze',
                  'Release Day',
                  'QA Testing',
                  'Sync Operativo',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTempNoteText((prev) => (prev ? `${prev} - ${tag}` : tag))}
                    className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 rounded transition-colors"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {dailyNotes[editingNoteDate] ? (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateDailyNote(editingNoteDate, '');
                    setEditingNoteDate(null);
                  }}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-medium flex items-center gap-1 transition-colors"
                >
                  <Trash className="w-3.5 h-3.5" />
                  Elimina Nota
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNoteDate(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateDailyNote(editingNoteDate, tempNoteText);
                    setEditingNoteDate(null);
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
                >
                  <CircleCheck className="w-3.5 h-3.5" />
                  Salva Nota
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Drag Info Pill */}
      {draggingTaskId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-full shadow-2xl text-xs flex items-center gap-2">
          <MoveHorizontal className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>
            Spostamento di{' '}
            <strong>{dragOffsetDays > 0 ? `+${dragOffsetDays}` : dragOffsetDays} giorni</strong>
            {targetLaneId && targetLaneId !== draggedTask?.laneId ? " (su un'altra corsia)" : ''}
          </span>
          <span className="text-slate-400 text-[11px] ml-2">(Rilascia per applicare)</span>
        </div>
      )}

      {/* Task Context Menu (Right Click on task rectangle) */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: Math.min(
              contextMenu.y,
              typeof window !== 'undefined' ? window.innerHeight - 190 : 300,
            ),
            left: Math.min(
              contextMenu.x,
              typeof window !== 'undefined' ? window.innerWidth - 220 : 300,
            ),
            zIndex: 100,
          }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 w-52 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50/70 rounded-t-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Opzioni Attività
            </p>
            <p className="font-semibold text-slate-800 text-xs truncate">
              {contextMenu.task.title.replace(/\n/g, ' ')}
            </p>
          </div>

          <div className="py-1">
            {onDuplicateTask && (
              <button
                type="button"
                onClick={() => {
                  onDuplicateTask(contextMenu.task);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer font-semibold"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Duplica attività</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onSelectTask(contextMenu.task);
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Pen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Modifica dettagli</span>
            </button>
          </div>

          {onDeleteTask && (
            <div className="border-t border-slate-100 pt-1">
              <button
                type="button"
                onClick={() => {
                  onDeleteTask(contextMenu.task.id);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Elimina attività</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
