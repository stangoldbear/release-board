import { formatLocaleNumber } from './numberFormat';
import type { WorkBar } from './projectSpan';
import { teamsInOrder } from './roadmapConfig';
import type { RoadmapConfig, Team } from './types';

// How many days of effort each team spends on one day, across all the projects: the footer shows
// it for the day chosen in the timeline.

/** The days of effort a team puts on one day. */
export interface TeamDayEffort {
  team: Team;
  manDays: number;
}

/**
 * The effort of a bar of work on a day: a whole day on each of its working days, half a day on the
 * last one when its effort ends with a half.
 */
export function barEffortOn(bar: Pick<WorkBar, 'manDays' | 'schedule'>, day: string): number {
  const { workDays, truncated } = bar.schedule;
  const at = workDays.indexOf(day);
  if (at === -1) return 0;
  const half = bar.manDays - Math.floor(bar.manDays);
  return at === workDays.length - 1 && half > 0 && !truncated ? half : 1;
}

/**
 * The effort of every team on a day, in the order of the teams: the days of its people on all the
 * projects, zero when nobody of it works that day. The contingency is nobody's work, and a person
 * no longer in the configuration has no team: neither counts.
 */
export function teamEffortOn(
  day: string,
  bars: Iterable<WorkBar>,
  config: Pick<RoadmapConfig, 'teams' | 'stakeholders'>,
): TeamDayEffort[] {
  const teamOfPerson = new Map(config.stakeholders.map((person) => [person.id, person.teamId]));
  const sums = new Map<string, number>();
  for (const bar of bars) {
    const teamId = bar.kind === 'assignment' ? teamOfPerson.get(bar.stakeholderId ?? '') : null;
    if (!teamId) continue;
    const effort = barEffortOn(bar, day);
    if (effort > 0) sums.set(teamId, (sums.get(teamId) ?? 0) + effort);
  }
  return teamsInOrder(config).map((team) => ({ team, manDays: sums.get(team.id) ?? 0 }));
}

/** "BA:1, ServerSide:3, iOSDev:4,5": the effort of the teams on a day, by their tags. */
export function formatTeamEffort(efforts: readonly TeamDayEffort[]): string {
  return efforts
    .map(
      ({ team, manDays }) =>
        `${team.tag}:${formatLocaleNumber(manDays, Number.isInteger(manDays) ? 0 : 1)}`,
    )
    .join(', ');
}

/** The days of effort of all the teams together. */
export function totalEffort(efforts: readonly TeamDayEffort[]): number {
  return efforts.reduce((sum, { manDays }) => sum + manDays, 0);
}
