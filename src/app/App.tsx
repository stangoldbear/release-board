import { useLayoutEffect, useMemo, useState } from 'react';
import {
  NO_FILTER,
  filterMemos,
  filterTasks,
  isFiltering,
  isSearching,
  matchingNoteDays,
} from '../domain/filters';
import type { TaskFilter } from '../domain/filters';
import {
  MEMO_SCOPES,
  diffMemo,
  memosInScope,
  readSeenReminders,
  rememberReminders,
} from '../domain/memos';
import type { MemoContent } from '../domain/memos';
import { copyOfTask, diffTask, isPlanEmpty } from '../domain/plan';
import type { MetricValueChange, TaskChanges } from '../domain/plan';
import { buildSamplePlan } from '../domain/sample';
import { ZOOM_COLUMN_UNIT, isInRange, weekRange } from '../domain/schedule';
import type { DailyMetric, Memo, MemoAuthor, PlanSnapshot, TaskItem } from '../domain/types';
import { RowVisibilityBar } from '../features/calendar/RowVisibilityBar';
import { TEXT_SCALES } from '../features/calendar/timelineLayout';
import { Timeline } from '../features/calendar/Timeline';
import { WeekBoard } from '../features/calendar/WeekBoard';
import { useCalendarView } from '../features/calendar/useCalendarView';
import {
  ALL_ROWS_VISIBLE,
  parseRowVisibility,
  toggleLane,
} from '../features/calendar/rowVisibility';
import { HistoryPage } from '../features/history/HistoryPage';
import { MemoDialog } from '../features/memos/MemoDialog';
import { MemoReminders } from '../features/memos/MemoReminders';
import { MemoStrip, NEW_MEMO_ID, memoElementId } from '../features/memos/MemoStrip';
import { DailyMetricsDialog } from '../features/metrics/DailyMetricsDialog';
import { ImportForecastDialog } from '../features/metrics/ImportForecastDialog';
import { SettingsDialog } from '../features/settings/SettingsDialog';
import { TaskDialog } from '../features/tasks/TaskDialog';
import { TaskSummary } from '../features/tasks/TaskSummary';
import { isBoolean, oneOf, usePreference } from '../infra/preferences';
import { useToast } from '../shared/ui/Toast';
import { VersionStamp } from '../shared/ui/VersionStamp';
import { parseISODate, startOfMonth, startOfWeek, todayIso } from '../utils/dateUtils';
import { EmptyPlanNotice } from './EmptyPlanNotice';
import { Header, NEW_TASK_ID } from './Header';
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
  | { kind: 'memo'; memo: Memo }
  | { kind: 'metrics' }
  | { kind: 'import' }
  | { kind: 'settings' };

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Gives the focus to an element once the windows have closed: the element that opened them may
 * be gone, as a deleted task, and the focus would fall on the page.
 */
