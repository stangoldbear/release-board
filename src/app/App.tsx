import { useLayoutEffect, useMemo, useState } from 'react';
import {
  NO_FILTER,
  SEARCH_MODES,
  filterMemos,
  filterMilestones,
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
import { assignmentsOfProject, copyAfterAssignment, moveAssignment } from '../domain/assignments';
import {
  contingencySegments,
  duplicateContingency,
  moveContingency,
  splitContingency,
} from '../domain/contingency';
import { splitDays, splitWork } from '../domain/split';
import { SplitDialog } from '../features/split/SplitDialog';
import type { SplitChoice } from '../features/split/SplitDialog';
import { taskSplitTarget } from '../features/tasks/taskSplit';
import type { AssignmentChanges, AssignmentContent } from '../domain/assignments';
import { copyOfTask, diffTask, isPlanEmpty } from '../domain/plan';
import { notesOfProject, rememberNoteReminders } from '../domain/projectNotes';
import type { ProjectNoteChanges, ProjectNoteContent } from '../domain/projectNotes';
import { CONTINGENCY_SEGMENTS_MAX, arrangementOf, diffProject } from '../domain/projects';
import type { ProjectChanges, ProjectContent } from '../domain/projects';
import {
  nextProjectPosition,
  projectMoves,
  renumberProjects,
  sortProjectsBy,
} from '../domain/projectOrder';
import { projectSpan, withEffectiveEnd } from '../domain/projectSpan';
import { withEffectiveStatus } from '../domain/projectStatus';
import type { ProjectSpan } from '../domain/projectSpan';
import { teamEffortOn } from '../domain/dayEffort';
import {
  filterByLabels,
  labelsFieldOf,
  withLabelAdded,
  withLabelChanged,
  withLabelMoved,
  withLabelRemoved,
} from '../domain/labels';
import { projectColorField } from '../domain/roadmapConfig';
import type { TeamPlan } from '../domain/teamPlan';
import type { RoadmapSettingsChanges } from '../domain/roadmapConfig';
import type { TaskColorId } from '../domain/colors';
import { nextLaneColor, taskColorOf } from '../domain/lanes';
import type { MetricValueChange, TaskChanges } from '../domain/plan';
import { buildSamplePlan } from '../domain/sample';
import type {
  DailyMetric,
  Memo,
  MemoAuthor,
  Milestone,
  PlanSnapshot,
  Project,
  ProjectField,
  RoadmapConfig,
  Stakeholder,
  TaskItem,
  Team,
} from '../domain/types';
import { noteCellId } from '../features/calendar/NotesRow';
import { NEW_ITEM_ID, TimelineArea } from '../features/timeline/TimelineArea';
import { taskBarId } from '../features/calendar/TaskBar';
import { useTimelineDisplay } from '../features/timeline/useTimelineDisplay';
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
import { ProjectReminders } from '../features/roadmaps/ProjectReminders';
import { rememberProjectReminders } from '../domain/projectReminders';
import { SettingsDialog } from '../features/settings/SettingsDialog';
import type { SettingsSectionId } from '../features/settings/settingsSections';
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
import { DEFAULT_DENSITY, DENSITY_IDS, isTight } from '../shared/ui/density';
import { VersionStamp } from '../shared/ui/VersionStamp';
import { addDaysIso, formatDate, parseISODate, todayIso } from '../utils/dateUtils';
import { createId } from '../utils/id';
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
import { canReplacePlan } from './Instance';
import type { Instance } from './Instance';
import type { PlanRepository } from './PlanRepository';
import { SearchResultsBar, describeFound } from './SearchResultsBar';
import type { FoundCount } from './SearchResultsBar';
import { describeChange } from '../domain/history';
import { SyncIndicator } from './SyncIndicator';
import { useLastChange } from './useLastChange';
import { useDateFormatSetting } from './DateFormatProvider';
import {
  ALL_TAB,
  DEFAULT_PAGE_LAYOUT,
  PAGE_LAYOUT_IDS,
  parsePageTab,
  tabShowsArea,
} from './layout';
import type { PageTab } from './layout';
import { TAB_BAR_HEIGHT_VAR, TabBar } from './TabBar';
import { DayEffortLine } from './DayEffortLine';
import { useThemeSetting } from './ThemeProvider';
import { useHashPage } from './useHashPage';
import { useSyncState } from './useSyncState';
import {
  DEFAULT_MILESTONE_COLOR_ID,
  diffMilestone,
  freeMilestones,
  rememberMilestoneReminders,
} from '../domain/milestones';
import { DEFAULT_NOTES_LOOK, parseNotesLook } from '../domain/notesLook';
import { DEFAULT_TIMELINE_NOTES_LOOK, parseTimelineNotesLook } from '../domain/timelineNotes';
import { DailyNoteDialog } from '../features/notes/DailyNoteDialog';
import { MilestoneDialog } from '../features/roadmaps/MilestoneDialog';
import type { MilestoneChanges, MilestoneContent } from '../domain/milestones';
import { milestoneElementId } from '../features/roadmaps/MilestoneDiamond';
import { diffContact, filterContacts } from '../domain/contacts';
import { ContactDialog } from '../features/contacts/ContactDialog';
import type { ContactActions } from '../features/contacts/ContactDialog';
import { ContactsArea } from '../features/contacts/ContactsArea';
import { contactElementId } from '../features/contacts/OrgChart';
import type { ContactsView } from '../features/contacts/OrgChart';

/** Where each kind of search result is: its area, and its element in the area. */
const RESULT_TARGETS: Record<
  SearchResultKind,
  { area: AreaId; elementId: (id: string) => string }
> = {
  memo: { area: 'notes', elementId: memoElementId },
  task: { area: 'releases', elementId: taskBarId },
  note: { area: 'releases', elementId: noteCellId },
  project: { area: 'roadmaps', elementId: projectBarId },
  milestone: { area: 'roadmaps', elementId: milestoneElementId },
  contact: { area: 'contacts', elementId: contactElementId },
};

/** The dialog on screen, if any: only one at a time; projects have theirs in their own area. */
type OpenDialog =
  | { kind: 'task'; task: TaskItem }
  /** A person of the contacts, or a new one, reporting to `managerId` when given. */
  | { kind: 'contact'; contactId: string | null; managerId?: string }
  | { kind: 'splitTask'; task: TaskItem }
  /** A new task, with suggested date and lane. */
  | { kind: 'task'; task: null; date: string; laneId: string }
  | { kind: 'memo'; memo: Memo }
  /** The note of a day, from the row of the notes with a day or the agenda of Notes. */
  | { kind: 'dayNote'; date: string }
  /** A note on the timeline, from the agenda of Notes, where the timeline may not be. */
  | { kind: 'milestone'; milestone: Milestone }
  | { kind: 'metrics' }
  | { kind: 'import' }
  /** The settings, on a section when one is asked for. */
  | { kind: 'settings'; section?: SettingsSectionId };

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
  // The layout of the page: tabs at the bottom, one of them open, or the buttons in the header
  // that show and hide the areas, each remembered by this browser.
  const [layout, setLayout] = usePreference('layout', oneOf(PAGE_LAYOUT_IDS), DEFAULT_PAGE_LAYOUT);
  const [tab, setTab] = usePreference<PageTab>('tab', parsePageTab, ALL_TAB);
  const [areas, setAreas] = usePreference('areas', parseAreaVisibility, ALL_AREAS_VISIBLE);
  const isShown = (area: AreaId) => (layout === 'tabs' ? tabShowsArea(tab, area) : areas[area]);
  // The parts still in development: off by default, on for who works on them, in their browser.
  const [betaFeatures, setBetaFeatures] = usePreference(BETA_FEATURES_PREFERENCE, isBoolean, false);
  const shownAreas = availableAreas(betaFeatures);
  const hiddenParts = betaFeatures ? [] : BETA_PARTS;
  const [display, displayControls] = useTimelineDisplay();
  // An older name: the text size began with the calendar, and browsers keep it. The density took
  // the place of compact mode in the 0.15, with the compact look of then as the standard one.
  const [textScale, setTextScale] = usePreference('calendar-text-scale', oneOf(TEXT_SCALES), 1);
  const [density, setDensity] = usePreference('density', oneOf(DENSITY_IDS), DEFAULT_DENSITY);
  const compact = isTight(density);
  const [memosExpanded, setMemosExpanded] = usePreference('memos-expanded', isBoolean, false);
  const [memoScope, setMemoScope] = usePreference('memos-scope', oneOf(MEMO_SCOPES), 'mine');
  const [memosGrouped, setMemosGrouped] = usePreference('memos-grouped', isBoolean, false);
  const [groupOrder, setGroupOrder] = usePreference('memo-group-order', readGroupOrder, []);
  // How this browser draws the notes with a day on the timeline, and the board of Notes.
  const [timelineNotesLook, setTimelineNotesLook] = usePreference(
    'timeline-notes',
    parseTimelineNotesLook,
    DEFAULT_TIMELINE_NOTES_LOOK,
  );
  const [notesLook, setNotesLook] = usePreference('notes-look', parseNotesLook, DEFAULT_NOTES_LOOK);
  // The free notes without a color are yellow post-its, or take the colors of the theme.
  const paperColor = notesLook.paper === 'yellow' ? ('yellow' as const) : undefined;
  const [seenReminders, setSeenReminders] = usePreference(
    'memo-reminders-seen',
    readSeenReminders,
    {},
  );
  const { theme, setTheme, colorPreset, setColorPreset } = useThemeSetting();
  const { dateFormat, setDateFormat } = useDateFormatSetting();

  // One view for the whole timeline: the releases and the projects share period, zoom and days.
  const [view, dispatchView] = useCalendarView();
  // Where each project falls, from its data and the work of its team: the roadmap, the order and
  // the search use it. Before the plan loads, nothing.
  const planProjects = plan?.projects;
  const planAssignments = plan?.assignments;
  const planStakeholders = plan?.roadmap.stakeholders;
  const planClosures = plan?.roadmap.closures;
  const spans = useMemo(
    () =>
      new Map<string, ProjectSpan>(
        (planProjects ?? []).map((project) => [
          project.id,
          projectSpan(project, planAssignments ?? [], {
            stakeholders: planStakeholders ?? [],
            closures: planClosures,
          }),
        ]),
      ),
    [planProjects, planAssignments, planStakeholders, planClosures],
  );
  // The projects as the day has them: with their effective end and the state their dates give,
  // which the rows, the counts, the order and the alerts show; the windows keep the stored ones.
  const today = todayIso();
  const projectsOfDay = useMemo(
    () =>
      (planProjects ?? []).map((project) =>
        withEffectiveStatus(
          withEffectiveEnd(
            project,
            spans.get(project.id) ?? projectSpan(project, [], { stakeholders: [] }),
          ),
          today,
        ),
      ),
    [planProjects, spans, today],
  );
  // The day chosen in the row of the days: the footer says the effort of every team on it.
  const [effortDay, setEffortDay] = useState<string | null>(null);
  const planRoadmap = plan?.roadmap;
  const dayEffort = useMemo(
    () =>
      effortDay && planRoadmap
        ? teamEffortOn(
            effortDay,
            [...spans.values()].flatMap((span) => span.bars),
            planRoadmap,
          )
        : null,
    [effortDay, spans, planRoadmap],
  );
  const [seenProjectReminders, setSeenProjectReminders] = usePreference(
    'project-reminders-seen',
    readSeenReminders,
    {},
  );
  // A project or a note the alerts ask to open: the roadmap opens its window.
  const [projectToOpen, setProjectToOpen] = useState<{
    kind: 'project' | 'milestone';
    id: string;
    nonce: number;
  } | null>(null);
  const [seenMilestoneReminders, setSeenMilestoneReminders] = usePreference(
    'milestone-reminders-seen',
    readSeenReminders,
    {},
  );
  const [seenNoteReminders, setSeenNoteReminders] = usePreference(
    'project-note-reminders-seen',
    readSeenReminders,
    {},
  );
  const [page, goToPage] = useHashPage();
  const [filters, setFilters] = useState<TaskFilter>(NO_FILTER);
  const [searchMode, setSearchMode] = usePreference('search-mode', oneOf(SEARCH_MODES), 'all');
  // The contacts as a chart, or as a list on phones, where a wide chart would only scroll.
  const [contactsView, setContactsView] = usePreference<ContactsView>(
    'contacts-view',
    oneOf(['chart', 'list'] as const),
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
      ? 'list'
      : 'chart',
  );
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
  // Who made the last change to the plan, for the synchronization indicator.
  const lastEntry = useLastChange(instance.kind === 'cloud' ? instance.history : null);
  // Authors go by their full name: the user's own from the sign-in, the others' from GitHub.
  const names = useAuthorNames(
    me
      ? [
          ...allMemos.flatMap((memo) =>
            memo.author && memo.author.id !== me.id ? [memo.author.id] : [],
          ),
          ...(lastEntry && lastEntry.actor.githubId !== me.id ? [lastEntry.actor.githubId] : []),
        ]
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

  if (!plan) return null;

  if (page === 'history') {
    return (
      <HistoryPage
        history={instance.kind === 'cloud' ? instance.history : null}
        undo={
          instance.kind === 'cloud'
            ? { changes: instance.undo, githubId: instance.user.githubId }
            : null
        }
        lanes={plan.lanes}
        onBack={() => goToPage('calendar')}
      />
    );
  }

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
    focusAfterClosing(NEW_ITEM_ID);
  };

  const handleDuplicateTask = (task: TaskItem) => {
    repository.createTask(copyOfTask(task));
    showToast(`Attività "${oneLine(task.title)}" duplicata`);
  };

  const openTask = (task: TaskItem) => setDialog({ kind: 'task', task });

  // A task split in parts: the first keeps its start, the others are new tasks like it, with its
  // note when asked; the checklist stays with the first.
  const handleSplitTask = (task: TaskItem, choice: SplitChoice) => {
    const [first, ...rest] = splitDays(task.startDate, choice.sizes, choice.pause);
    if (!first) return;
    repository.updateTask(task.id, { endDate: first.end });
    const { description, deliverables: _deliverables, ...content } = copyOfTask(task);
    for (const part of rest) {
      repository.createTask({
        ...content,
        startDate: part.start,
        endDate: part.end,
        ...(description && choice.copyNote ? { description } : {}),
      });
    }
    showToast(`Attività "${oneLine(task.title)}" divisa in ${rest.length + 1} parti`);
  };

  const handleAddTaskAt = (date: string, laneId: string) => {
    setDialog({ kind: 'task', task: null, date, laneId });
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
    if (!canReplacePlan(instance)) return;
    repository.replacePlan(next);
    displayControls.showAllRows();
    showToast('Dati ripristinati dal backup');
  };

  const handleLoadSample = () => {
    if (!canReplacePlan(instance)) return;
    repository.replacePlan(buildSamplePlan(anchorDate.getFullYear(), anchorDate.getMonth()));
    showToast('Dati di esempio caricati');
  };

  // A tab opens at the top of the page: its area starts there.
  const handleSelectTab = (next: PageTab) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
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
  // The places a note can take: among the notes of its group, if any, and of its part, those in
  // evidence or the others, which the board never mixes.
  const memoPlaces = (memo: Memo) => {
    const strip = scopedMemos.some((item) => item.id === memo.id) ? scopedMemos : plan.memos;
    const group = grouped
      ? groupMemos(strip, memoGroupOrder).find((item) => item.key === (memo.author?.id ?? ''))
      : undefined;
    const part = (group?.memos ?? strip).filter(
      (item) => Boolean(item.pinned) === Boolean(memo.pinned),
    );
    return {
      strip: part,
      inGroup: group !== undefined,
      follower: (index: number) => followerInGroup(strip, part, memo.id, index),
    };
  };

  // Projects
  const handleCreateProject = (content: ProjectContent): string => {
    const id = repository.createProject({
      ...content,
      position: nextProjectPosition(plan.projects),
    });
    showToast(`Progetto «${oneLine(content.title)}» aggiunto`);
    return id;
  };

  // A project put before another: one position changes, or every project is numbered again when
  // the rows follow a criterion, which then becomes the order of the members.
  const handleReorderProject = (projectId: string, beforeId: string | null) => {
    let moves: Map<string, number>;
    if (display.sort === 'custom') {
      moves = projectMoves(plan.projects, projectId, beforeId);
    } else {
      const moved = orderedProjects.find((project) => project.id === projectId);
      if (!moved) return;
      const others = orderedProjects.filter((project) => project.id !== projectId);
      const to = beforeId === null ? others.length : others.findIndex((p) => p.id === beforeId);
      if (to < 0) return;
      moves = renumberProjects([...others.slice(0, to), moved, ...others.slice(to)]);
      displayControls.setSort('custom');
    }
    for (const [id, position] of moves) repository.updateProject(id, { position });
  };

  // The window of a project plans the work of its team as a whole: one toast for the project is
  // enough.
  const handleSaveTeam = (projectId: string, teamPlan: TeamPlan) => {
    for (const content of teamPlan.create) repository.createAssignment({ ...content, projectId });
    for (const item of teamPlan.update) repository.updateAssignment(item.id, item.changes);
    for (const assignmentId of teamPlan.remove) repository.deleteAssignment(assignmentId);
  };

  // The whole project moves: start, contingency and the bars of its team, each on a working day;
  // the deadline stays where it is.
  const handleMoveProject = (projectId: string, days: number) => {
    const project = plan.projects.find((item) => item.id === projectId);
    if (!project || days === 0) return;
    const changes: ProjectChanges = { startDate: addDaysIso(project.startDate, days) };
    const closures = plan.roadmap.closures ?? [];
    if (project.contingency) {
      changes.contingency = moveContingency(project.contingency, days, closures);
    }
    repository.updateProject(projectId, changes);
    for (const assignment of assignmentsOfProject(plan.assignments, projectId)) {
      const { startDate } = moveAssignment(assignment, days, closures);
      if (startDate !== assignment.startDate) {
        repository.updateAssignment(assignment.id, { startDate });
      }
    }
  };

  const handleSaveProject = (project: Project, content: ProjectContent) => {
    const changes = diffProject(project, content);
    if (Object.keys(changes).length > 0) repository.updateProject(project.id, changes);
    showToast(`Progetto «${oneLine(content.title)}» salvato`);
  };

  const handleDeleteProject = (project: Project) => {
    repository.deleteProject(project.id);
    showToast('Progetto eliminato');
    focusAfterClosing(NEW_ITEM_ID);
  };

  const handleDuplicateProject = (project: Project) => {
    const saved = plan.projects.find((item) => item.id === project.id);
    if (!saved) return;
    const { id: _id, ...content } = saved;
    const copy = structuredClone(content);
    if (copy.contingency?.segments) {
      copy.contingency.segments = copy.contingency.segments.map((segment) => ({
        ...segment,
        id: createId(),
      }));
    }
    const projectId = repository.createProject({
      ...copy,
      position: nextProjectPosition(plan.projects),
    });
    for (const assignment of assignmentsOfProject(plan.assignments, saved.id)) {
      const { id: _assignmentId, ...work } = assignment;
      repository.createAssignment({ ...work, projectId });
    }
    for (const note of notesOfProject(plan.projectNotes, saved.id)) {
      const { id: _noteId, createdAt: _createdAt, author: _author, ...content } = note;
      repository.createProjectNote({ ...content, projectId });
    }
    for (const milestone of plan.milestones.filter((item) => item.projectId === saved.id)) {
      const { id: _milestoneId, ...content } = milestone;
      repository.createMilestone({ ...content, projectId });
    }
    showToast(`Progetto «${oneLine(saved.title)}» duplicato`);
  };

  // A block of contingency more, after the one copied: the project keeps its bars where they are.
  const handleDuplicateContingency = (projectId: string, segmentId: string) => {
    const project = plan.projects.find((item) => item.id === projectId);
    if (!project) return;
    const contingency = duplicateContingency(
      project,
      segmentId,
      createId(),
      plan.roadmap.closures ?? [],
    );
    if (!contingency) {
      const full = (project.contingency?.segments?.length ?? 0) >= CONTINGENCY_SEGMENTS_MAX;
      showToast(
        full
          ? `Al massimo ${CONTINGENCY_SEGMENTS_MAX + 1} blocchi di contingency per progetto`
          : 'Il nuovo blocco non entra nel calendario',
      );
      return;
    }
    repository.updateProject(projectId, { contingency, arrangement: 'manual' });
    showToast('Blocco di contingency duplicato');
  };

  // A block of contingency split in parts, which take its place among the blocks of the project.
  const handleSplitContingency = (projectId: string, segmentId: string, choice: SplitChoice) => {
    const project = plan.projects.find((item) => item.id === projectId);
    const block = project && contingencySegments(project).find((item) => item.id === segmentId);
    if (!project || !block) return;
    const parts = splitWork(block, choice.sizes, choice.pause, [], plan.roadmap.closures ?? []);
    const contingency =
      parts &&
      splitContingency(
        project,
        segmentId,
        parts,
        parts.slice(1).map(() => createId()),
        choice.copyNote,
      );
    if (!contingency) {
      showToast('Le parti non entrano nel calendario o nei blocchi della contingency');
      return;
    }
    repository.updateProject(projectId, { contingency, arrangement: 'manual' });
    showToast(`Contingency divisa in ${parts.length} parti`);
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
    onDuplicate: (assignmentId: string) => {
      const assignment = plan.assignments.find((item) => item.id === assignmentId);
      if (!assignment) return;
      const person = plan.roadmap.stakeholders.find((item) => item.id === assignment.stakeholderId);
      const content = copyAfterAssignment(
        assignment,
        person?.absences ?? [],
        plan.roadmap.closures ?? [],
      );
      if (!content) {
        showToast('Il nuovo segmento non entra nel calendario');
        return;
      }
      repository.createAssignment(content);
      repository.updateProject(assignment.projectId, { arrangement: 'manual' });
      showToast('Segmento di lavoro duplicato');
    },
    // The first part stays the assignment, with its start; the others are new assignments of the
    // same person, with the note when asked. The bars stay where they are put.
    onSplit: (assignmentId: string, choice: SplitChoice) => {
      const assignment = plan.assignments.find((item) => item.id === assignmentId);
      if (!assignment) return;
      const person = plan.roadmap.stakeholders.find((item) => item.id === assignment.stakeholderId);
      const parts = splitWork(
        assignment,
        choice.sizes,
        choice.pause,
        person?.absences ?? [],
        plan.roadmap.closures ?? [],
      );
      const [first, ...rest] = parts ?? [];
      if (!first) {
        showToast('Le parti non entrano nel calendario');
        return;
      }
      repository.updateAssignment(assignment.id, { manDays: first.manDays });
      for (const part of rest) {
        const { id: _id, note, ...content } = assignment;
        repository.createAssignment({
          ...content,
          startDate: part.startDate,
          manDays: part.manDays,
          ...(note && choice.copyNote ? { note } : {}),
        });
      }
      repository.updateProject(assignment.projectId, { arrangement: 'manual' });
      showToast(`Lavoro diviso in ${rest.length + 1} parti`);
    },
    onCreate: (content: AssignmentContent) => {
      repository.createAssignment(content);
      showToast('Persona aggiunta al progetto');
    },
    onUpdate: (assignmentId: string, changes: AssignmentChanges) => {
      repository.updateAssignment(assignmentId, changes);
      // A start moved by hand, by a drag, the keys or the window: the bars of the project stay
      // where they are put, until its window arranges them again.
      const assignment = plan.assignments.find((item) => item.id === assignmentId);
      if (!assignment || !changes.startDate || changes.startDate === assignment.startDate) return;
      const project = plan.projects.find((item) => item.id === assignment.projectId);
      if (project && arrangementOf(project) !== 'manual') {
        repository.updateProject(project.id, { arrangement: 'manual' });
      }
    },
    onDelete: (assignmentId: string) => {
      repository.deleteAssignment(assignmentId);
      showToast('Persona tolta dal progetto');
    },
  };
  // The rows of the tasks of Next Releases, for every member.
  const laneActions = {
    onCreate: (name: string) => {
      repository.createLane(name, nextLaneColor(plan.lanes));
      showToast(`Corsia «${name}» aggiunta`);
    },
    onRename: (laneId: string, name: string) => repository.renameLane(laneId, name),
    onRecolor: (laneId: string, colorId: TaskColorId | undefined) =>
      repository.recolorLane(laneId, colorId ?? null),
    onRecolorNotes: (colorId: TaskColorId) =>
      repository.updateRoadmapSettings({ dayNotesColorId: colorId }),
    onMove: (laneId: string, beforeId: string | null) => repository.moveLane(laneId, beforeId),
    onDelete: (laneId: string) => {
      repository.deleteLane(laneId);
      showToast('Corsia eliminata');
    },
  };

  const milestoneActions = {
    onCreate: (content: MilestoneContent) => {
      const id = repository.createMilestone(content);
      showToast(`Nota «${oneLine(content.title)}» aggiunta alla timeline`);
      return id;
    },
    onUpdate: (milestoneId: string, changes: MilestoneChanges) => {
      if (Object.keys(changes).length > 0) repository.updateMilestone(milestoneId, changes);
    },
    onDelete: (milestoneId: string) => {
      repository.deleteMilestone(milestoneId);
      showToast('Nota sulla timeline eliminata');
    },
  };
  const stakeholderActions = {
    onSave: (stakeholder: Stakeholder) => {
      repository.saveStakeholder(stakeholder);
      showToast(`«${oneLine(stakeholder.name)}» salvata`);
    },
  };
  // The labels of the projects: one list for every member, a field of the roadmap of its own.
  const labelsField = labelsFieldOf(plan.roadmap);
  const labelActions = {
    onCreate: (name: string): string | null => {
      const added = withLabelAdded(plan.roadmap, name, createId());
      if (!added) return null;
      repository.saveProjectField(added.field);
      showToast(`Etichetta «${added.label.label}» aggiunta`);
      return added.label.id;
    },
    onChange: (labelId: string, changes: { label?: string; colorId?: TaskColorId }) => {
      if (labelsField) repository.saveProjectField(withLabelChanged(labelsField, labelId, changes));
    },
    onMove: (labelId: string, beforeId: string | null) => {
      if (labelsField) repository.saveProjectField(withLabelMoved(labelsField, labelId, beforeId));
    },
    onDelete: (labelId: string) => {
      if (!labelsField) return;
      // A list needs a value: the field goes with the last label.
      const rest = withLabelRemoved(labelsField, labelId);
      if (rest) repository.saveProjectField(rest);
      else repository.deleteProjectField(labelsField.id);
      showToast('Etichetta eliminata');
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
    onSaveSettings: (changes: RoadmapSettingsChanges) => repository.updateRoadmapSettings(changes),
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
  // In the order of the roadmap, so that the results of the search follow the page.
  const orderedProjects = sortProjectsBy(projectsOfDay, display.sort, {
    today,
    endOf: (project) => spans.get(project.id)?.end ?? project.startDate,
    field: projectColorField(plan.roadmap),
  });
  // The labels chosen in the bar of the timeline, then the search.
  const labeledProjects = filterByLabels(orderedProjects, plan.roadmap, display.labelsFilter);
  const shownProjects = searching
    ? filterProjects(labeledProjects, filters.search, searchMode, projectTexts)
    : labeledProjects;
  const shownMilestones = searching
    ? filterMilestones(plan.milestones, filters.search, searchMode, (milestone) => [
        plan.projects.find((project) => project.id === milestone.projectId)?.title,
      ])
    : plan.milestones;

  // The contacts are in beta: without the beta features, the search does not look there.
  const foundContacts =
    betaFeatures && searching
      ? filterContacts(plan.contacts, plan.contactNotes, filters.search, searchMode)
      : null;
  const contactActions: ContactActions = {
    onSave: (contactId, content) => {
      if (contactId === null) {
        const id = repository.createContact(content);
        showToast(`Persona «${oneLine(content.name)}» aggiunta ai contatti`);
        return id;
      }
      const before = plan.contacts.find((contact) => contact.id === contactId);
      if (before) {
        const changes = diffContact(before, content);
        if (Object.keys(changes).length > 0) repository.updateContact(contactId, changes);
      }
      showToast(`Persona «${oneLine(content.name)}» salvata`);
      return contactId;
    },
    onDelete: (contactId) => {
      repository.deleteContact(contactId);
      showToast('Persona eliminata dai contatti');
    },
    onAddNote: (contactId, text) => {
      repository.createContactNote({ contactId, text });
      showToast('Nota aggiunta');
    },
    onEditNote: (noteId, text) => repository.updateContactNote(noteId, { text }),
    onDeleteNote: (noteId) => {
      repository.deleteContactNote(noteId);
      showToast('Nota eliminata');
    },
  };

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
        projects: shownProjects,
        milestones: shownMilestones,
        contacts: foundContacts ?? [],
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
    { found: shownProjects.length, total: plan.projects.length, one: 'progetto', many: 'progetti' },
    {
      found: shownMilestones.length,
      total: plan.milestones.length,
      one: 'nota sulla timeline',
      many: 'note sulla timeline',
    },
    ...(foundContacts
      ? [
          {
            found: foundContacts.length,
            total: plan.contacts.length,
            one: 'contatto',
            many: 'contatti',
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
    if (layout === 'tabs') {
      if (!tabShowsArea(tab, area)) setTab(area);
    } else if (!areas[area]) {
      setAreas((current) => ({ ...current, [area]: true }));
    }
    // A result in a folded part of the timeline opens the part: the notes of the days fold with
    // the releases, the notes of a project with the roadmap.
    const part =
      result.kind === 'task' || result.kind === 'note'
        ? 'releases'
        : result.kind === 'project' ||
            (result.kind === 'milestone' &&
              plan.milestones.some((item) => item.id === result.id && item.projectId))
          ? 'roadmaps'
          : null;
    if (part && display.collapsed.includes(part)) displayControls.toggleCollapsed(part);
    let wait = 0;
    if (result.kind === 'project') {
      // The roadmap goes to the start of the project, with the past when the project is past.
      const project = plan.projects.find((item) => item.id === result.id);
      if (project) {
        if (display.hidePastDays && (spans.get(project.id)?.end ?? project.startDate) < today) {
          displayControls.togglePastDays();
        }
        dispatchView({ type: 'goTo', date: project.startDate });
        if (!prefersReducedMotion()) wait = SCROLL_DURATION_MS + 50;
      }
    } else if (result.kind === 'milestone' && result.date) {
      // The roadmap goes to the day of the note, with the past when the day is past.
      if (display.hidePastDays && result.date < today) displayControls.togglePastDays();
      dispatchView({ type: 'goTo', date: result.date });
      if (!prefersReducedMotion()) wait = SCROLL_DURATION_MS + 50;
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

  const effortLine = (wrap: boolean) =>
    effortDay &&
    dayEffort && (
      <DayEffortLine
        day={effortDay}
        efforts={dayEffort}
        onClear={() => setEffortDay(null)}
        wrap={wrap}
        className="max-w-full"
      />
    );

  return (
    <SearchHighlightContext value={highlight}>
      <div className="flex min-h-screen flex-col bg-canvas font-sans text-fg selection:bg-accent selection:text-on-accent">
        <Header
          textScale={textScale}
          onTextScaleChange={setTextScale}
          density={density}
          onDensityChange={setDensity}
          areaToggles={
            layout === 'classic'
              ? { areas: shownAreas, visibility: areas, onToggle: handleToggleArea }
              : undefined
          }
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
              <SyncIndicator
                repository={repository}
                hiddenParts={hiddenParts}
                lastChange={
                  lastEntry && {
                    name: nameOf({ id: lastEntry.actor.githubId, login: lastEntry.actor.login }),
                    mine: lastEntry.actor.githubId === me?.id,
                    what: describeChange(lastEntry, dateFormat),
                    at: lastEntry.at,
                  }
                }
                onOpenHistory={() => goToPage('history')}
              />
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

        <main
          className="w-full flex-1 space-y-6 px-4 py-5 sm:px-6"
          // The bar of the tabs is fixed at the bottom: the page ends above it.
          style={
            layout === 'tabs' ? { paddingBottom: `var(${TAB_BAR_HEIGHT_VAR}, 0px)` } : undefined
          }
        >
          {isPlanEmpty(plan) && (
            <EmptyPlanNotice
              warning={loadWarning}
              {...(canReplacePlan(instance) && {
                onLoadSample: handleLoadSample,
                onRestoreBackup: () => setDialog({ kind: 'settings', section: 'backup' }),
              })}
            />
          )}

          {isShown('notes') && (
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
              alwaysExpanded={layout === 'tabs' && tab === 'notes'}
              look={notesLook}
              dated={{
                sources: {
                  dailyNotes: plan.dailyNotes,
                  memos: scopedMemos,
                  milestones: sync.missing.includes('projects')
                    ? []
                    : freeMilestones(plan.milestones),
                },
                look: timelineNotesLook,
                actions: {
                  onOpenDayNote: (date) => setDialog({ kind: 'dayNote', date }),
                  onOpenMemo: (memo) => setDialog({ kind: 'memo', memo }),
                  onOpenMilestone: (milestone) => setDialog({ kind: 'milestone', milestone }),
                },
              }}
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

          {(isShown('releases') || isShown('roadmaps') || isShown('people')) && (
            <TimelineArea
              parts={{
                releases: isShown('releases'),
                roadmaps: isShown('roadmaps'),
                people: isShown('people'),
              }}
              plan={plan}
              view={view}
              onViewAction={dispatchView}
              display={display}
              controls={displayControls}
              today={today}
              textScale={textScale}
              density={density}
              selectedDay={effortDay}
              onSelectDay={setEffortDay}
              searching={searching}
              releases={{
                tasks: filteredTasks,
                noteMatches,
                status: filters.status,
                onStatusChange: (status) => setFilters({ ...filters, status }),
                onOpenTask: openTask,
                onChangeTask: handleChangeTask,
                onDuplicateTask: handleDuplicateTask,
                onSplitTask: (task) => setDialog({ kind: 'splitTask', task }),
                onDeleteTask: handleDeleteTask,
                onAddTaskAt: handleAddTaskAt,
                onMoveLane: laneActions.onMove,
                onSaveNote: (date, text) => repository.setNote(date, text),
                onMoveNote: (from, to, text) => repository.moveNote(from, to, text),
                onEditMetrics: () => setDialog({ kind: 'metrics' }),
                onImportMetrics: () => setDialog({ kind: 'import' }),
              }}
              roadmap={{
                projects: projectsOfDay,
                shown: shownProjects,
                spans,
                milestones: shownMilestones,
                milestoneActions,
                openRequest: projectToOpen,
                unavailable: sync.missing.includes('projects'),
                detailsUnavailable: sync.missing.includes('roadmap'),
                me,
                nameOf,
                projectActions: {
                  onDuplicate: handleDuplicateProject,
                  onDuplicateContingency: handleDuplicateContingency,
                  onSplitContingency: handleSplitContingency,
                  onCreate: handleCreateProject,
                  onUpdate: (projectId, changes) => repository.updateProject(projectId, changes),
                  onMove: handleMoveProject,
                  onSaveTeam: handleSaveTeam,
                  onReorder: handleReorderProject,
                  onSave: handleSaveProject,
                  onDelete: handleDeleteProject,
                  onCreateLabel: labelActions.onCreate,
                },
                noteActions,
                assignmentActions,
                stakeholderActions,
              }}
              timelineNotes={{
                look: timelineNotesLook,
                memos: shownMemos,
                paperColor,
                onOpenDayNote: (date) => setDialog({ kind: 'dayNote', date }),
                onOpenMemo: (memo) => setDialog({ kind: 'memo', memo }),
              }}
            />
          )}

          {betaFeatures && isShown('contacts') && (
            <ContactsArea
              id={areaElementId('contacts')}
              contacts={plan.contacts}
              notes={plan.contactNotes}
              found={foundContacts}
              unavailable={sync.missing.includes('contacts')}
              view={contactsView}
              onViewChange={setContactsView}
              onOpen={(contact) => setDialog({ kind: 'contact', contactId: contact.id })}
              onAdd={() => setDialog({ kind: 'contact', contactId: null })}
            />
          )}

          {layout === 'classic' && shownAreas.every(({ id }) => !areas[id]) && (
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

        {/*
          With the tabs, the effort of the day chosen, version and commit are in their bar from
          640 px, and here on phones.
        */}
        <footer
          className={`flex w-full flex-col items-center gap-1 px-4 pb-5 sm:px-6 ${layout === 'tabs' ? 'sm:hidden' : ''}`}
        >
          {effortLine(true)}
          <VersionStamp />
        </footer>
        {layout === 'tabs' && (
          <TabBar
            areas={shownAreas}
            tab={tab}
            onSelect={handleSelectTab}
            status={effortLine(false)}
          />
        )}

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
            onSplit={(task) => setDialog({ kind: 'splitTask', task })}
          />
        )}

        {/* A person deleted meanwhile, by someone else, closes their window. */}
        {dialog?.kind === 'contact' &&
          betaFeatures &&
          (dialog.contactId === null ||
            plan.contacts.some((contact) => contact.id === dialog.contactId)) && (
            <ContactDialog
              contact={plan.contacts.find((contact) => contact.id === dialog.contactId) ?? null}
              initialManagerId={dialog.managerId}
              contacts={plan.contacts}
              notes={plan.contactNotes}
              nameOf={nameOf}
              actions={contactActions}
              onClose={() => setDialog(null)}
            />
          )}

        {dialog?.kind === 'splitTask' && (
          <SplitDialog
            target={taskSplitTarget(
              dialog.task,
              taskColorOf(
                dialog.task,
                plan.lanes.find((lane) => lane.id === dialog.task.laneId),
              ),
              (iso) => formatDate(iso, dateFormat),
            )}
            onSplit={(choice) => handleSplitTask(dialog.task, choice)}
            onClose={() => setDialog(null)}
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

        {dialog?.kind === 'dayNote' && (
          <DailyNoteDialog
            date={dialog.date}
            note={plan.dailyNotes[dialog.date] ?? ''}
            isDayFree={(date) => plan.dailyNotes[date] === undefined}
            onSave={(text) => repository.setNote(dialog.date, text)}
            onMove={(to, text) => repository.moveNote(dialog.date, to, text)}
            onClose={() => setDialog(null)}
          />
        )}

        {dialog?.kind === 'milestone' && (
          <MilestoneDialog
            milestone={dialog.milestone}
            date={dialog.milestone.date}
            projects={plan.projects}
            defaultColorId={DEFAULT_MILESTONE_COLOR_ID}
            onSubmit={(content) =>
              milestoneActions.onUpdate(
                dialog.milestone.id,
                diffMilestone(dialog.milestone, content),
              )
            }
            onDelete={() => milestoneActions.onDelete(dialog.milestone.id)}
            onClose={() => setDialog(null)}
          />
        )}

        <MemoReminders
          memos={scopedMemos}
          seen={seenReminders}
          onSeen={rememberShown}
          onOpen={(memo) => setDialog({ kind: 'memo', memo })}
        />

        <ProjectReminders
          projects={projectsOfDay}
          milestones={plan.milestones}
          seenMilestones={seenMilestoneReminders}
          onSeenMilestones={(shown) =>
            setSeenMilestoneReminders((seen) =>
              rememberMilestoneReminders(seen, shown, plan.milestones),
            )
          }
          onOpenMilestone={(milestoneId) => {
            if (!tabShowsArea(tab, 'roadmaps')) setTab('roadmaps');
            setAreas((current) => ({ ...current, roadmaps: true }));
            setProjectToOpen({ kind: 'milestone', id: milestoneId, nonce: Date.now() });
          }}
          endOf={(project) => spans.get(project.id)?.end ?? project.startDate}
          seen={seenProjectReminders}
          onSeen={(shown) =>
            setSeenProjectReminders((seen) => rememberProjectReminders(seen, shown, plan.projects))
          }
          onOpen={(projectId) => {
            if (!tabShowsArea(tab, 'roadmaps')) setTab('roadmaps');
            setAreas((current) => ({ ...current, roadmaps: true }));
            setProjectToOpen({ kind: 'project', id: projectId, nonce: Date.now() });
          }}
        />

        {!sync.missing.includes('roadmap') && (
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
            initialSection={dialog.section}
            betaFeatures={betaFeatures}
            onToggleBetaFeatures={setBetaFeatures}
            roadmapUnavailable={sync.missing.includes('roadmap')}
            roadmapActions={configActions}
            laneActions={laneActions}
            labelActions={labelActions}
            theme={theme}
            onChangeTheme={setTheme}
            colorPreset={colorPreset}
            onChangeColorPreset={setColorPreset}
            dateFormat={dateFormat}
            onChangeDateFormat={setDateFormat}
            layout={layout}
            onChangeLayout={setLayout}
            textScale={textScale}
            onTextScaleChange={setTextScale}
            density={density}
            onDensityChange={setDensity}
            timelineNotesLook={timelineNotesLook}
            onTimelineNotesLookChange={setTimelineNotesLook}
            notesLook={notesLook}
            onNotesLookChange={setNotesLook}
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
