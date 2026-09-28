import { useEffect, useMemo, useState } from 'react';
import { CircleCheck } from 'lucide-react';
import type {
  DailyMetric,
  FilterOptions,
  PlanSnapshot,
  RowVisibility,
  TaskItem,
  ViewMode,
} from './types';
import { Header } from './components/Header';
import { GanttTimeline } from './components/GanttTimeline';
import { WeeklyDetailView } from './components/WeeklyDetailView';
import { RowVisibilityBar } from './components/RowVisibilityBar';
import { TaskModal } from './components/TaskModal';
import { DailyMetricsModal } from './components/DailyMetricsModal';
import { SettingsDialog } from './components/SettingsDialog';
import { EmptyPlanNotice } from './components/EmptyPlanNotice';
import { createBackupFile, parseBackupText, serializeBackup } from './domain/backup';
import { createEmptyPlan, isPlanEmpty } from './domain/plan';
import { buildSamplePlan } from './domain/sample';
import { formatDateToISO } from './utils/dateUtils';
import { createId } from './utils/id';

const STORAGE_KEYS = {
  PLAN: 'release-board:plan',
  ROW_VISIBILITY: 'release-board:row-visibility',
} as const;

const DEFAULT_VISIBILITY: RowVisibility = { hiddenLaneIds: [], showNotes: true };

/** What the task dialog is editing: an existing task, or a new one with suggested defaults. */
type TaskDialogState =
  { mode: 'edit'; task: TaskItem } | { mode: 'create'; date: string; laneId: string };

/**
 * Reads the saved plan. The saved copy uses the backup format, so it is validated the same way;
 * an unreadable copy is kept under another key instead of being overwritten.
 */
function loadPlan(): { plan: PlanSnapshot; warning: string | null } {
  let stored: string | null;
  try {
    stored = localStorage.getItem(STORAGE_KEYS.PLAN);
  } catch {
    return { plan: createEmptyPlan(), warning: 'Il browser non consente di salvare i dati.' };
  }
  if (stored === null) return { plan: createEmptyPlan(), warning: null };

  const result = parseBackupText(stored);
  if (result.ok) return { plan: result.plan, warning: null };

  try {
    localStorage.setItem(`${STORAGE_KEYS.PLAN}:non-leggibile:${Date.now()}`, stored);
  } catch {
    // Nothing else to do: the warning below still tells the user.
  }
  return {
    plan: createEmptyPlan(),
    warning: 'I dati salvati non erano leggibili: ne è stata conservata una copia nel browser.',
  };
}

