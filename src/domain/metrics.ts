import type { DateRange } from './schedule';
import type { DailyMetric } from './types';

/** Sum of the values in the range, or null when the range has no values. */
export function sumInRange(values: readonly DailyMetric[], range: DateRange): number | null {
  let total: number | null = null;
  for (const { date, value } of values) {
    if (range.start <= date && date <= range.end) total = (total ?? 0) + value;
  }
  return total;
}
