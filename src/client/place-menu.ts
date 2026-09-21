export function placeMenu(
  anchor: { top: number; bottom: number; left: number; right: number },
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 5,
  margin = 8,
): { x: number; y: number } {
  const x = Math.max(margin, Math.min(viewport.width - size.width - margin, (anchor.left + anchor.right) / 2 - size.width / 2))
  const below = anchor.bottom + gap
  const above = anchor.top - size.height - gap
  const y = below + size.height <= viewport.height - margin
    ? below
    : above >= margin
      ? above
      : Math.max(margin, viewport.height - size.height - margin)
  return { x, y }
}