function loadVisibility(): RowVisibility {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROW_VISIBILITY) ?? 'null');
    if (
      typeof stored === 'object' &&
      stored !== null &&
      'hiddenLaneIds' in stored &&
      'showNotes' in stored &&
      Array.isArray(stored.hiddenLaneIds) &&
      typeof stored.showNotes === 'boolean'
    ) {
      return {
        hiddenLaneIds: stored.hiddenLaneIds.filter((id): id is string => typeof id === 'string'),
        showNotes: stored.showNotes,
      };
    }
  } catch {
    // Fall back to the default below.
  }
  return DEFAULT_VISIBILITY;
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export default function App() {
  const [initial] = useState(loadPlan);
  const [plan, setPlan] = useState<PlanSnapshot>(initial.plan);
  const [visibility, setVisibility] = useState<RowVisibility>(loadVisibility);

  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentWeekDate, setCurrentWeekDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [highlightWeekends, setHighlightWeekends] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({ search: '', status: '' });

  const [taskDialog, setTaskDialog] = useState<TaskDialogState | null>(null);
  const [isMetricsDialogOpen, setIsMetricsDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAN, serializeBackup(createBackupFile(plan, new Date())));
    } catch {
      // Storage full or disabled: the plan stays in memory for this session.
    }
  }, [plan]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROW_VISIBILITY, JSON.stringify(visibility));
    } catch {
      // Visibility is a convenience: losing it is harmless.
    }
  }, [visibility]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const showToast = (message: string) => setToastMessage(message);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
    } else {
      setCurrentMonth((month) => month - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
    } else {
      setCurrentMonth((month) => month + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setCurrentWeekDate(today);
  };

  // Tasks
  const handleSaveTask = (task: TaskItem) => {
    setPlan((current) => {
      const exists = current.tasks.some((existing) => existing.id === task.id);
      return {
        ...current,
        tasks: exists
          ? current.tasks.map((existing) => (existing.id === task.id ? task : existing))
          : [...current.tasks, task],
      };
    });
    showToast(`Attività "${oneLine(task.title)}" salvata`);
  };

  const handleUpdateTask = (task: TaskItem) => {
    setPlan((current) => ({
      ...current,
      tasks: current.tasks.map((existing) => (existing.id === task.id ? task : existing)),
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    setPlan((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    }));
    showToast('Attività eliminata');
  };

  const handleDuplicateTask = (task: TaskItem) => {
    const copy: TaskItem = {
      ...task,
      id: createId(),
      title: task.title.includes('(Copia)') ? task.title : `${task.title} (Copia)`,
    };
    setPlan((current) => ({ ...current, tasks: [...current.tasks, copy] }));
    showToast(`Attività "${oneLine(task.title)}" duplicata`);
  };

  const handleAddTaskAt = (date: string, laneId: string) => {
    setTaskDialog({ mode: 'create', date, laneId });
  };

  const handleNewTask = () => {
    const today = new Date();
    const isShownMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;
    const date = formatDateToISO(isShownMonth ? today : new Date(currentYear, currentMonth, 1));
    setTaskDialog({ mode: 'create', date, laneId: plan.lanes[0]?.id ?? '' });
  };

  // Notes and metrics
  const handleUpdateDailyNote = (date: string, text: string) => {
    setPlan((current) => {
      const dailyNotes = { ...current.dailyNotes };
      if (text.trim()) {
        dailyNotes[date] = text.trim();
      } else {
        delete dailyNotes[date];
      }
      return { ...current, dailyNotes };
    });
  };

  const handleSaveMetrics = (metrics: DailyMetric[]) => {
    setPlan((current) => ({ ...current, metrics }));
    showToast('Valori giornalieri aggiornati');
  };

  // Row visibility
  const handleToggleLane = (laneId: string) => {
    setVisibility((current) => ({
      ...current,
      hiddenLaneIds: current.hiddenLaneIds.includes(laneId)
        ? current.hiddenLaneIds.filter((id) => id !== laneId)
        : [...current.hiddenLaneIds, laneId],
    }));
  };

  const handleToggleNotes = () => {
    setVisibility((current) => ({ ...current, showNotes: !current.showNotes }));
  };

  const handleShowAllRows = () => setVisibility(DEFAULT_VISIBILITY);

  // Whole plan
  const handleReplacePlan = (next: PlanSnapshot) => {
    setPlan(next);
    setVisibility(DEFAULT_VISIBILITY);
    showToast('Dati ripristinati dal backup');
  };

  const handleLoadSample = () => {
    setPlan(buildSamplePlan(currentYear, currentMonth));
    showToast('Dati di esempio caricati');
  };

  const filteredTasks = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return plan.tasks.filter((task) => {
      if (filters.status && task.status !== filters.status) return false;
      if (!query) return true;
      return [task.title, task.assignee ?? '', task.description ?? ''].some((field) =>
        field.toLowerCase().includes(query),
      );
    });
  }, [plan.tasks, filters]);

  const stats = useMemo(
    () => ({
      total: plan.tasks.length,
      inProgress: plan.tasks.filter((task) => task.status === 'in_progress').length,
      completed: plan.tasks.filter((task) => task.status === 'completed').length,
      planned: plan.tasks.filter((task) => task.status === 'planned').length,
    }),
    [plan.tasks],
  );

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-slate-800 selection:text-white">
      <Header
        year={currentYear}
        month={currentMonth}
        viewMode={viewMode}
        filters={filters}
        highlightWeekends={highlightWeekends}
        showMetrics={showMetrics}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        onChangeViewMode={setViewMode}
        onFilterChange={setFilters}
        onToggleWeekends={() => setHighlightWeekends((value) => !value)}
        onToggleMetrics={() => setShowMetrics((value) => !value)}
        onNewTask={handleNewTask}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMetrics={() => setIsMetricsDialogOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-slate-700">Attività:</span>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>
                Totali: <strong>{stats.total}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>
                In corso: <strong>{stats.inProgress}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                Completate: <strong>{stats.completed}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              <span>
                Pianificate: <strong>{stats.planned}</strong>
              </span>
            </div>
          </div>
          {filteredTasks.length !== plan.tasks.length && (
            <span className="text-[11px] text-slate-500">
              Filtro attivo: <strong>{filteredTasks.length}</strong> su {plan.tasks.length}
            </span>
          )}
        </div>

        {isPlanEmpty(plan) && (
          <EmptyPlanNotice
            warning={initial.warning}
            onLoadSample={handleLoadSample}
            onRestoreBackup={() => setIsSettingsOpen(true)}
          />
        )}

        {viewMode === 'month' ? (
          <GanttTimeline
            year={currentYear}
            month={currentMonth}
            tasks={filteredTasks}
            lanes={plan.lanes}
            metrics={plan.metrics}
            dailyNotes={plan.dailyNotes}
            onUpdateDailyNote={handleUpdateDailyNote}
            showMetrics={showMetrics}
            highlightWeekends={highlightWeekends}
            visibility={visibility}
            onShowAllRows={handleShowAllRows}
            onUpdateTask={handleUpdateTask}
            onSelectTask={(task) => setTaskDialog({ mode: 'edit', task })}
            onDuplicateTask={handleDuplicateTask}
            onDeleteTask={handleDeleteTask}
            onAddTaskAt={handleAddTaskAt}
          />
        ) : (
          <WeeklyDetailView
            currentDate={currentWeekDate}
            onChangeWeek={setCurrentWeekDate}
            tasks={filteredTasks}
            lanes={plan.lanes}
            metrics={plan.metrics}
            dailyNotes={plan.dailyNotes}
            highlightWeekends={highlightWeekends}
            visibility={visibility}
            onUpdateTask={handleUpdateTask}
            onSelectTask={(task) => setTaskDialog({ mode: 'edit', task })}
            onDuplicateTask={handleDuplicateTask}
            onAddTaskAt={handleAddTaskAt}
          />
        )}

        <RowVisibilityBar
          lanes={plan.lanes}
          visibility={visibility}
          onToggleLane={handleToggleLane}
          onToggleNotes={handleToggleNotes}
          onShowAll={handleShowAllRows}
        />
      </main>

      {taskDialog && (
        <TaskModal
          initialTask={taskDialog.mode === 'edit' ? taskDialog.task : null}
          defaultDate={taskDialog.mode === 'create' ? taskDialog.date : undefined}
          defaultLaneId={taskDialog.mode === 'create' ? taskDialog.laneId : undefined}
          lanes={plan.lanes}
          onClose={() => setTaskDialog(null)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onDuplicate={handleDuplicateTask}
        />
      )}

      {isMetricsDialogOpen && (
        <DailyMetricsModal
          year={currentYear}
          month={currentMonth}
          metrics={plan.metrics}
          onClose={() => setIsMetricsDialogOpen(false)}
          onSave={handleSaveMetrics}
        />
      )}

      {isSettingsOpen && (
        <SettingsDialog
          plan={plan}
          onClose={() => setIsSettingsOpen(false)}
          onReplacePlan={handleReplacePlan}
        />
      )}

      {/* The live region stays mounted so screen readers announce each new message. */}
      <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50">
        {toastMessage && (
          <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-medium flex items-center gap-2">
            <CircleCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
