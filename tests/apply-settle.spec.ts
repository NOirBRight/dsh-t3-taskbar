import { describe, expect, it } from 'vitest'
import { apply } from '../src/taskbar.ts'

describe('apply Settle', () => {
  it('Settle from Active writes settledAt and leaves no pin', () => {
    expect(apply({}, { type: 'Settle', sessionId: 's1', at: 50 })).toEqual({
      s1: { settledAt: 50 },
    })
  })

  it('Settle from Pinned clears pin so the row is only Settled', () => {
    expect(apply({ s1: { pin: 0 } }, { type: 'Settle', sessionId: 's1', at: 50 })).toEqual({
      s1: { settledAt: 50 },
    })
  })

  it('Settle clears snooze if present', () => {
    expect(apply(
      { s1: { snoozedUntil: 99 } },
      { type: 'Settle', sessionId: 's1', at: 50 },
    )).toEqual({ s1: { settledAt: 50 } })
  })

  it('Unsettle clears settledAt and writes an active key so the row is at the top of Active', () => {
    expect(apply({ s1: { settledAt: 50 } }, { type: 'Unsettle', sessionId: 's1' })).toEqual({
      s1: { active: 0 },
    })
  })

  it('Unsettle of a second Session lands above the first Active key', () => {
    expect(apply(
      { s1: { active: 0 }, s2: { settledAt: 50 } },
      { type: 'Unsettle', sessionId: 's2' },
    )).toEqual({
      s1: { active: 0 },
      s2: { active: -1 },
    })
  })
})
