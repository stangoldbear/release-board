import { isBoolean, oneOf, usePreference } from '../../infra/preferences';
import { ROADMAP_SORTS } from '../../domain/projectOrder';
import type { RoadmapSort } from '../../domain/projectOrder';
import { isRoadmapId } from '../../domain/roadmapConfig';
import { BAR_RENDERING_IDS, DEFAULT_BAR_RENDERING } from './barRendering';
import type { BarRendering } from './barRendering';
import { DETAIL_LEVELS } from './projectUi';
import type { DetailLevel } from './projectUi';

/** What the roadmap shows, as this browser remembers it. */
export interface RoadmapDisplay {
  /** Weekends in red, as the holidays. */
  highlightWeekends: boolean;
  /** The roadmap starts today; off by default, since it shows the past projects too. */
  hidePastDays: boolean;
  /** How much each project shows under its title. */
  level: DetailLevel;
  /** The projects with a level of their own, by id: exceptions to `level`. */
  projectLevels: Readonly<Record<string, DetailLevel>>;
  /** How the work of the team is drawn in the bar of a project. */
  barRendering: BarRendering;
  /** Titles of projects and people on one line, out of their bars when longer, rather than cut. */
  oneLineTitles: boolean;
  /** The id of the field the projects are grouped by; null for no groups. */
  groupBy: string | null;
  /** The order of the rows: the members' own, or a criterion over it. */
  sort: RoadmapSort;
}

export interface RoadmapDisplayControls {
  toggleWeekends: () => void;
  togglePastDays: () => void;
  toggleOneLineTitles: () => void;
  /** The level of every project: the exceptions of single projects are cleared. */
  setLevel: (level: DetailLevel) => void;
  /** The level of one project, or null to follow the roadmap again. */
  setProjectLevel: (projectId: string, level: DetailLevel | null) => void;
  setBarRendering: (rendering: BarRendering) => void;
  setGroupBy: (fieldId: string | null) => void;
  setSort: (sort: RoadmapSort) => void;
}

const LEVEL_IDS = DETAIL_LEVELS.map((level) => level.id);
const NO_LEVELS: Readonly<Record<string, DetailLevel>> = {};

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

/** The display choices of the roadmap, and the ways to change them. */
export function useRoadmapDisplay(): [RoadmapDisplay, RoadmapDisplayControls] {
  const [highlightWeekends, setHighlightWeekends] = usePreference(
    'roadmap-highlight-weekends',
    isBoolean,
    true,
  );
  const [hidePastDays, setHidePastDays] = usePreference(
    'roadmap-past-days-hidden',
    isBoolean,
    false,
  );
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
  const [oneLineTitles, setOneLineTitles] = usePreference(
    'roadmap-titles-one-line',
    isBoolean,
    false,
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
  return [
    {
      highlightWeekends,
      hidePastDays,
      level,
      projectLevels,
      barRendering,
      oneLineTitles,
      groupBy,
      sort,
    },
    {
      toggleWeekends: () => setHighlightWeekends((value) => !value),
      togglePastDays: () => setHidePastDays((value) => !value),
      toggleOneLineTitles: () => setOneLineTitles((value) => !value),
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
    },
  ];
}
