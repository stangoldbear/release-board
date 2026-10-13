import { ROADMAP_SORTS } from '../../domain/projectOrder';
import type { RoadmapSort } from '../../domain/projectOrder';
import { isRoadmapId } from '../../domain/roadmapConfig';
import type { RowVisibility } from '../../domain/types';
import { isBoolean, oneOf, usePreference } from '../../infra/preferences';
import { ALL_ROWS_VISIBLE, parseRowVisibility, toggleLane } from '../calendar/rowVisibility';
import { BAR_RENDERING_IDS, DEFAULT_BAR_RENDERING } from '../roadmaps/barRendering';
import type { BarRendering } from '../roadmaps/barRendering';
import { DETAIL_LEVELS } from '../roadmaps/projectUi';
import type { DetailLevel } from '../roadmaps/projectUi';

/** The two parts of the timeline: the lanes of the releases and the projects of the roadmap. */
export type TimelinePart = 'releases' | 'roadmaps';

export const TIMELINE_PARTS: readonly TimelinePart[] = ['releases', 'roadmaps'];

/** What the timeline shows, as this browser remembers it. */
export interface TimelineDisplay {
  /** Weekends in red, as the holidays. */
  highlightWeekends: boolean;
  /** The row of the daily revenue. */
  showMetrics: boolean;
  /** The timeline starts today. */
  hidePastDays: boolean;
  /** The lanes hidden and the row of the notes of the days. */
  visibility: RowVisibility;
  /** The row of the notes on the timeline that belong to no project. */
  showFreeNotes: boolean;
  /** How much each row shows: one line, the main information, or the people too. */
  level: DetailLevel;
  /** The projects with a level of their own, by id: exceptions to `level`. */
  projectLevels: Readonly<Record<string, DetailLevel>>;
  /** How the work of the team is drawn in the bar of a project. */
  barRendering: BarRendering;
  /** The id of the field the projects are grouped by; null for no groups. */
  groupBy: string | null;
  /** The order of the rows of the projects: the members' own, or a criterion over it. */
  sort: RoadmapSort;
  /** The parts folded under their header. */
  collapsed: readonly TimelinePart[];
  /** Width of the column of the names, in pixels at the normal size of the text. */
  labelWidth: number;
}

export interface TimelineDisplayControls {
  toggleWeekends: () => void;
  toggleMetrics: () => void;
  togglePastDays: () => void;
  toggleLane: (laneId: string) => void;
  toggleNotes: () => void;
  toggleFreeNotes: () => void;
  /** Every row, the revenue included. */
  showAllRows: () => void;
  /** The level of every row: the exceptions of single projects are cleared. */
  setLevel: (level: DetailLevel) => void;
  /** The level of one project, or null to follow the timeline again. */
  setProjectLevel: (projectId: string, level: DetailLevel | null) => void;
  setBarRendering: (rendering: BarRendering) => void;
  setGroupBy: (fieldId: string | null) => void;
  setSort: (sort: RoadmapSort) => void;
  toggleCollapsed: (part: TimelinePart) => void;
  /** The width of the column of the names, kept within its limits. */
  setLabelWidth: (width: number) => void;
}

/** Titles on one line, out of their bars when longer: the level that shows the titles alone. */
export function oneLineTitlesOf(display: Pick<TimelineDisplay, 'level'>): boolean {
  return display.level === 'titles';
}

/** The column of the names, in pixels at the normal size of the text: its limits and its default. */
export const LABEL_WIDTH = { min: 160, max: 480, default: 260 } as const;

function parseLabelWidth(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(LABEL_WIDTH.max, Math.max(LABEL_WIDTH.min, Math.round(value)));
}

const LEVEL_IDS = DETAIL_LEVELS.map((level) => level.id);
const NO_LEVELS: Readonly<Record<string, DetailLevel>> = {};
const NONE_COLLAPSED: readonly TimelinePart[] = [];

