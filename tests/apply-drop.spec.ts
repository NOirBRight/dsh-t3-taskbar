import { describe, expect, it } from 'vitest'
import { apply } from '../src/taskbar.ts'

describe('apply Drop', () => {
  it('Drop onto empty Pinned parks at the top the same way as Pin', () => {
    expect(apply({}, { type: 'Drop', sessionId: 's1', dest: 'pinned', index: 0 })).toEqual({
      s1: { pin: 0 },
    })
  })

  it('Drop onto Active from Pinned at index 0 lands at the top of Active', () => {
    expect(apply({ s1: { pin: 0 } }, { type: 'Drop', sessionId: 's1', dest: 'active', index: 0 })).toEqual({
      s1: { active: 0 },
    })
  })

  it('Drop onto Active from Snoozed Wakes', () => {
    expect(apply(
      { s1: { snoozedUntil: 5000 } },
      { type: 'Drop', sessionId: 's1', dest: 'active', index: 0 },
    )).toEqual({ s1: { active: 0 } })
  })

  it('Drop onto Settled parks the Session the same way as Settle', () => {
    expect(apply(
      { s1: { pin: 0 } },
      { type: 'Drop', sessionId: 's1', dest: 'settled', index: 0, at: 50 },
    )).toEqual({ s1: { settledAt: 50 } })
  })

  it('Drop onto Active from Settled Un-settles', () => {
    expect(apply(
      { s1: { settledAt: 50 } },
      { type: 'Drop', sessionId: 's1', dest: 'active', index: 0 },
    )).toEqual({ s1: { active: 0 } })
  })

  it('Drop onto Pinned from Snoozed is Wake then Pin', () => {
    expect(apply(
      { s1: { snoozedUntil: 99 } },
      { type: 'Drop', sessionId: 's1', dest: 'pinned', index: 0 },
    )).toEqual({ s1: { pin: 0 } })
  })

  it('Drop onto Pinned at index 0 Pins at the top', () => {
    expect(apply(
      { s1: { pin: 0 } },
      { type: 'Drop', sessionId: 's2', dest: 'pinned', index: 0 },
    )).toEqual({
      s1: { pin: 0 },
      s2: { pin: -1 },
    })
  })

  it('reorder within Pinned lands at that index', () => {
    expect(apply(
      { s1: { pin: 0 }, s2: { pin: 1 }, s3: { pin: 2 } },
      { type: 'Drop', sessionId: 's1', dest: 'pinned', index: 2 },
    )).toEqual({
      s1: { pin: 3 },
      s2: { pin: 1 },
      s3: { pin: 2 },
    })
  })

  it('reorder within Active lands at that index', () => {
    expect(apply(
      { s1: { active: 0 }, s2: { active: 1 }, s3: { active: 2 } },
      { type: 'Drop', sessionId: 's1', dest: 'active', index: 2 },
    )).toEqual({
      s1: { active: 3 },
      s2: { active: 1 },
      s3: { active: 2 },
    })
  })

  it('reorder within Pinned to a middle index sits between the neighbors', () => {
    expect(apply(
      { s1: { pin: 0 }, s2: { pin: 1 }, s3: { pin: 2 } },
      { type: 'Drop', sessionId: 's3', dest: 'pinned', index: 1 },
    )).toEqual({
      s1: { pin: 0 },
      s2: { pin: 1 },
      s3: { pin: 0.5 },
    })
  })

  it('Wake via Drop onto Active at a specific index lands at that index', () => {
    expect(apply(
      { s1: { active: 0 }, s2: { snoozedUntil: 99 } },
      { type: 'Drop', sessionId: 's2', dest: 'active', index: 1 },
    )).toEqual({
      s1: { active: 0 },
      s2: { active: 1 },
    })
  })

  it('Un-settle via Drop onto Active at a specific index lands at that index', () => {
    expect(apply(
      { s1: { active: 0 }, s2: { settledAt: 50 } },
      { type: 'Drop', sessionId: 's2', dest: 'active', index: 1 },
    )).toEqual({
      s1: { active: 0 },
      s2: { active: 1 },
    })
  })

  it('Un-settle via Drop onto Active at index 0 lands at the top', () => {
    expect(apply(
      { s1: { active: 0 }, s2: { settledAt: 50 } },
      { type: 'Drop', sessionId: 's2', dest: 'active', index: 0 },
    )).toEqual({
      s1: { active: 0 },
      s2: { active: -1 },
    })
  })

  it('Drop onto Settled while Snoozed leaves the Session on Snoozed', () => {
    expect(apply(
      { s1: { snoozedUntil: 5000 } },
      { type: 'Drop', sessionId: 's1', dest: 'settled', index: 0, at: 50, now: 1000 },
    )).toEqual({ s1: { snoozedUntil: 5000 } })
  })

  it('Drop onto Settled of a Session already Settled leaves it unchanged', () => {
    expect(apply(
      { s1: { settledAt: 50 } },
      { type: 'Drop', sessionId: 's1', dest: 'settled', index: 0, at: 99 },
    )).toEqual({ s1: { settledAt: 50 } })
  })

  it('Drop onto Active among unordered Sessions lands at that index', () => {
    expect(apply(
      {},
      { type: 'Drop', sessionId: 's1', dest: 'active', index: 1, shelfIds: ['s2', 's3'] },
    )).toEqual({
      s2: { active: 0 },
      s1: { active: 1 },
      s3: { active: 2 },
    })
  })
})
