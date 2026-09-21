import { describe, expect, it } from 'vitest'
import { autoSettleDecision, type AutoSettleCandidate } from '../src/auto-settle.ts'

const DAY = 86_400_000
const NOW = 10 * DAY
const base: AutoSettleCandidate = {
  sessionId: 's1',
  latestActivityAt: 5 * DAY,
  blank: false,
  running: false,
  archived: false,
  origin: 'user',
  shelf: 'active',
  protected: false,
}

const settings = { autoSettleAfterDays: 3, autoSettleOnMerge: true, autoSettleOnClose: true }

describe('autoSettleDecision', () => {
  it('settles an inactive Active Session at its last activity timestamp', () => {
    expect(autoSettleDecision(base, settings, NOW)).toEqual({ reason: 'inactive', settledAt: 5 * DAY })
  })

  it.each([
    ['blank', { blank: true }],
    ['running', { running: true }],
    ['archived', { archived: true }],
    ['subagent', { origin: 'subagent' as const }],
    ['pinned', { shelf: 'pinned' as const }],
    ['snoozed', { shelf: 'snoozed' as const }],
    ['settled', { shelf: 'settled' as const }],
    ['protected', { protected: true }],
  ])('skips %s Sessions', (_name, patch) => {
    expect(autoSettleDecision({ ...base, ...patch }, settings, NOW)).toBeUndefined()
  })

  it('does not settle exactly on the inactivity boundary', () => {
    expect(autoSettleDecision({ ...base, latestActivityAt: 7 * DAY }, settings, NOW)).toBeUndefined()
  })

  it('settles after a trusted merged PR no older than the activity', () => {
    expect(autoSettleDecision({
      ...base,
      latestActivityAt: 9 * DAY,
      pr: { state: 'merged', terminalAt: 9.5 * DAY, number: 4 },
    }, { ...settings, autoSettleAfterDays: null }, NOW)).toEqual({ reason: 'pr-merged', settledAt: 9.5 * DAY, pr: 4 })
  })

  it('settles after a trusted closed PR only when configured', () => {
    const candidate = { ...base, latestActivityAt: 9 * DAY, pr: { state: 'closed' as const, terminalAt: 9.5 * DAY, number: 7 } }
    expect(autoSettleDecision(candidate, { ...settings, autoSettleAfterDays: null }, NOW)).toEqual({ reason: 'pr-closed', settledAt: 9.5 * DAY, pr: 7 })
    expect(autoSettleDecision(candidate, { ...settings, autoSettleAfterDays: null, autoSettleOnClose: false }, NOW)).toBeUndefined()
  })

  it('does not use an open, unknown, or stale PR terminal fact', () => {
    const disabled = { ...settings, autoSettleAfterDays: null }
    expect(autoSettleDecision({ ...base, pr: { state: 'open', number: 1 } }, disabled, NOW)).toBeUndefined()
    expect(autoSettleDecision(base, disabled, NOW)).toBeUndefined()
    expect(autoSettleDecision({ ...base, latestActivityAt: 9 * DAY, pr: { state: 'merged', terminalAt: 8 * DAY, number: 1 } }, disabled, NOW)).toBeUndefined()
  })

  it('honors a manual Active hold until newer real activity exists', () => {
    expect(autoSettleDecision({ ...base, manualActiveAt: 6 * DAY }, settings, NOW)).toBeUndefined()
    expect(autoSettleDecision({ ...base, manualActiveAt: 4 * DAY }, settings, NOW)).toEqual({ reason: 'inactive', settledAt: 5 * DAY })
  })
})
