import { describe, expect, it } from 'vitest'
import { settledVisibleCount } from '../src/client/settled.ts'
import { relativeTimeOf } from '../src/taskbar.ts'

describe('settledVisibleCount', () => {
  it('ages a fixed settled timestamp instead of remaining just now', () => {
    const settledAt = 1_700_000_000_000
    expect(relativeTimeOf(settledAt, settledAt + 30_000)).toEqual({ unit: 'now', n: 0 })
    expect(relativeTimeOf(settledAt, settledAt + 180_000)).toEqual({ unit: 'minutes', n: 3 })
    expect(relativeTimeOf(settledAt, settledAt + 3_600_000)).toEqual({ unit: 'hours', n: 1 })
  })
  it('caps history while keeping a selected hidden row visible', () => {
    const ids = Array.from({ length: 40 }, (_, index) => `s${index}`)
    expect(settledVisibleCount(ids, undefined, 10)).toBe(10)
    expect(settledVisibleCount(ids, 's24', 10)).toBe(25)
    expect(settledVisibleCount(ids, 'missing', 50)).toBe(40)
  })
})
