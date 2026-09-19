import { describe, expect, it } from 'vitest'
import { apply } from '../src/taskbar.ts'

describe('apply Settle', () => {
  it('Settle from Active parks the Session on Settled, not Pinned', () => {
    expect(apply({}, { type: 'Settle', sessionId: 's1', at: 50 })).toEqual({
      s1: { settledAt: 50 },
    })
  })

  it('Settle from Pinned leaves the Session only on Settled', () => {
    expect(apply({ s1: { pin: 0 } }, { type: 'Settle', sessionId: 's1', at: 50 })).toEqual({
      s1: { settledAt: 50 },
    })
  })

  it('Settle of a Snoozed Session leaves it only on Settled', () => {
    expect(apply(
      { s1: { snoozedUntil: 99 } },
      { type: 'Settle', sessionId: 's1', at: 50 },
    )).toEqual({ s1: { settledAt: 50 } })
  })

  it('Unsettle parks the Session at the top of Active', () => {
    expect(apply({ s1: { settledAt: 50 } }, { type: 'Unsettle', sessionId: 's1' })).toEqual({
      s1: { active: 0 },
    })
  })

  it('Unsettle of a second Session lands at the top of Active', () => {
    expect(apply(
      { s1: { active: 0 }, s2: { settledAt: 50 } },
      { type: 'Unsettle', sessionId: 's2' },
    )).toEqual({
      s1: { active: 0 },
      s2: { active: -1 },
    })
  })
})
