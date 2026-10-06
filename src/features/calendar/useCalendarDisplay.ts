import { isBoolean, usePreference } from '../../infra/preferences';
import type { RowVisibility } from '../../domain/types';
import { ALL_ROWS_VISIBLE, parseRowVisibility, toggleLane } from './rowVisibility';

/** What the calendar of the releases shows, as this browser remembers it. */
export interface CalendarDisplay {
  /** Weekends in red, as the holidays. */
  highlightWeekends: boolean;
  /** The row of the daily revenue. */
  showMetrics: boolean;
  /** The timeline starts today. */
  hidePastDays: boolean;
  /** Titles on one line, out of their bars when longer; bars and notes one line tall. */
  oneLineTitles: boolean;
  /** The lanes and the notes row. */
  visibility: RowVisibility;
}

export interface CalendarDisplayControls {
  toggleWeekends: () => void;
  toggleMetrics: () => void;
  togglePastDays: () => void;
  toggleOneLineTitles: () => void;
  toggleLane: (laneId: string) => void;
  toggleNotes: () => void;
  /** Every row, the revenue included. */
  showAllRows: () => void;
}

/** The display choices of the calendar of the releases, and the ways to change them. */
export function useCalendarDisplay(): [CalendarDisplay, CalendarDisplayControls] {
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
  const [oneLineTitles, setOneLineTitles] = usePreference('titles-one-line', isBoolean, false);

  return [
    { highlightWeekends, showMetrics, hidePastDays, oneLineTitles, visibility },
    {
      toggleWeekends: () => setHighlightWeekends((value) => !value),
      toggleMetrics: () => setShowMetrics((value) => !value),
      togglePastDays: () => setHidePastDays((value) => !value),
      toggleOneLineTitles: () => setOneLineTitles((value) => !value),
      toggleLane: (laneId) => setVisibility((current) => toggleLane(current, laneId)),
      toggleNotes: () =>
        setVisibility((current) => ({ ...current, showNotes: !current.showNotes })),
      showAllRows: () => {
        setVisibility(ALL_ROWS_VISIBLE);
        setShowMetrics(true);
      },
    },
  ];
}
