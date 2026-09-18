import { describe, expect, it } from 'vitest'
import { apply, project, type Session, type Workspace } from '../src/taskbar.ts'

const session = (partial: Partial<Session> & Pick<Session, 'id' | 'title'>): Session => ({
  updatedAt: 1,
  running: false,
  blank: false,
  ...partial,
})

const workspaces: readonly Workspace[] = [
  { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1', 's2'] },
]

describe('project snooze', () => {
  it('places a Session with snoozedUntil after now on Snoozed only, slim', () => {
    const view = project({
      sessions: [session({ id: 's1', title: 'Fix login' })],
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
      },
    ])
    expect(view.shelves.active).toEqual([])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('places a Session on Active when snoozedUntil is not after now', () => {
    const view = project({
      sessions: [session({ id: 's1', title: 'Fix login' })],
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

  it('keeps a snoozed row only on Snoozed even if pin and settle keys remain', () => {
    const view = project({
      sessions: [session({ id: 's1', title: 'Fix login' })],
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

  it('sorts Snoozed by snoozedUntil ascending', () => {
    const view = project({
      sessions: [
        session({ id: 's1', title: 'Fix login' }),
        session({ id: 's2', title: 'Other' }),
      ],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { snoozedUntil: 4000 }, s2: { snoozedUntil: 2000 } },
      now: 1000,
    })
    expect(view.shelves.snoozed.map((card) => card.sessionId)).toEqual(['s2', 's1'])
  })

  it('Pin of a snoozed Session lands on Pinned only', () => {
    const ledger = apply(
      { s1: { snoozedUntil: 5000 } },
      { type: 'Pin', sessionId: 's1' },
    )
    const view = project({
      sessions: [session({ id: 's1', title: 'Fix login' })],
      workspaces,
      archivedSessionIds: [],
      ledger,
      now: 1000,
    })
    expect(view.shelves.pinned.map((card) => card.sessionId)).toEqual(['s1'])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.active).toEqual([])
  })

  it('Wake of a snoozed Session lands on Active at the top, not Pinned', () => {
    const snoozed = apply({ s1: { pin: 0 } }, { type: 'Snooze', sessionId: 's1', until: 5000 })
    const ledger = apply(
      { ...snoozed, s2: { active: 0 } },
      { type: 'Wake', sessionId: 's1' },
    )
    const view = project({
      sessions: [
        session({ id: 's2', title: 'Other' }),
        session({ id: 's1', title: 'Fix login' }),
      ],
      workspaces,
      archivedSessionIds: [],
      ledger,
      now: 1000,
    })
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s1', 's2'])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
  })
})
