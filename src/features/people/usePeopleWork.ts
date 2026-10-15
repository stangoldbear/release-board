import { useMemo } from 'react';
import type { TaskColorId } from '../../domain/colors';
import { sharedDays, worksOn } from '../../domain/peopleWork';
import type { PersonBar } from '../../domain/peopleWork';
import type { ProjectWithEnd } from '../../domain/projects';
import type { ProjectSpan } from '../../domain/projectSpan';
import {
  projectColorOf,
  sortByPosition,
  stakeholdersByTeam,
  teamsInOrder,
} from '../../domain/roadmapConfig';
import type { RoadmapConfig, Stakeholder, Team } from '../../domain/types';
import { workItemsOf } from '../roadmaps/barRendering';
import type { WorkItem } from '../roadmaps/barRendering';

/** The work of a person on a project, as the part «Persone» draws it. */
export interface PersonWorkBar extends PersonBar {
  item: WorkItem;
  project: ProjectWithEnd;
  /** The color of the project: in a row of one person the project is what tells the bars apart. */
  colorId: TaskColorId;
}

export interface PersonRow {
  person: Stakeholder;
  /** The work on the projects shown: those the search and the labels keep. */
  bars: PersonWorkBar[];
  /** The days on which the person has more than one project at a time, among all of them. */
  shared: string[];
  /** How many of those days are today or later. */
  sharedAhead: number;
}

export interface TeamRows {
  team: Team | null;
  people: PersonRow[];
}

export interface PeopleWork {
  teams: TeamRows[];
  people: number;
  /** The people with work today, on any project. */
  atWorkToday: number;
  /** The people with more than one project at a time, from today on. */
  overbooked: number;
}

/**
 * The people of the plan by team, in the order of the settings, each with the work they have on
 * the projects shown. The days with more than one project at a time count every project, whatever
 * the search and the labels keep: they say how busy the person really is.
 */
export function peopleWorkOf(
  projects: readonly ProjectWithEnd[],
  shown: readonly ProjectWithEnd[],
  spans: ReadonlyMap<string, ProjectSpan>,
  config: RoadmapConfig,
  today: string,
): PeopleWork {
  const shownIds = new Set(shown.map((project) => project.id));
  const all = new Map<string, PersonWorkBar[]>();
  for (const project of projects) {
    const span = spans.get(project.id);
    if (!span) continue;
    const colorId = projectColorOf(project, config);
    for (const item of workItemsOf(project, span, config)) {
      if (item.kind !== 'assignment' || !item.stakeholder) continue;
      const bars = all.get(item.stakeholder.id) ?? [];
      bars.push({ id: item.id, schedule: item.schedule, item, project, colorId });
      all.set(item.stakeholder.id, bars);
    }
  }
  // The teams in the order «Team e persone» gives them, the people without a team last.
  const order = teamsInOrder(config).map((team) => team.id);
  const rank = (team: Team | null) => (team ? order.indexOf(team.id) : order.length);
  const groups = stakeholdersByTeam(config).sort((a, b) => rank(a.team) - rank(b.team));
  const teams = groups.map(({ team, stakeholders }) => ({
    team,
    people: sortByPosition(stakeholders).map((person): PersonRow => {
      const bars = all.get(person.id) ?? [];
      const shared = sharedDays(bars);
      return {
        person,
        bars: bars.filter((bar) => shownIds.has(bar.project.id)),
        shared,
        sharedAhead: shared.filter((day) => day >= today).length,
      };
    }),
  }));
  const people = config.stakeholders;
  return {
    teams,
    people: people.length,
    atWorkToday: people.filter((person) =>
      (all.get(person.id) ?? []).some((bar) => worksOn(bar, today)),
    ).length,
    overbooked: teams.flatMap((team) => team.people).filter((row) => row.sharedAhead > 0).length,
  };
}

/** The people and their work, computed again only when the plan or the projects shown change. */
export function usePeopleWork(
  projects: readonly ProjectWithEnd[],
  shown: readonly ProjectWithEnd[],
  spans: ReadonlyMap<string, ProjectSpan>,
  config: RoadmapConfig,
  today: string,
): PeopleWork {
  return useMemo(
    () => peopleWorkOf(projects, shown, spans, config, today),
    [projects, shown, spans, config, today],
  );
}
