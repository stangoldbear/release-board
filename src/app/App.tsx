import { useLayoutEffect, useMemo, useState } from 'react';
import {
  NO_FILTER,
  SEARCH_MODES,
  filterMemos,
  filterProjects,
  filterTasks,
  isSearching,
  matchingNoteDays,
  searchResults,
  searchWords,
  stepResult,
} from '../domain/filters';
import type { SearchResult, SearchResultKind, TaskFilter } from '../domain/filters';
import {
  MEMO_SCOPES,
  diffMemo,
  followerInGroup,
  groupMemos,
  memosInScope,
  readGroupOrder,
  readSeenReminders,
  rememberReminders,
} from '../domain/memos';
import type { MemoContent } from '../domain/memos';
import type { AssignmentChanges, AssignmentContent } from '../domain/assignments';
import { copyOfTask, diffTask, isPlanEmpty } from '../domain/plan';
import { notesOfProject, rememberNoteReminders } from '../domain/projectNotes';
import type { ProjectNoteChanges, ProjectNoteContent } from '../domain/projectNotes';
import { diffProject } from '../domain/projects';
import type { ProjectContent } from '../domain/projects';
import type { MetricValueChange, TaskChanges } from '../domain/plan';
import { buildSamplePlan } from '../domain/sample';
import { isInRange, weekRange } from '../domain/schedule';
import type {
  DailyMetric,
  Memo,
  MemoAuthor,
  PlanSnapshot,
  Project,
  ProjectField,
  RoadmapConfig,
  Stakeholder,
  TaskItem,
  Team,
} from '../domain/types';
import { noteCellId } from '../features/calendar/NotesRow';
import { NEW_TASK_ID, ReleasesArea } from '../features/calendar/ReleasesArea';
import { taskBarId } from '../features/calendar/TaskBar';
import { useCalendarDisplay } from '../features/calendar/useCalendarDisplay';
import { dayWidthOf } from '../features/calendar/calendarView';
import { columnUnit } from '../features/calendar/timelineLayout';
import { useCalendarView } from '../features/calendar/useCalendarView';
import { HistoryPage } from '../features/history/HistoryPage';
import { MemoDialog } from '../features/memos/MemoDialog';
import { MemoReminders } from '../features/memos/MemoReminders';
import { memoElementId } from '../features/memos/MemoCard';
import { MemoStrip } from '../features/memos/MemoStrip';
import { NEW_MEMO_ID } from '../features/memos/NewMemoForm';
import { DailyMetricsDialog } from '../features/metrics/DailyMetricsDialog';
import { ImportForecastDialog } from '../features/metrics/ImportForecastDialog';
import { fieldSearchTexts } from '../features/roadmaps/fieldUi';
import { ProjectNoteReminders } from '../features/roadmaps/ProjectNoteReminders';
import { NEW_PROJECT_ID, RoadmapArea } from '../features/roadmaps/RoadmapArea';
import { useRoadmapDisplay } from '../features/roadmaps/useRoadmapDisplay';
import { SettingsDialog } from '../features/settings/SettingsDialog';
import { TaskDialog } from '../features/tasks/TaskDialog';
import { isBoolean, oneOf, usePreference } from '../infra/preferences';
import { SCROLL_DURATION_MS } from '../features/calendar/scrollMotion';
import { projectBarId } from '../features/roadmaps/ProjectBar';
import { prefersReducedMotion } from '../shared/motion';
import { SearchHighlightContext, resultKey } from '../shared/ui/Highlight';
import { areaTitleId } from '../shared/ui/Area';
import { Button } from '../shared/ui/Button';
import { TEXT_SCALES } from '../shared/ui/textScale';
import { useToast } from '../shared/ui/Toast';
import { VersionStamp } from '../shared/ui/VersionStamp';
import { parseISODate, startOfMonth, startOfWeek, todayIso } from '../utils/dateUtils';
import {
  ALL_AREAS_VISIBLE,
  BETA_FEATURES_PREFERENCE,
  BETA_PARTS,
  areaElementId,
  availableAreas,
  parseAreaVisibility,
} from './areas';
import { useAuthorNames } from './authorNames';
import type { AreaId } from './areas';
import { EmptyPlanNotice } from './EmptyPlanNotice';
import { Header, SEARCH_FIELD_ID } from './Header';
import type { Instance } from './Instance';
import type { PlanRepository } from './PlanRepository';
import { SearchResultsBar, describeFound } from './SearchResultsBar';
import type { FoundCount } from './SearchResultsBar';
import { SyncIndicator } from './SyncIndicator';
import { useThemeSetting } from './ThemeProvider';
import { useHashPage } from './useHashPage';
import { useSyncState } from './useSyncState';

