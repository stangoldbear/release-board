/**
 * Changes to some fields of an item: a value replaces the field, null removes an optional one,
 * and a field left out stays as it is.
 */
export type FieldChanges<T> = { [K in keyof T]?: T[K] | null };

/** The item with the changes applied; null removes an optional field. */
export function applyChanges<T extends object>(item: T, changes: FieldChanges<T>): T {
  const next = { ...item } as Record<string, unknown>;
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) delete next[key];
    else if (value !== undefined) next[key] = value;
  }
  return next as T;
}
