import type { PlanPart } from './PlanRepository';

/** The areas of the page, one under the other; the header shows or hides each of them. */
export type AreaId = 'notes' | 'releases' | 'roadmaps' | 'people' | 'contacts';

export interface Area {
  id: AreaId;
  label: string;
  /** Still in development: only who turns the beta features on sees it. */
  beta?: true;
  /** Shown in its own tab only, not with the others in «All». */
  ownTab?: true;
}

export const AREAS: readonly Area[] = [
  { id: 'notes', label: 'Notes' },
  { id: 'releases', label: 'Next Releases' },
  { id: 'roadmaps', label: 'Roadmap' },
  { id: 'people', label: 'Persone' },
  // The organization chart (0.21): a page of its own, not part of the timeline.
  { id: 'contacts', label: 'Contatti', beta: true, ownTab: true },
];

/** The browser preference that shows the parts of the app still in development. */
export const BETA_FEATURES_PREFERENCE = 'beta-features';

/** The parts of the plan that only the beta features show: the contacts, since the 0.21. */
export const BETA_PARTS: readonly PlanPart[] = ['contacts'];

/** Whether anything is in beta: the settings offer the switch only then; the mechanism stays. */
export const HAS_BETA_FEATURES = AREAS.some((area) => area.beta) || BETA_PARTS.length > 0;

/** The areas this browser can show: without the beta features, only the finished ones. */
export function availableAreas(betaFeatures: boolean): readonly Area[] {
  return betaFeatures ? AREAS : AREAS.filter((area) => !area.beta);
}

export type AreaVisibility = Record<AreaId, boolean>;

export const ALL_AREAS_VISIBLE: AreaVisibility = {
  notes: true,
  releases: true,
  roadmaps: true,
  people: true,
  contacts: true,
};

/**
 * The areas shown, as a browser saved them; null when the saved value is not one. An area the
 * saved value does not know, because it came later, is shown.
 */
export function parseAreaVisibility(value: unknown): AreaVisibility | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const saved = value as Record<string, unknown>;
  return Object.fromEntries(
    AREAS.map(({ id }) => [id, typeof saved[id] === 'boolean' ? saved[id] : true]),
  ) as AreaVisibility;
}

/** The element of an area, to bring it into view. */
export function areaElementId(id: AreaId): string {
  return `area-${id}`;
}