/** Where each kind of search result is: its area, and its element in the area. */
const RESULT_TARGETS: Record<
  SearchResultKind,
  { area: AreaId; elementId: (id: string) => string }
> = {
  memo: { area: 'notes', elementId: memoElementId },
  task: { area: 'releases', elementId: taskBarId },
  note: { area: 'releases', elementId: noteCellId },
  project: { area: 'roadmaps', elementId: projectBarId },
};

/** The dialog on screen, if any: only one at a time; projects have theirs in their own area. */
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
  const sync = useSyncState(repository);
  const showToast = useToast();
  const [areas, setAreas] = usePreference('areas', parseAreaVisibility, ALL_AREAS_VISIBLE);
  // The parts still in development: off by default, on for who works on them, in their browser.
  const [betaFeatures, setBetaFeatures] = usePreference(BETA_FEATURES_PREFERENCE, isBoolean, false);
  const shownAreas = availableAreas(betaFeatures);
  const hiddenParts = betaFeatures ? [] : BETA_PARTS;
  const [display, displayControls] = useCalendarDisplay();
  // Older names: the text size and compact mode began with the calendar, and browsers keep them.
  const [textScale, setTextScale] = usePreference('calendar-text-scale', oneOf(TEXT_SCALES), 1);
  const [compact, setCompact] = usePreference('calendar-compact', isBoolean, false);
  const [memosExpanded, setMemosExpanded] = usePreference('memos-expanded', isBoolean, false);
  const [memoScope, setMemoScope] = usePreference('memos-scope', oneOf(MEMO_SCOPES), 'mine');
  const [memosGrouped, setMemosGrouped] = usePreference('memos-grouped', isBoolean, false);
  const [groupOrder, setGroupOrder] = usePreference('memo-group-order', readGroupOrder, []);
  const [seenReminders, setSeenReminders] = usePreference(
    'memo-reminders-seen',
    readSeenReminders,
    {},
  );
  const { theme, setTheme } = useThemeSetting();

  const [view, dispatchView] = useCalendarView();
  // The roadmap has a view of its own, over the same kinds of days, and its own display choices.
  const [roadmapView, dispatchRoadmapView] = useCalendarView('roadmap-', 'quarter');
  const [roadmapDisplay, roadmapControls] = useRoadmapDisplay();
  const [seenNoteReminders, setSeenNoteReminders] = usePreference(
    'project-note-reminders-seen',
    readSeenReminders,
    {},
  );
  const [page, goToPage] = useHashPage();
  const [filters, setFilters] = useState<TaskFilter>(NO_FILTER);
  const [searchMode, setSearchMode] = usePreference('search-mode', oneOf(SEARCH_MODES), 'all');
  // The result brought into view, by its key; the search forgets it when it finds other things.
  const [currentResult, setCurrentResult] = useState<string | null>(null);
  const [dialog, setDialog] = useState<OpenDialog | null>(null);

  const allTasks = plan?.tasks;
  const filteredTasks = useMemo(
    () => filterTasks(allTasks ?? [], { ...filters, mode: searchMode }),
    [allTasks, filters, searchMode],
  );
  // The search finds words in the notes of the days, the free notes and the projects too.
  const allNotes = plan?.dailyNotes;
  const noteMatches = useMemo(
    () => matchingNoteDays(allNotes ?? {}, filters.search, searchMode),
    [allNotes, filters.search, searchMode],
  );
  const words = useMemo(() => searchWords(filters.search), [filters.search]);
  const highlight = useMemo(() => ({ words, current: currentResult }), [words, currentResult]);
  // In a shared instance the strip shows the user's own notes, or all; the search looks in all.
  const me: MemoAuthor | null =
    instance.kind === 'cloud' ? { id: instance.user.githubId, login: instance.user.login } : null;
  const allMemos = plan?.memos ?? [];
  // Authors go by their full name: the user's own from the sign-in, the others' from GitHub.
  const names = useAuthorNames(
    me
      ? allMemos.flatMap((memo) =>
          memo.author && memo.author.id !== me.id ? [memo.author.id] : [],
        )
      : [],
    instance.kind === 'cloud' ? instance.lookupName : null,
  );
  const myName = instance.kind === 'cloud' ? instance.user.name : null;
  const nameOf = (author: MemoAuthor): string =>
    (author.id === me?.id ? myName : names.get(author.id)) || author.login;
  const scopedMemos = me ? memosInScope(allMemos, memoScope, me.id) : allMemos;
  // The user's own group comes first, until they move it.
  const memoGroupOrder = me && !groupOrder.includes(me.id) ? [me.id, ...groupOrder] : groupOrder;
  const grouped = me !== null && memosGrouped;
  const shownMemos = isSearching(filters)
    ? filterMemos(
        allMemos,
        filters.search,
        searchMode,
        (memo) => memo.author && nameOf(memo.author),
      )
    : scopedMemos;

  // Without the past, the timeline starts today, or on the Monday of this week in weekly columns.
  const today = todayIso();
  const firstShownDay = columnUnit(dayWidthOf(view)) === 'week' ? startOfWeek(today) : today;
  const timelineStart = display.hidePastDays ? firstShownDay : view.range.start;
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
    displayControls.showAllRows();
    showToast('Dati ripristinati dal backup');
  };

  const handleLoadSample = () => {
    repository.replacePlan(buildSamplePlan(anchorDate.getFullYear(), anchorDate.getMonth()));
    showToast('Dati di esempio caricati');
  };

  // An area that appears comes into view: it may be far down the page.
  const handleToggleArea = (area: AreaId) => {
    const showing = !areas[area];
    setAreas((current) => ({ ...current, [area]: !current[area] }));
    if (!showing) return;
    window.requestAnimationFrame(() =>
      document.getElementById(areaElementId(area))?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      }),
    );
  };

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

  /**
   * The places a note can take from its window: in its group when the notes are grouped, otherwise
   * in the strip as shown, or in the whole strip for a note the search found outside it.
   */
  const memoPlaces = (memo: Memo) => {
    const strip = scopedMemos.some((item) => item.id === memo.id) ? scopedMemos : plan.memos;
    const group = grouped
      ? groupMemos(strip, memoGroupOrder).find((item) => item.key === (memo.author?.id ?? ''))
      : undefined;
    if (!group) return { strip, inGroup: false };
    return {
      strip: group.memos,
      inGroup: true,
      follower: (index: number) => followerInGroup(strip, group.memos, memo.id, index),
    };
  };

  // Projects
  const handleCreateProject = (content: ProjectContent) => {
    repository.createProject(content);
    showToast(`Progetto «${oneLine(content.title)}» aggiunto`);
  };

  const handleSaveProject = (project: Project, content: ProjectContent) => {
    const changes = diffProject(project, content);
    if (Object.keys(changes).length > 0) repository.updateProject(project.id, changes);
    showToast(`Progetto «${oneLine(content.title)}» salvato`);
  };

  const handleDeleteProject = (project: Project) => {
    repository.deleteProject(project.id);
    showToast('Progetto eliminato');
    focusAfterClosing(NEW_PROJECT_ID);
  };

  // The notes of the projects, who works on them, and the people themselves.
  const noteActions = {
    onCreate: (content: ProjectNoteContent) => {
      repository.createProjectNote(content);
      showToast('Nota aggiunta al progetto');
    },
    onUpdate: (noteId: string, changes: ProjectNoteChanges) =>
      repository.updateProjectNote(noteId, changes),
    onDelete: (noteId: string) => {
      repository.deleteProjectNote(noteId);
      showToast('Nota eliminata');
    },
  };
  const assignmentActions = {
    onCreate: (content: AssignmentContent) => {
      repository.createAssignment(content);
      showToast('Persona aggiunta al progetto');
    },
    onUpdate: (assignmentId: string, changes: AssignmentChanges) =>
      repository.updateAssignment(assignmentId, changes),
    onDelete: (assignmentId: string) => {
      repository.deleteAssignment(assignmentId);
      showToast('Persona tolta dal progetto');
    },
  };
  const stakeholderActions = {
    onSave: (stakeholder: Stakeholder) => {
      repository.saveStakeholder(stakeholder);
      showToast(`«${oneLine(stakeholder.name)}» salvata`);
    },
  };
  const configActions = {
    onSaveField: (field: ProjectField) => repository.saveProjectField(field),
    onDeleteField: (fieldId: string) => {
      repository.deleteProjectField(fieldId);
      showToast('Campo eliminato');
    },
    onSaveTeam: (team: Team) => repository.saveTeam(team),
    onDeleteTeam: (teamId: string) => {
      repository.deleteTeam(teamId);
      showToast('Team eliminato');
    },
    onSaveStakeholder: stakeholderActions.onSave,
    onDeleteStakeholder: (stakeholderId: string) => {
      repository.deleteStakeholder(stakeholderId);
      showToast('Persona eliminata, con il suo lavoro sui progetti');
    },
    onReplaceConfig: (config: RoadmapConfig) => {
      repository.replaceRoadmapConfig(config);
      showToast('Configurazione della roadmap caricata');
    },
  };

  const searching = isSearching(filters);
  // The search looks in the notes of a project, their owners and tags, and the values of its fields.
  const projectTexts = (project: Project) => [
    ...notesOfProject(plan.projectNotes, project.id).flatMap((note) => [
      note.text,
      ...(note.owners ?? []),
      ...(note.tags ?? []),
    ]),
    ...fieldSearchTexts(project, plan.roadmap.fields),
  ];
  const shownProjects = searching
    ? filterProjects(plan.projects, filters.search, searchMode, projectTexts)
    : plan.projects;

  // Search
  const results: SearchResult[] = searching
    ? searchResults({
        // In the order of the page: by group when the notes are grouped.
        memos: grouped
          ? groupMemos(shownMemos, memoGroupOrder).flatMap((group) => group.memos)
          : shownMemos,
        tasks: filteredTasks,
        notes: Object.fromEntries(
          Object.entries(plan.dailyNotes).filter(([date]) => noteMatches?.has(date)),
        ),
        // Without the beta features the projects are not on the page: the search leaves them out.
        projects: betaFeatures ? shownProjects : [],
      })
    : [];
  const searchCounts: FoundCount[] = [
    { found: shownMemos.length, total: plan.memos.length, one: 'nota libera', many: 'note libere' },
    { found: filteredTasks.length, total: plan.tasks.length, one: 'attività', many: 'attività' },
    {
      found: noteMatches?.size ?? 0,
      total: Object.keys(plan.dailyNotes).length,
      one: 'nota del giorno',
      many: 'note dei giorni',
    },
    ...(betaFeatures
      ? [
          {
            found: shownProjects.length,
            total: plan.projects.length,
            one: 'progetto',
            many: 'progetti',
          },
        ]
      : []),
  ];
  const currentIndex = results.findIndex(
    (result) => resultKey(result.kind, result.id) === currentResult,
  );

  const handleSearchChange = (search: string) => {
    setFilters({ ...filters, search });
    setCurrentResult(null);
  };

  /**
   * Brings a result into view: its area appears, the calendar goes to its day, with the past when
   * the day is past, and the page scrolls to it. The result has a ring until another one is shown.
   */
  const showResult = (index: number) => {
    const result = results[index];
    if (!result) return;
    setCurrentResult(resultKey(result.kind, result.id));
    const { area, elementId } = RESULT_TARGETS[result.kind];
    if (!areas[area]) setAreas((current) => ({ ...current, [area]: true }));
    let wait = 0;
    if (result.kind === 'project') {
      // The roadmap goes to the start of the project, with the past when the project is past.
      const project = plan.projects.find((item) => item.id === result.id);
      if (project) {
        if (roadmapDisplay.hidePastDays && project.endDate < today)
          roadmapControls.togglePastDays();
        dispatchRoadmapView({ type: 'goTo', date: project.startDate });
        if (!prefersReducedMotion()) wait = SCROLL_DURATION_MS + 50;
      }
    } else if (result.date) {
      // The result is drawn only on the timeline, with its day, its lane and the notes row.
      if (display.hidePastDays && (result.endDate ?? result.date) < today) {
        displayControls.togglePastDays();
      }
      const laneId = plan.tasks.find((task) => task.id === result.id)?.laneId;
      if (result.kind === 'task' && laneId && display.visibility.hiddenLaneIds.includes(laneId)) {
        displayControls.toggleLane(laneId);
      }
      if (result.kind === 'note' && !display.visibility.showNotes) displayControls.toggleNotes();
      dispatchView({ type: 'goTo', date: result.date, zoom: view.zoom });
      // The timeline scrolls to the day first, unless the system asks for less motion.
      if (!prefersReducedMotion()) wait = SCROLL_DURATION_MS + 50;
    }
    window.setTimeout(() => {
      const element =
        document.getElementById(elementId(result.id)) ??
        document.getElementById(areaElementId(area));
      element?.scrollIntoView({
        block: 'center',
        // In the middle of the calendars, clear of the column of the names.
        inline: result.kind === 'memo' ? 'nearest' : 'center',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }, wait);
  };

  return (
    <SearchHighlightContext value={highlight}>
      <div className="flex min-h-screen flex-col bg-canvas font-sans text-fg selection:bg-accent selection:text-on-accent">
        <Header
          textScale={textScale}
          onTextScaleChange={setTextScale}
          compact={compact}
          onToggleCompact={() => setCompact((value) => !value)}
          availableAreas={shownAreas}
          areas={areas}
          onToggleArea={handleToggleArea}
          search={filters.search}
          onSearchChange={handleSearchChange}
          onSearchKey={(backwards) => {
            if (results.length === 0) return;
            showResult(
              stepResult(
                currentIndex < 0 ? null : currentIndex,
                results.length,
                backwards ? -1 : 1,
              ),
            );
          }}
          searchBar={
            searching && (
              <SearchResultsBar
                mode={searchMode}
                onModeChange={(mode) => {
                  setSearchMode(mode);
                  setCurrentResult(null);
                }}
                counts={searchCounts}
                results={results}
                current={currentIndex < 0 ? null : currentIndex}
                onShow={showResult}
                onClear={() => {
                  handleSearchChange('');
                  // The bar goes away with its button: the focus goes back to the field.
                  window.requestAnimationFrame(() =>
                    document.getElementById(SEARCH_FIELD_ID)?.focus(),
                  );
                }}
              />
            )
          }
          searchAnnouncement={searching ? describeFound(searchCounts, results.length) : ''}
          syncIndicator={
            instance.kind === 'cloud' && (
              <SyncIndicator repository={repository} hiddenParts={hiddenParts} />
            )
          }
          onOpenSettings={() => setDialog({ kind: 'settings' })}
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

        <main className="w-full flex-1 space-y-6 px-4 py-5 sm:px-6">
          {isPlanEmpty(plan) && (
            <EmptyPlanNotice
              warning={loadWarning}
              onLoadSample={handleLoadSample}
              onRestoreBackup={() => setDialog({ kind: 'settings' })}
            />
          )}

          {areas.notes && (
            <MemoStrip
              id={areaElementId('notes')}
              unavailable={sync.missing.includes('memos')}
              memos={shownMemos}
              total={plan.memos.length}
              sharing={
                me && {
                  me,
                  nameOf,
                  scope: memoScope,
                  grouped: memosGrouped,
                  onToggleGrouped: () => setMemosGrouped((value) => !value),
                  // The user's own group comes first, until they move it.
                  groupOrder: memoGroupOrder,
                  onGroupOrderChange: setGroupOrder,
                  counts: {
                    mine: memosInScope(plan.memos, 'mine', me.id).length,
                    all: plan.memos.length,
                  },
                  onScopeChange: setMemoScope,
                }
              }
              searching={searching}
              expanded={memosExpanded}
              textScale={textScale}
              compact={compact}
              onToggleExpanded={() => setMemosExpanded((value) => !value)}
              onAdd={(title, isPrivate) =>
                repository.createMemo(isPrivate ? { title, private: true } : { title })
              }
              onOpen={(memo) => setDialog({ kind: 'memo', memo })}
              onMove={(memoId, beforeId) => repository.moveMemo(memoId, beforeId)}
              today={today}
            />
          )}

          {areas.releases && (
            <ReleasesArea
              id={areaElementId('releases')}
              plan={plan}
              tasks={filteredTasks}
              noteMatches={noteMatches}
              status={filters.status}
              onStatusChange={(status) => setFilters({ ...filters, status })}
              view={view}
              onViewAction={dispatchView}
              timelineRange={timelineRange}
              week={week}
              display={display}
              displayControls={displayControls}
              textScale={textScale}
              compact={compact}
              onNewTask={handleNewTask}
              onOpenTask={openTask}
              onChangeTask={handleChangeTask}
              onDuplicateTask={handleDuplicateTask}
              onDeleteTask={handleDeleteTask}
              onAddTaskAt={handleAddTaskAt}
              onSaveNote={(date, text) => repository.setNote(date, text)}
              onMoveNote={(from, to, text) => repository.moveNote(from, to, text)}
              onEditMetrics={() => setDialog({ kind: 'metrics' })}
              onImportMetrics={() => setDialog({ kind: 'import' })}
            />
          )}

          {betaFeatures && areas.roadmaps && (
            <RoadmapArea
              id={areaElementId('roadmaps')}
              unavailable={sync.missing.includes('projects')}
              detailsUnavailable={sync.missing.includes('roadmap')}
              plan={plan}
              shown={shownProjects}
              searching={searching}
              view={roadmapView}
              onViewAction={dispatchRoadmapView}
              display={roadmapDisplay}
              displayControls={roadmapControls}
              today={today}
              textScale={textScale}
              compact={compact}
              me={me}
              nameOf={nameOf}
              projectActions={{
                onCreate: handleCreateProject,
                onUpdate: (projectId, changes) => repository.updateProject(projectId, changes),
                onSave: handleSaveProject,
                onDelete: handleDeleteProject,
              }}
              noteActions={noteActions}
              assignmentActions={assignmentActions}
              stakeholderActions={stakeholderActions}
            />
          )}

          {shownAreas.every(({ id }) => !areas[id]) && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-line bg-surface p-10 text-center">
              <p className="text-sm font-bold">Tutte le aree sono nascoste</p>
              <p className="text-xs text-fg-muted">Scegli in alto quali mostrare.</p>
              <Button
                variant="primary"
                onClick={() => {
                  setAreas(ALL_AREAS_VISIBLE);
                  // The button goes away: the focus goes to the first area.
                  window.requestAnimationFrame(() =>
                    document.getElementById(areaTitleId(areaElementId('notes')))?.focus(),
                  );
                }}
              >
                Mostra tutte le aree
              </Button>
            </div>
          )}
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
            {...memoPlaces(dialog.memo)}
            me={me}
            authorName={dialog.memo.author ? nameOf(dialog.memo.author) : null}
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

        {betaFeatures && !sync.missing.includes('roadmap') && (
          <ProjectNoteReminders
            notes={plan.projectNotes}
            projects={plan.projects}
            seen={seenNoteReminders}
            onSeen={(shown) =>
              setSeenNoteReminders((seen) => rememberNoteReminders(seen, shown, plan.projectNotes))
            }
            onDone={(noteId) => repository.updateProjectNote(noteId, { status: 'done' })}
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
            betaFeatures={betaFeatures}
            onToggleBetaFeatures={setBetaFeatures}
            roadmapUnavailable={sync.missing.includes('roadmap')}
            roadmapActions={configActions}
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
    </SearchHighlightContext>
  );
}
