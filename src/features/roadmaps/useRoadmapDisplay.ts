import { isRoadmapId } from '../../domain/roadmapConfig';
import { isBoolean, oneOf, usePreference } from '../../infra/preferences';
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
  /** Titles of projects and people on one line, out of their bars when longer, rather than cut. */
  oneLineTitles: boolean;
  /** The id of the field the projects are grouped by; null for no groups. */
  groupBy: string | null;
}

export interface RoadmapDisplayControls {
  toggleWeekends: () => void;
  togglePastDays: () => void;
  toggleOneLineTitles: () => void;
  setLevel: (level: DetailLevel) => void;
  setGroupBy: (fieldId: string | null) => void;
}

const LEVEL_IDS = DETAIL_LEVELS.map((level) => level.id);

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
  const [oneLineTitles, setOneLineTitles] = usePreference(
    'roadmap-titles-one-line',
    isBoolean,
    false,
  );
  // A field that no longer groups, or no longer exists, means no groups: the area checks it.
  const [groupBy, setGroupBy] = usePreference<string | null>(
    'roadmap-group-by',
    (value) => (isRoadmapId(value) ? value : null),
    null,
  );
  return [
    { highlightWeekends, hidePastDays, level, oneLineTitles, groupBy },
    {
      toggleWeekends: () => setHighlightWeekends((value) => !value),
      togglePastDays: () => setHidePastDays((value) => !value),
      toggleOneLineTitles: () => setOneLineTitles((value) => !value),
      setLevel,
      setGroupBy,
    },
  ];
}
