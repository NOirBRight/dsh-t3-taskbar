import type { Command, Shelf } from '../taskbar.ts'
import type { TaskbarKey } from './locales.ts'

export type DropDest = 'pinned' | 'active' | 'settled'
export type DropHint = { dest: DropDest; index: number }

export function dropCommand(input: {
  sessionId: string
  dest: DropDest
  index: number
  shelfIds: readonly string[]
  snoozed: boolean
  at: number
  now: number
}): Command | undefined {
  const { sessionId, dest, index, shelfIds, snoozed, at, now } = input
  if (dest === 'settled' && snoozed) return undefined
  if (dest === 'settled') {
    return { type: 'Drop', sessionId, dest, index, at, now, shelfIds }
  }
  return { type: 'Drop', sessionId, dest, index, shelfIds, ...(dest === 'active' || dest === 'pinned' ? { at } : {}) }
}

export function dropVerbOf(dest: DropDest, current: Shelf): TaskbarKey | undefined {
  if (dest === 'pinned') return current === 'pinned' ? undefined : 'pin'
  if (dest === 'settled') {
    if (current === 'settled' || current === 'snoozed') return undefined
    return 'settle'
  }
  if (current === 'pinned') return 'unpin'
  if (current === 'snoozed') return 'wake'
  if (current === 'settled') return 'unsettle'
  return undefined
}