/** The levels of single projects as stored: the entries that still make sense. */
function parseProjectLevels(value: unknown): Record<string, DetailLevel> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const levels: Record<string, DetailLevel> = {};
  for (const [id, level] of Object.entries(value)) {
    if (typeof id === 'string' && id.length <= 100 && (LEVEL_IDS as unknown[]).includes(level)) {
      levels[id] = level as DetailLevel;
    }
  }
  return levels;
}

function parseCollapsed(value: unknown): TimelinePart[] | null {
  if (!Array.isArray(value)) return null;
  return TIMELINE_PARTS.filter((part) => value.includes(part));
}

/**
 * The display choices of the timeline, and the ways to change them. The keys of the roadmap keep
 * their names, so that a browser keeps the choices it made before the two timelines were one.
 */
export function useTimelineDisplay(): [TimelineDisplay, TimelineDisplayControls] {
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
  // A new key: the past is hidden by default since 0.6, also where the old choice was saved.
  const [hidePastDays, setHidePastDays] = usePreference('past-days-hidden', isBoolean, true);
  const [showFreeNotes, setShowFreeNotes] = usePreference('show-timeline-notes', isBoolean, true);
  const [level, setLevel] = usePreference<DetailLevel>(
    'roadmap-detail-level',
    oneOf(LEVEL_IDS),
    'main',
  );
  const [projectLevels, setProjectLevels] = usePreference<Readonly<Record<string, DetailLevel>>>(
    'roadmap-project-levels',
    parseProjectLevels,
    NO_LEVELS,
  );
  const [barRendering, setBarRendering] = usePreference<BarRendering>(
    'roadmap-bars',
    oneOf(BAR_RENDERING_IDS),
    DEFAULT_BAR_RENDERING,
  );
  const [sort, setSort] = usePreference<RoadmapSort>(
    'roadmap-sort',
    oneOf(ROADMAP_SORTS),
    'custom',
  );
  // A field that no longer groups, or no longer exists, means no groups: the area checks it.
  const [groupBy, setGroupBy] = usePreference<string | null>(
    'roadmap-group-by',
    (value) => (isRoadmapId(value) ? value : null),
    null,
  );
  const [collapsed, setCollapsed] = usePreference<readonly TimelinePart[]>(
    'timeline-collapsed',
    parseCollapsed,
    NONE_COLLAPSED,
  );
  const [labelWidth, setLabelWidth] = usePreference(
    'label-width',
    parseLabelWidth,
    LABEL_WIDTH.default,
  );

  return [
    {
      highlightWeekends,
      showMetrics,
      hidePastDays,
      visibility,
      showFreeNotes,
      level,
      projectLevels,
      barRendering,
      groupBy,
      sort,
      collapsed,
      labelWidth,
    },
    {
      toggleWeekends: () => setHighlightWeekends((value) => !value),
      toggleMetrics: () => setShowMetrics((value) => !value),
      togglePastDays: () => setHidePastDays((value) => !value),
      toggleLane: (laneId) => setVisibility((current) => toggleLane(current, laneId)),
      toggleNotes: () =>
        setVisibility((current) => ({ ...current, showNotes: !current.showNotes })),
      toggleFreeNotes: () => setShowFreeNotes((value) => !value),
      showAllRows: () => {
        setVisibility(ALL_ROWS_VISIBLE);
        setShowMetrics(true);
        setShowFreeNotes(true);
      },
      setLevel: (next) => {
        setLevel(next);
        setProjectLevels(NO_LEVELS);
      },
      setProjectLevel: (projectId, next) =>
        setProjectLevels((current) => {
          const { [projectId]: _previous, ...rest } = current;
          return next === null ? rest : { ...rest, [projectId]: next };
        }),
      setBarRendering,
      setGroupBy,
      setSort,
      toggleCollapsed: (part) =>
        setCollapsed((current) =>
          current.includes(part) ? current.filter((item) => item !== part) : [...current, part],
        ),
      setLabelWidth: (width) => setLabelWidth(parseLabelWidth(width) ?? LABEL_WIDTH.default),
    },
  ];
}
