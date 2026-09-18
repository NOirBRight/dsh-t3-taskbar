import { describe, expect, it } from 'vitest'
import { apply } from '../src/taskbar.ts'

describe('apply', () => {
  it('Pin writes a pin key for the Session', () => {
    expect(apply({}, { type: 'Pin', sessionId: 's1' })).toEqual({ s1: { pin: 0 } })
  })

  it('Pin of a second Session lands above the first', () => {
    expect(apply({ s1: { pin: 0 } }, { type: 'Pin', sessionId: 's2' })).toEqual({
      s1: { pin: 0 },
      s2: { pin: -1 },
    })
  })

  it('Unpin clears the pin key and drops an empty record', () => {
    expect(apply({ s1: { pin: 0 } }, { type: 'Unpin', sessionId: 's1' })).toEqual({})
  })

  it('Unpin clears only the pin key so a future Snooze can share that helper', () => {
    expect(apply(
      { s1: { pin: 0, snoozedUntil: 99 } },
      { type: 'Unpin', sessionId: 's1' },
    )).toEqual({ s1: { snoozedUntil: 99 } })
  })

  it('Pin of a Snoozed Session clears snooze so the row is only Pinned', () => {
    expect(apply({ s1: { snoozedUntil: 99 } }, { type: 'Pin', sessionId: 's1' })).toEqual({
      s1: { pin: 0 },
    })
  })

  it('Pin of a Settled Session clears settle so the row is only Pinned', () => {
    expect(apply({ s1: { settledAt: 50 } }, { type: 'Pin', sessionId: 's1' })).toEqual({
      s1: { pin: 0 },
    })
  })

  it('Gc drops ids that are gone or Archived', () => {
    expect(apply(
      { s1: { pin: 0 }, gone: { pin: 1 }, arch: { pin: 2 } },
      { type: 'Gc', livingIds: ['s1'] },
    )).toEqual({ s1: { pin: 0 } })
  })
})
