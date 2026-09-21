import { describe, expect, it } from 'vitest'
import { nextProtectionSequence, shouldReuseProtectionClient, validProtectionSequence } from '../src/client/protection.ts'
import { EMPTY_PROTECTION, parseProtectionState, PROTECTION_FRESH_MS, PROTECTION_RETENTION_MS, protectionFor, updateProtection } from '../src/host/protection-file.ts'

describe('client protection reports', () => {
  it('requires a checked baseline and unions client vetoes', () => {
    let state = updateProtection(EMPTY_PROTECTION, 'web', 1, ['s1', 's2'], ['s1'], 10)
    state = updateProtection(state, 'mobile', 1, ['s1', 's2'], [], 11)
    expect(protectionFor(state, 's1', 40)).toBe('protected')
    expect(protectionFor(state, 's2', 40)).toBe('clear')
    expect(protectionFor(state, 's3', 40)).toBe('unknown')
  })

  it('ignores out-of-order clears', () => {
    const protectedState = updateProtection(EMPTY_PROTECTION, 'web', 2, ['s1'], ['s1'], 20)
    const stale = updateProtection(protectedState, 'web', 1, ['s1'], [], 30)
    expect(stale).toBe(protectedState)
    expect(protectionFor(stale, 's1', 40)).toBe('protected')
  })

  it('accepts a newer explicit clear', () => {
    const protectedState = updateProtection(EMPTY_PROTECTION, 'web', 1, ['s1'], ['s1'], 20)
    const cleared = updateProtection(protectedState, 'web', 2, ['s1'], [], 30)
    expect(protectionFor(cleared, 's1', 40)).toBe('clear')
  })

  it('uses a fresh explicit report instead of stale leases', () => {
    const clear = updateProtection(EMPTY_PROTECTION, 'web', 1, ['s1'], [], 10)
    const veto = updateProtection(EMPTY_PROTECTION, 'web', 1, ['s1'], ['s1'], 10)
    const expiredAt = PROTECTION_FRESH_MS + 11
    expect(protectionFor(clear, 's1', expiredAt)).toBe('unknown')
    expect(protectionFor(clear, 's1', -PROTECTION_FRESH_MS - 1)).toBe('unknown')
    expect(protectionFor(veto, 's1', expiredAt)).toBe('unknown')
    const withFreshClient = updateProtection(veto, 'mobile', 1, ['s1'], [], expiredAt - 1)
    expect(protectionFor(withFreshClient, 's1', expiredAt)).toBe('clear')
  })

  it('prunes expired client leases on a fresh heartbeat', () => {
    const stale = updateProtection(EMPTY_PROTECTION, 'closed-tab', 1, ['s1'], ['s1'], 0)
    const pruned = updateProtection(stale, 'live-tab', 1, ['s1'], [], PROTECTION_RETENTION_MS + 1)
    expect(Object.keys(pruned.clients)).toEqual(['live-tab'])
  })

  it('continues a persisted client sequence across reloads', () => {
    expect(nextProtectionSequence(null)).toBe(1)
    expect(nextProtectionSequence('41')).toBe(42)
    expect(nextProtectionSequence('invalid')).toBe(1)
    expect(validProtectionSequence(String(Number.MAX_SAFE_INTEGER))).toBe(false)
    expect(shouldReuseProtectionClient('tab-a', '4', 'reload')).toBe(true)
    expect(shouldReuseProtectionClient('tab-a', '4', 'navigate')).toBe(false)
  })

  it('rejects oversized and malformed persisted state', () => {
    expect(parseProtectionState({ version: 1, clients: { web: { seq: -1, receivedAt: 0, checkedIds: [], protectedIds: [] } } })).toBeUndefined()
    expect(parseProtectionState({ version: 1, clients: { web: { seq: 1, receivedAt: 0, checkedIds: [3], protectedIds: [] } } })).toBeUndefined()
  })
})
