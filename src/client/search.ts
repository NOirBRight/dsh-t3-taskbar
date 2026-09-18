import type { Card } from '../taskbar.ts'

export type SearchCard = Pick<Card, 'sessionId' | 'sessionTitle' | 'workspaceTitle'> & {
  draftPreview?: string
}

export function matchingIds(cards: readonly SearchCard[], query: string): string[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return []
  return cards
    .filter((card) =>
      card.sessionTitle.toLowerCase().includes(needle)
      || card.workspaceTitle.toLowerCase().includes(needle)
      || (card.draftPreview !== undefined && card.draftPreview.toLowerCase().includes(needle)))
    .map((card) => card.sessionId)
}
