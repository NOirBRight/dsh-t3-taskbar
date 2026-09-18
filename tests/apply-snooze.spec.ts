import { describe, expect, it } from 'vitest'
import { apply } from '../src/taskbar.ts'

describe('apply Snooze and Wake', () => {
  it('Snooze writes only snoozedUntil', () => {
    expect(apply({}, { type: 'Snooze', sessionId: 's1', until: 5000 })).toEqual({
      s1: { snoozedUntil: 5000 },
    })
  })

  it('Snooze of a Pinned Session clears the pin key', () => {
    expect(apply(
      { s1: { pin: 0, active: 3 } },
      { type: 'Snooze', sessionId: 's1', until: 5000 },
    )).toEqual({ s1: { snoozedUntil: 5000 } })
  })

  it('Snooze of a Settled Session clears settle', () => {
    expect(apply(
      { s1: { settledAt: 50 } },
      { type: 'Snooze', sessionId: 's1', until: 5000 },
    )).toEqual({ s1: { snoozedUntil: 5000 } })
  })

  it('Snooze with pendingInteraction leaves the ledger unchanged', () => {
    expect(apply(
      { s1: { pin: 0 } },
      { type: 'Snooze', sessionId: 's1', until: 5000, pendingInteraction: 'approval' },
    )).toEqual({ s1: { pin: 0 } })
  })

  it('Snooze with a question pendingInteraction is also rejected', () => {
    expect(apply(
      {},
      { type: 'Snooze', sessionId: 's1', until: 5000, pendingInteraction: 'question' },
    )).toEqual({})
  })

  it('Wake clears snoozedUntil and writes an active key at the top', () => {
    expect(apply(
      { s1: { snoozedUntil: 5000 } },
      { type: 'Wake', sessionId: 's1' },
    )).toEqual({ s1: { active: 0 } })
  })

  it('Wake of a second Session lands above the first Active key', () => {
    expect(apply(
      { s1: { active: 0 }, s2: { snoozedUntil: 5000 } },
      { type: 'Wake', sessionId: 's2' },
    )).toEqual({
      s1: { active: 0 },
      s2: { active: -1 },
    })
  })

  it('Wake does not restore a pin that Snooze cleared', () => {
    const snoozed = apply({ s1: { pin: 0 } }, { type: 'Snooze', sessionId: 's1', until: 5000 })
    expect(snoozed).toEqual({ s1: { snoozedUntil: 5000 } })
    expect(apply(snoozed, { type: 'Wake', sessionId: 's1' })).toEqual({ s1: { active: 0 } })
  })
})
