import { useLayoutEffect, useMemo, useState } from 'react';
import { NO_FILTER, filterTasks, isFiltering } from '../domain/filters';
import type { TaskFilter } from '../domain/filters';
import { copyOfTask, diffTask, isPlanEmpty } from '../domain/plan';
import type { MetricValueChange, TaskChanges } from '../domain/plan';
import { buildSamplePlan } from '../domain/sample';
import { ZOOM_COLUMN_UNIT, isInRange, weekRange } from '../domain/schedule';
import type { DailyMetric, PlanSnapshot, TaskItem } from '../domain/types';
import { RowVisibilityBar } from '../features/calendar/RowVisibilityBar';
import { Timeline } from '../features/calendar/Timeline';
import { WeekBoard } from '../features/calendar/WeekBoard';
import { useCalendarView } from '../features/calendar/useCalendarView';
import {
  ALL_ROWS_VISIBLE,
  parseRowVisibility,
  toggleLane,
} from '../features/calendar/rowVisibility';
import { HistoryPage } from '../features/history/HistoryPage';
import { DailyMetricsDialog } from '../features/metrics/DailyMetricsDialog';
import { ImportForecastDialog } from '../features/metrics/ImportForecastDialog';
import { SettingsDialog } from '../features/settings/SettingsDialog';
import { TaskDialog } from '../features/tasks/TaskDialog';
import { TaskSummary } from '../features/tasks/TaskSummary';
import { isBoolean, usePreference } from '../infra/preferences';
import { useToast } from '../shared/ui/Toast';
import { VersionStamp } from '../shared/ui/VersionStamp';
import { parseISODate, startOfMonth, startOfWeek, todayIso } from '../utils/dateUtils';
import { EmptyPlanNotice } from './EmptyPlanNotice';
import { Header } from './Header';
import type { Instance } from './Instance';
import type { PlanRepository } from './PlanRepository';
import { SyncIndicator } from './SyncIndicator';
import { useThemeSetting } from './ThemeProvider';
import { useHashPage } from './useHashPage';

/** The dialog on screen, if any: only one at a time. */
type OpenDialog =
  | { kind: 'task'; task: TaskItem }
  /** A new task, with suggested date and lane. */
  | { kind: 'task'; task: null; date: string; laneId: string }
  | { kind: 'metrics' }
  | { kind: 'import' }
  | { kind: 'settings' };

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The plan as the repository delivers it; null until the first delivery. */
function usePlan(repository: PlanRepository): PlanSnapshot | null {
  const [plan, setPlan] = useState<PlanSnapshot | null>(null);
  // A layout effect: a plan that is available right away is shown in the first paint.
  useLayoutEffect(() => repository.subscribe(setPlan), [repository]);
  return plan;
}

interface AppProps {
  repository: PlanRepository;
  /** Where the data lives, and what that makes available. */
  instance: Instance;
  /** Why the saved data could not be loaded, when it could not. */
  loadWarning: string | null;
}

