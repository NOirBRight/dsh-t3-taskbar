export const SETTLED_INITIAL = 10
export const SETTLED_PAGE = 25

/** Keep the selected settled row discoverable without eagerly rendering all history. */
export function settledVisibleCount(ids: readonly string[], selectedId: string | undefined, requested: number): number {
  const selectedIndex = selectedId === undefined ? -1 : ids.indexOf(selectedId)
  return Math.min(ids.length, Math.max(requested, selectedIndex + 1))
}
