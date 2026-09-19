import { describe, expect, it } from 'vitest'
import { project, type Workspace } from '../src/taskbar.ts'

const workspaces: readonly Workspace[] = [
  { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1', 's2'] },
]

describe('project Settle', () => {
  it('puts a Settled Session on Settled as a slim row, not Active', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { settledAt: 50 } },
    })
    expect(view.shelves.settled).toEqual([
      {
        sessionId: 's1',
        workspaceTitle: 'alpha',
        sessionTitle: 'Fix login',
        identity: { monogram: 'AA', color: 'orange' },
        selected: false,
        slim: true,
        settledAt: 50,
      },
    ])
    expect(view.shelves.active).toEqual([])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
  })

  it('Settle outranks Pin so a Session with both is only on Settled', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { pin: 0, settledAt: 50 } },
    })
    expect(view.shelves.settled.map((card) => card.sessionId)).toEqual(['s1'])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.active).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
  })

  it('never places one Session on two Shelves', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 's2', title: 'Other', updatedAt: 1, running: false, blank: false },
      ],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { settledAt: 50, pin: 0 } },
    })
    expect(view.shelves.settled.map((card) => card.sessionId)).toEqual(['s1'])
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s2'])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
  })

  it('Unsettle returns the Session to Active at the top', () => {
    const view = project({
      sessions: [
        { id: 's2', title: 'Other', updatedAt: 1, running: false, blank: false },
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
      ],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { active: -1 } },
    })
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s1', 's2'])
    expect(view.shelves.settled).toEqual([])
    expect(view.shelves.pinned).toEqual([])
  })

  it('orders Settled newest first', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 's2', title: 'Other', updatedAt: 1, running: false, blank: false },
      ],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { settledAt: 50 }, s2: { settledAt: 100 } },
    })
    expect(view.shelves.settled.map((card) => card.sessionId)).toEqual(['s2', 's1'])
  })

  it('omits an Archived Session from Settled even when it had been Settled', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 'arch', title: 'Old work', updatedAt: 1, running: false, blank: false },
      ],
      workspaces: [
        { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1', 'arch'] },
      ],
      archivedSessionIds: ['arch'],
      ledger: { arch: { settledAt: 50 } },
    })
    expect(view.shelves.settled).toEqual([])
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s1'])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
  })

  it('settling does not remove the Session id from the Taskbar', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { settledAt: 50 } },
    })
    expect(view.shelves.settled.map((card) => card.sessionId)).toEqual(['s1'])
  })
})
