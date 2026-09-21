import { describe, expect, it } from 'vitest'
import { dropCommand } from '../src/client/drop.ts'
import { dragPreviewTranslations, dragShelfOffset } from '../src/client/Taskbar.tsx'

const base = { sessionId: 's1', index: 0, shelfIds: [], snoozed: false, at: 123, now: 456 } as const

describe('dropCommand', () => {
  it('opens a card-sized gap in both directions and across shelves', () => {
    const groups = { pinned: ['p'], active: ['a', 'b', 'c'], settled: [] }
    const preview = (sessionId: string, dest: 'active' | 'pinned', index: number) =>
      dragPreviewTranslations({ groups, sessionId, drop: { dest, index }, rowAdvance: 88 })
    expect(preview('c', 'active', 0)).toEqual({ a: 88, b: 88 })
    expect(preview('a', 'active', 2)).toEqual({ b: -88, c: -88 })
    expect(preview('b', 'active', 1)).toEqual({})
    expect(preview('b', 'pinned', 0)).toEqual({ c: -88, p: 88 })
  })

  it('uses source and destination heights separately for full/slim crossings', () => {
    const groups = { pinned: ['p'], active: ['a', 'b'], settled: ['s', 't'] }
    expect(dragPreviewTranslations({ groups, sessionId: 'a', drop: { dest: 'settled', index: 0 }, rowAdvance: 88, targetAdvance: 34 })).toEqual({ b: -88, s: 34, t: 34 })
    expect(dragPreviewTranslations({ groups, sessionId: 's', drop: { dest: 'active', index: 0 }, rowAdvance: 34, targetAdvance: 88 })).toEqual({ t: -34, a: 88, b: 88 })
    expect(dragShelfOffset('settled', 'active', 'settled', 88, 34)).toBe(-88)
    expect(dragShelfOffset('settled', 'settled', 'active', 34, 88)).toBe(88)
    expect(dragShelfOffset('active', 'settled', 'pinned', 34, 88)).toBe(88)
    expect(dragShelfOffset('settled', 'pinned', 'active', 88, 88)).toBe(0)
  })

  it('carries Host-normalized hold intent across a revision-conflict retry', () => {
    expect(dropCommand({ ...base, dest: 'active' })).toMatchObject({ type: 'Drop', at: 123 })
    expect(dropCommand({ ...base, dest: 'pinned' })).toMatchObject({ type: 'Drop', at: 123 })
  })
})