function focusAfterClosing(id: string): void {
  window.requestAnimationFrame(() => document.getElementById(id)?.focus());
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
  const [textScale, setTextScale] = usePreference('calendar-text-scale', oneOf(TEXT_SCALES), 1);
  const [compact, setCompact] = usePreference('calendar-compact', isBoolean, false);
  const [memosExpanded, setMemosExpanded] = usePreference('memos-expanded', isBoolean, false);
  const [memoScope, setMemoScope] = usePreference('memos-scope', oneOf(MEMO_SCOPES), 'mine');
  const [seenReminders, setSeenReminders] = usePreference(
    'memo-reminders-seen',
    readSeenReminders,
    {},
  );
  const { theme, setTheme } = useThemeSetting();

  const [view, dispatchView] = useCalendarView();
  const [page, goToPage] = useHashPage();
  const [filters, setFilters] = useState<TaskFilter>(NO_FILTER);
  const [dialog, setDialog] = useState<OpenDialog | null>(null);

  const allTasks = plan?.tasks;
  const filteredTasks = useMemo(() => filterTasks(allTasks ?? [], filters), [allTasks, filters]);
  // The search finds text in the notes of the days and in the free notes too.
  const allNotes = plan?.dailyNotes;
  const noteMatches = useMemo(
    () => matchingNoteDays(allNotes ?? {}, filters.search),
    [allNotes, filters.search],
  );
  // In a shared instance the strip shows the user's own notes, or all; the search looks in all.
  const me: MemoAuthor | null =
    instance.kind === 'cloud' ? { id: instance.user.githubId, login: instance.user.login } : null;
  const allMemos = plan?.memos ?? [];
  const scopedMemos = me ? memosInScope(allMemos, memoScope, me.id) : allMemos;
  const shownMemos = isSearching(filters) ? filterMemos(allMemos, filters.search) : scopedMemos;

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
    focusAfterClosing(NEW_TASK_ID);
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

  // Free notes
  const rememberShown = (shown: Memo[]) =>
    setSeenReminders((seen) => rememberReminders(seen, shown, plan.memos));

  const handleSaveMemo = (memo: Memo, content: MemoContent, beforeId?: string | null) => {
    const changes = diffMemo(memo, content);
    // A note made private, or shared again, takes a new id.
    const id =
      Object.keys(changes).length > 0 || beforeId !== undefined
        ? repository.updateMemo(memo.id, changes, beforeId)
        : memo.id;
    // A reminder set here for a day that has come needs no window to remind of it.
    if (content.remindOn && content.remindOn <= today) {
      rememberShown([{ ...memo, id, remindOn: content.remindOn }]);
    }
    showToast(`Nota libera «${oneLine(content.title)}» salvata`);
  };

  // The focus goes to the next note of the strip, or the one before, or the field that adds one.
  const handleDeleteMemo = (memo: Memo) => {
    const at = shownMemos.findIndex((item) => item.id === memo.id);
    const neighbour = shownMemos[at + 1] ?? shownMemos[at - 1];
    repository.deleteMemo(memo.id);
    showToast('Nota libera eliminata');
    focusAfterClosing(neighbour ? memoElementId(neighbour.id) : NEW_MEMO_ID);
  };

  const searching = isSearching(filters);

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
        textScale={textScale}
        onTextScaleChange={setTextScale}
        compact={compact}
        onToggleCompact={() => setCompact((value) => !value)}
        onToggleWeekends={() => setHighlightWeekends((value) => !value)}
        onToggleMetrics={() => setShowMetrics((value) => !value)}
        onToggleHidePastDays={() => setHidePastDays((value) => !value)}
        onNewTask={handleNewTask}
        onOpenSettings={() => setDialog({ kind: 'settings' })}
        onOpenMetrics={() => setDialog({ kind: 'metrics' })}
        onImportMetrics={() => setDialog({ kind: 'import' })}
        syncIndicator={instance.kind === 'cloud' && <SyncIndicator repository={repository} />}
      />

      {/* Under the header and not fixed with it: the notes scroll away with the page. */}
      <div className="border-b border-line bg-surface px-4 py-3 sm:px-6">
        <MemoStrip
          memos={shownMemos}
          total={plan.memos.length}
          sharing={
            me && {
              me,
              scope: memoScope,
              counts: {
                mine: memosInScope(plan.memos, 'mine', me.id).length,
                all: plan.memos.length,
              },
              onScopeChange: setMemoScope,
            }
          }
          searching={searching}
          expanded={memosExpanded}
          onToggleExpanded={() => setMemosExpanded((value) => !value)}
          onAdd={(title, isPrivate) =>
            repository.createMemo(isPrivate ? { title, private: true } : { title })
          }
          onOpen={(memo) => setDialog({ kind: 'memo', memo })}
          onMove={(memoId, beforeId) => repository.moveMemo(memoId, beforeId)}
          today={today}
        />
      </div>

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
          found={
            isFiltering(filters)
              ? {
                  tasks: filteredTasks.length,
                  search: searching
                    ? {
                        notes: noteMatches?.size ?? 0,
                        allNotes: Object.keys(plan.dailyNotes).length,
                        memos: shownMemos.length,
                        allMemos: plan.memos.length,
                      }
                    : null,
                }
              : null
          }
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
            noteMatches={noteMatches}
            showMetrics={showMetrics}
            highlightWeekends={highlightWeekends}
            textScale={textScale}
            compact={compact}
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
            noteMatches={noteMatches}
            highlightWeekends={highlightWeekends}
            textScale={textScale}
            compact={compact}
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

      {dialog?.kind === 'memo' && (
        <MemoDialog
          memo={dialog.memo}
          // A note found by the search may be outside the strip as shown: then it is the whole strip.
          strip={scopedMemos.some((memo) => memo.id === dialog.memo.id) ? scopedMemos : plan.memos}
          me={me}
          // Deleted by someone else, or made private by its author, while the window was open.
          gone={!plan.memos.some((memo) => memo.id === dialog.memo.id)}
          onSave={(content, beforeId) => handleSaveMemo(dialog.memo, content, beforeId)}
          onDelete={() => handleDeleteMemo(dialog.memo)}
          onClose={() => setDialog(null)}
        />
      )}

      <MemoReminders
        memos={scopedMemos}
        seen={seenReminders}
        onSeen={rememberShown}
        onOpen={(memo) => setDialog({ kind: 'memo', memo })}
      />

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
          textScale={textScale}
          onTextScaleChange={setTextScale}
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
