import { describe, expect, it } from 'vitest'
import { project, type Session, type Workspace } from '../src/taskbar.ts'

const session = (partial: Partial<Session> & Pick<Session, 'id' | 'title'>): Session => ({
  updatedAt: 1,
  running: false,
  blank: false,
  ...partial,
})

const workspaces: readonly Workspace[] = [
  { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1', 's2'] },
]

describe('project with ledger', () => {
  it('puts a Pinned Session on Pinned, not Active', () => {
    const view = project({
      sessions: [session({ id: 's1', title: 'Fix login' })],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { pin: 0 } },
    })
    expect(view.shelves.pinned).toEqual([
      {
        sessionId: 's1',
        workspaceTitle: 'alpha',
        sessionTitle: 'Fix login',
        selected: false,
      },
    ])
    expect(view.shelves.active).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('never places one Session on two Shelves', () => {
    const view = project({
      sessions: [
        session({ id: 's1', title: 'Fix login' }),
        session({ id: 's2', title: 'Other' }),
      ],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { pin: 0 } },
    })
    expect(view.shelves.pinned.map((card) => card.sessionId)).toEqual(['s1'])
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s2'])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('orders Pinned by pin key, lowest first', () => {
    const view = project({
      sessions: [
        session({ id: 's1', title: 'Fix login' }),
        session({ id: 's2', title: 'Other' }),
      ],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { pin: 0 }, s2: { pin: -1 } },
    })
    expect(view.shelves.pinned.map((card) => card.sessionId)).toEqual(['s2', 's1'])
    expect(view.shelves.active).toEqual([])
  })
})