export default function App({ repository, instance, loadWarning }: AppProps) {
  const plan = usePlan(repository);
  const showToast = useToast();
  const [visibility, setVisibility] = usePreference(
    'row-visibility',
    parseRowVisibility,
    ALL_ROWS_VISIBLE,
  );
  const [highlightWeekends, setHighlightWeekends] = usePreference(
    'highlight-weekends',
    isBoolean,
    true,
  );
  const [showMetrics, setShowMetrics] = usePreference('show-metrics', isBoolean, true);
  const [hidePastDays, setHidePastDays] = usePreference('hide-past-days', isBoolean, false);
  const { theme, setTheme } = useThemeSetting();

  const [view, dispatchView] = useCalendarView();
  const [page, goToPage] = useHashPage();
  const [filters, setFilters] = useState<TaskFilter>(NO_FILTER);
  const [dialog, setDialog] = useState<OpenDialog | null>(null);

  const allTasks = plan?.tasks;
  const filteredTasks = useMemo(() => filterTasks(allTasks ?? [], filters), [allTasks, filters]);

  // Without the past, the timeline starts today, or on the Monday of this week in weekly columns.
  const today = todayIso();
  const firstShownDay = ZOOM_COLUMN_UNIT[view.zoom] === 'week' ? startOfWeek(today) : today;
  const timelineStart = hidePastDays ? firstShownDay : view.range.start;
  const timelineRange = useMemo(
    () => ({ start: timelineStart, end: view.range.end }),
    [timelineStart, view.range.end],
  );

  if (!plan) return null;

  if (page === 'history') {
    return (
      <HistoryPage
        history={instance.kind === 'cloud' ? instance.history : null}
        lanes={plan.lanes}
        onBack={() => goToPage('calendar')}
      />
    );
  }

  const week = weekRange(view.anchor);
  const anchorDate = parseISODate(view.anchor);

  // Tasks
  const handleSaveTask = (content: Omit<TaskItem, 'id'>) => {
    if (dialog?.kind === 'task' && dialog.task) {
      const before = dialog.task;
      repository.updateTask(before.id, diffTask(before, { ...content, id: before.id }));
    } else {
      repository.createTask(content);
    }
    showToast(`Attività "${oneLine(content.title)}" salvata`);
  };

  const handleChangeTask = (taskId: string, changes: TaskChanges) => {
    repository.updateTask(taskId, changes);
  };

  const handleDeleteTask = (taskId: string) => {
    repository.deleteTask(taskId);
    showToast('Attività eliminata');
  };

  const handleDuplicateTask = (task: TaskItem) => {
    repository.createTask(copyOfTask(task));
    showToast(`Attività "${oneLine(task.title)}" duplicata`);
  };

  const openTask = (task: TaskItem) => setDialog({ kind: 'task', task });

  const handleAddTaskAt = (date: string, laneId: string) => {
    setDialog({ kind: 'task', task: null, date, laneId });
  };

  // A new task starts today when today is in view, otherwise on the first day in view.
  const handleNewTask = () => {
    const date =
      view.mode === 'week'
        ? isInRange(today, week)
          ? today
          : week.start
        : startOfMonth(view.anchor) === startOfMonth(today)
          ? today
          : view.anchor;
    handleAddTaskAt(date, plan.lanes[0]?.id ?? '');
  };

  const handleSaveMetrics = (changes: MetricValueChange[]) => {
    repository.setMetricValues(changes);
    showToast('Valori giornalieri aggiornati');
  };

  // The imported days come into view, so that their colors confirm the import.
  const handleImportForecast = (days: DailyMetric[]) => {
    repository.importDailyValues(days);
    showToast(`${days.length} ${days.length === 1 ? 'giorno' : 'giorni'} di fatturato importati`);
    const [first] = days;
    if (first && view.mode === 'timeline') dispatchView({ type: 'goTo', date: first.date });
  };

  // Whole plan
  const handleReplacePlan = (next: PlanSnapshot) => {
    repository.replacePlan(next);
    setVisibility(ALL_ROWS_VISIBLE);
    showToast('Dati ripristinati dal backup');
  };

  const handleLoadSample = () => {
    repository.replacePlan(buildSamplePlan(anchorDate.getFullYear(), anchorDate.getMonth()));
    showToast('Dati di esempio caricati');
  };

  const handleShowAllRows = () => setVisibility(ALL_ROWS_VISIBLE);

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-fg selection:bg-accent selection:text-on-accent">
      <Header
        view={view}
        onViewAction={dispatchView}
        filters={filters}
        onFilterChange={setFilters}
        highlightWeekends={highlightWeekends}
        showMetrics={showMetrics}
        hidePastDays={hidePastDays}
        onToggleWeekends={() => setHighlightWeekends((value) => !value)}
        onToggleMetrics={() => setShowMetrics((value) => !value)}
        onToggleHidePastDays={() => setHidePastDays((value) => !value)}
        onNewTask={handleNewTask}
        onOpenSettings={() => setDialog({ kind: 'settings' })}
        onOpenMetrics={() => setDialog({ kind: 'metrics' })}
        onImportMetrics={() => setDialog({ kind: 'import' })}
        syncIndicator={instance.kind === 'cloud' && <SyncIndicator repository={repository} />}
      />

      {instance.kind === 'local' && instance.onSignIn && (
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-warning bg-warning-soft px-4 py-1.5 text-center text-xs">
          Stai provando l'app senza account: i dati restano in questo browser.
          <button
            type="button"
            onClick={instance.onSignIn}
            className="cursor-pointer font-semibold text-link underline"
          >
            Accedi all'istanza condivisa
          </button>
        </p>
      )}

      <main className="w-full flex-1 space-y-4 px-4 py-5 sm:px-6">
        <TaskSummary
          tasks={plan.tasks}
          shownCount={isFiltering(filters) ? filteredTasks.length : null}
          onClearFilter={() => setFilters(NO_FILTER)}
        />

        {isPlanEmpty(plan) && (
          <EmptyPlanNotice
            warning={loadWarning}
            onLoadSample={handleLoadSample}
            onRestoreBackup={() => setDialog({ kind: 'settings' })}
          />
        )}

        {view.mode === 'timeline' ? (
          <Timeline
            range={timelineRange}
            zoom={view.zoom}
            anchor={view.anchor}
            jump={view.jump}
            onScrolled={(first, last, settled) =>
              dispatchView({ type: 'scrolled', first, last, settled })
            }
            tasks={filteredTasks}
            lanes={plan.lanes}
            metrics={plan.metrics}
            dailyNotes={plan.dailyNotes}
            showMetrics={showMetrics}
            highlightWeekends={highlightWeekends}
            visibility={visibility}
            onShowAllRows={handleShowAllRows}
            onZoom={(step) => dispatchView({ type: 'zoomBy', step })}
            onShowDays={(date) => dispatchView({ type: 'goTo', date, zoom: 'detail' })}
            onChangeTask={handleChangeTask}
            onOpenTask={openTask}
            onDuplicateTask={handleDuplicateTask}
            onDeleteTask={handleDeleteTask}
            onAddTaskAt={handleAddTaskAt}
            onSaveNote={(date, text) => repository.setNote(date, text)}
            onMoveNote={(from, to, text) => repository.moveNote(from, to, text)}
          />
        ) : (
          <WeekBoard
            week={week}
            tasks={filteredTasks}
            lanes={plan.lanes}
            metrics={plan.metrics}
            dailyNotes={plan.dailyNotes}
            highlightWeekends={highlightWeekends}
            visibility={visibility}
            onChangeTask={handleChangeTask}
            onOpenTask={openTask}
            onDuplicateTask={handleDuplicateTask}
            onAddTaskAt={handleAddTaskAt}
            onMoveNote={(from, to) => repository.moveNote(from, to)}
          />
        )}

        <RowVisibilityBar
          lanes={plan.lanes}
          visibility={visibility}
          onToggleLane={(laneId) => setVisibility((current) => toggleLane(current, laneId))}
          onToggleNotes={() =>
            setVisibility((current) => ({ ...current, showNotes: !current.showNotes }))
          }
          onShowAll={handleShowAllRows}
        />
      </main>

      <footer className="w-full px-4 pb-5 sm:px-6">
        <VersionStamp />
      </footer>

      {dialog?.kind === 'task' && (
        <TaskDialog
          initialTask={dialog.task}
          defaultDate={dialog.task ? undefined : dialog.date}
          defaultLaneId={dialog.task ? undefined : dialog.laneId}
          lanes={plan.lanes}
          onClose={() => setDialog(null)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          onDuplicate={handleDuplicateTask}
        />
      )}

      {dialog?.kind === 'metrics' && (
        <DailyMetricsDialog
          year={anchorDate.getFullYear()}
          month={anchorDate.getMonth()}
          metrics={plan.metrics}
          onClose={() => setDialog(null)}
          onSave={handleSaveMetrics}
        />
      )}

      {dialog?.kind === 'import' && (
        <ImportForecastDialog
          metrics={plan.metrics}
          onImport={handleImportForecast}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.kind === 'settings' && (
        <SettingsDialog
          plan={plan}
          instance={instance}
          theme={theme}
          onChangeTheme={setTheme}
          onClose={() => setDialog(null)}
          onReplacePlan={handleReplacePlan}
          onOpenHistory={() => {
            setDialog(null);
            goToPage('history');
          }}
        />
      )}
    </div>
  );
}
