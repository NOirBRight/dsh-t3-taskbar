import { describe, expect, it } from 'vitest'
import { apply } from '../src/taskbar.ts'

describe('apply Snooze and Wake', () => {
  it('Snooze writes a wake time and drops Pin and Settle', () => {
    expect(apply({}, { type: 'Snooze', sessionId: 's1', until: 5000 })).toEqual({
      s1: { snoozedUntil: 5000 },
    })
  })

  it('Snooze of a Pinned Session leaves it only on Snoozed', () => {
    expect(apply(
      { s1: { pin: 0, active: 3 } },
      { type: 'Snooze', sessionId: 's1', until: 5000 },
    )).toEqual({ s1: { snoozedUntil: 5000 } })
  })

  it('Snooze of a Settled Session leaves it only on Snoozed', () => {
    expect(apply(
      { s1: { settledAt: 50 } },
      { type: 'Snooze', sessionId: 's1', until: 5000 },
    )).toEqual({ s1: { snoozedUntil: 5000 } })
  })

  it('Snooze while waiting for me is refused', () => {
    expect(apply(
      { s1: { pin: 0 } },
      { type: 'Snooze', sessionId: 's1', until: 5000, pendingInteraction: 'approval' },
    )).toEqual({ s1: { pin: 0 } })
  })

  it('Snooze while waiting on a question is also rejected', () => {
    expect(apply(
      {},
      { type: 'Snooze', sessionId: 's1', until: 5000, pendingInteraction: 'question' },
    )).toEqual({})
  })

  it('Wake returns the Session to the top of Active', () => {
    expect(apply(
      { s1: { snoozedUntil: 5000 } },
      { type: 'Wake', sessionId: 's1' },
    )).toEqual({ s1: { active: 0 } })
  })

  it('Wake of a second Session lands at the top of Active', () => {
    expect(apply(
      { s1: { active: 0 }, s2: { snoozedUntil: 5000 } },
      { type: 'Wake', sessionId: 's2' },
    )).toEqual({
      s1: { active: 0 },
      s2: { active: -1 },
    })
  })

  it('Wake after Snooze lands on Active, not Pinned', () => {
    const snoozed = apply({ s1: { pin: 0 } }, { type: 'Snooze', sessionId: 's1', until: 5000 })
    expect(snoozed).toEqual({ s1: { snoozedUntil: 5000 } })
    expect(apply(snoozed, { type: 'Wake', sessionId: 's1' })).toEqual({ s1: { active: 0 } })
  })
})
