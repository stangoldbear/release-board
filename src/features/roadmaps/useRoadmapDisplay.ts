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
}

export interface RoadmapDisplayControls {
  toggleWeekends: () => void;
  togglePastDays: () => void;
  setLevel: (level: DetailLevel) => void;
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
  return [
    { highlightWeekends, hidePastDays, level },
    {
      toggleWeekends: () => setHighlightWeekends((value) => !value),
      togglePastDays: () => setHidePastDays((value) => !value),
      setLevel,
    },
  ];
}
