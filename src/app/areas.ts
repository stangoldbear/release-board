/** The areas of the page, one under the other; the header shows or hides each of them. */
export type AreaId = 'notes' | 'releases' | 'roadmaps';

export const AREAS: readonly { id: AreaId; label: string }[] = [
  { id: 'notes', label: 'Note' },
  { id: 'releases', label: 'Next Releases' },
  { id: 'roadmaps', label: 'Roadmaps' },
];

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
