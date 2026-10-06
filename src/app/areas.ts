import type { PlanPart } from './PlanRepository';

/** The areas of the page, one under the other; the header shows or hides each of them. */
export type AreaId = 'notes' | 'releases' | 'roadmaps';

export interface Area {
  id: AreaId;
  label: string;
  /** Still in development: only who turns the beta features on sees it. */
  beta?: true;
}

export const AREAS: readonly Area[] = [
  { id: 'notes', label: 'Note' },
  { id: 'releases', label: 'Next Releases' },
  { id: 'roadmaps', label: 'Roadmap', beta: true },
];

/** The browser preference that shows the parts of the app still in development. */
export const BETA_FEATURES_PREFERENCE = 'beta-features';

/** The parts of the plan that only the beta features show: the roadmap and its details. */
export const BETA_PARTS: readonly PlanPart[] = ['projects', 'roadmap'];

/** The areas this browser can show: without the beta features, only the finished ones. */
export function availableAreas(betaFeatures: boolean): readonly Area[] {
  return betaFeatures ? AREAS : AREAS.filter((area) => !area.beta);
}

export type AreaVisibility = Record<AreaId, boolean>;

export const ALL_AREAS_VISIBLE: AreaVisibility = { notes: true, releases: true, roadmaps: true };

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
