import { describe, expect, it } from 'vitest'
import { apply } from '../src/taskbar.ts'

describe('apply Settle', () => {
  it('Settle from Active parks the Session on Settled, not Pinned', () => {
    expect(apply({}, { type: 'Settle', sessionId: 's1', at: 50 })).toEqual({
      s1: { settledAt: 50, settledBy: 'manual' },
    })
  })

  it('Settle from Pinned leaves the Session only on Settled', () => {
    expect(apply({ s1: { pin: 0 } }, { type: 'Settle', sessionId: 's1', at: 50 })).toEqual({
      s1: { settledAt: 50, settledBy: 'manual' },
    })
  })

  it('Settle of a Snoozed Session leaves it only on Settled', () => {
    expect(apply(
      { s1: { snoozedUntil: 99 } },
      { type: 'Settle', sessionId: 's1', at: 50 },
    )).toEqual({ s1: { settledAt: 50, settledBy: 'manual' } })
  })

  it('AutoSettle records its reason and pull request', () => {
    expect(apply({}, { type: 'AutoSettle', sessionId: 's1', at: 50, reason: 'pr-merged', pr: 42 })).toEqual({
      s1: { settledAt: 50, settledBy: 'auto-pr-merged', settledPr: 42 },
    })
  })

  it('Unsettle parks the Session at the top of Active', () => {
    expect(apply({ s1: { settledAt: 50, settledBy: 'manual' } }, { type: 'Unsettle', sessionId: 's1' })).toEqual({
      s1: { active: 0 },
    })
  })

  it('timestamped Unsettle installs a manual Active hold', () => {
    expect(apply({ s1: { settledAt: 50 } }, { type: 'Unsettle', sessionId: 's1', at: 70 })).toEqual({
      s1: { active: 0, manualActiveAt: 70 },
    })
  })

  it('Pin and Snooze from Settled install a manual hold', () => {
    expect(apply({ s1: { settledAt: 50 } }, { type: 'Pin', sessionId: 's1', at: 70 })).toEqual({ s1: { pin: 0, manualActiveAt: 70 } })
    expect(apply({ s1: { settledAt: 50 } }, { type: 'Snooze', sessionId: 's1', until: 100, at: 70 })).toEqual({ s1: { snoozedUntil: 100, manualActiveAt: 70 } })
  })

  it('manual Active hold survives ordering, pin, and snooze transitions', () => {
    const held = { s1: { active: 0, manualActiveAt: 70 }, s2: { active: 1 } }
    const reordered = apply(held, { type: 'Drop', sessionId: 's1', dest: 'active', index: 1, shelfIds: ['s1', 's2'] })
    expect(reordered.s1).toEqual({ active: 1, manualActiveAt: 70 })
    const pinned = apply(reordered, { type: 'Pin', sessionId: 's1' })
    expect(pinned.s1).toEqual({ pin: 0, manualActiveAt: 70 })
    const snoozed = apply(pinned, { type: 'Snooze', sessionId: 's1', until: 100 })
    expect(apply(snoozed, { type: 'Wake', sessionId: 's1' }).s1).toEqual({ active: -1, manualActiveAt: 70 })
  })

  it('dragging to Settled records a manual settlement', () => {
    expect(apply({ s1: { active: 0 } }, { type: 'Drop', sessionId: 's1', dest: 'settled', index: 0, at: 80 })).toEqual({
      s1: { settledAt: 80, settledBy: 'manual' },
    })
  })

  it('Unsettle of a second Session lands at the top of Active', () => {
    expect(apply(
      { s1: { active: 0 }, s2: { settledAt: 50, settledBy: 'manual' } },
      { type: 'Unsettle', sessionId: 's2' },
    )).toEqual({
      s1: { active: 0 },
      s2: { active: -1 },
    })
  })
})
