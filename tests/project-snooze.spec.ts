import { describe, expect, it } from 'vitest'
import { project, type Workspace } from '../src/taskbar.ts'

const workspaces: readonly Workspace[] = [
  { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1', 's2'] },
]

describe('project snooze', () => {
  it('places a Session still waiting to wake on Snoozed only, slim', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { snoozedUntil: 5000 } },
      now: 1000,
    })
    expect(view.shelves.snoozed).toEqual([
      {
        sessionId: 's1',
        workspaceTitle: 'alpha',
        sessionTitle: 'Fix login',
        selected: false,
        slim: true,
        wakeAt: 5000,
      },
    ])
    expect(view.shelves.active).toEqual([])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('places a Session on Active when the wake time is not after now', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { snoozedUntil: 1000 } },
      now: 1000,
    })
    expect(view.shelves.active).toEqual([
      {
        sessionId: 's1',
        workspaceTitle: 'alpha',
        sessionTitle: 'Fix login',
        selected: false,
      },
    ])
    expect(view.shelves.snoozed).toEqual([])
  })

  it('Snooze outranks Pin and Settle so the Session is only on Snoozed', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { pin: 0, settledAt: 50, snoozedUntil: 5000 } },
      now: 1000,
    })
    expect(view.shelves.snoozed.map((card) => card.sessionId)).toEqual(['s1'])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.active).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('sorts Snoozed by soonest wake first', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 's2', title: 'Other', updatedAt: 1, running: false, blank: false },
      ],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { snoozedUntil: 4000 }, s2: { snoozedUntil: 2000 } },
      now: 1000,
    })
    expect(view.shelves.snoozed.map((card) => card.sessionId)).toEqual(['s2', 's1'])
  })

  it('Pin of a snoozed Session lands on Pinned only', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { pin: 0 } },
      now: 1000,
    })
    expect(view.shelves.pinned.map((card) => card.sessionId)).toEqual(['s1'])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.active).toEqual([])
  })

  it('Wake of a snoozed Session lands on Active at the top, not Pinned', () => {
    const view = project({
      sessions: [
        { id: 's2', title: 'Other', updatedAt: 1, running: false, blank: false },
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
      ],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { active: -1 }, s2: { active: 0 } },
      now: 1000,
    })
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s1', 's2'])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
  })
})
