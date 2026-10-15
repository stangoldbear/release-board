// The order of a short list kept whole, as the lanes of Next Releases or the labels of the
// projects: an item put before another, or last, as a drag or the arrows ask.

/**
 * The items in their new order once `itemId` is put right before `beforeId`, or last when
 * `beforeId` is null. An unknown item leaves the order as it is.
 */
export function moveBefore<T extends { id: string }>(
  items: readonly T[],
  itemId: string,
  beforeId: string | null,
): T[] {
  const moved = items.find((item) => item.id === itemId);
  if (!moved || beforeId === itemId) return [...items];
  const others = items.filter((item) => item.id !== itemId);
  const at = beforeId === null ? -1 : others.findIndex((item) => item.id === beforeId);
  if (at < 0) return [...others, moved];
  return [...others.slice(0, at), moved, ...others.slice(at)];
}

/** The item that follows `itemId` once it is at `index` of the list: null when it goes last. */
export function followerAt(
  items: readonly { id: string }[],
  itemId: string,
  index: number,
): string | null {
  const others = items.filter((item) => item.id !== itemId);
  return others[index]?.id ?? null;
}
