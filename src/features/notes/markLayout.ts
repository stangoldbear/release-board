/** The least room for a title beside its symbol: below it the symbol shows alone. */
export const MIN_TITLE_ROOM = 28;

/**
 * The room for the title of each mark, in pixels, from the right of its symbol to the next mark
 * on its lane, so that a title never runs under the next symbol; Infinity for the last mark of a
 * lane. `x` is the middle of a symbol of `symbol` pixels, `gap` the room kept on either side.
 */
export function titleRooms(
  marks: readonly { x: number; lane: number }[],
  symbol: number,
  gap: number,
): number[] {
  const order = marks
    .map((_, index) => index)
    .sort((a, b) => {
      const first = marks[a];
      const second = marks[b];
      return first && second ? first.lane - second.lane || first.x - second.x : 0;
    });
  const rooms = marks.map(() => Infinity);
  order.forEach((index, position) => {
    const mark = marks[index];
    const next = marks[order[position + 1] ?? -1];
    if (!mark || !next || next.lane !== mark.lane) return;
    rooms[index] = next.x - mark.x - symbol - 2 * gap;
  });
  return rooms;
}
