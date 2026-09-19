import { describe, expect, it } from 'vitest'
import { project, type Ledger, type Workspace } from '../src/taskbar.ts'

const workspaces: readonly Workspace[] = [
  { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1'] },
  { id: 'w2', title: 'beta', path: '/apps/beta', sessionIds: ['s2'] },
]

describe('project Workspace filter', () => {
  it('keeps only the filtered Workspace Sessions and leaves the ledger untouched', () => {
    const ledger: Ledger = { s1: { pin: 0 }, s2: { pin: -1 } }
    const input = {
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 's2', title: 'Other', cwd: '/apps/beta', updatedAt: 2, running: false, blank: false },
      ],
      workspaces,
      archivedSessionIds: [] as const,
      ledger,
      workspaceFilter: 'w1',
    }
    const view = project(input)
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
    expect(ledger).toEqual({ s1: { pin: 0 }, s2: { pin: -1 } })

    const unfiltered = project({ ...input, workspaceFilter: undefined })
    expect(unfiltered.shelves.pinned.map((card) => card.sessionId)).toEqual(['s2', 's1'])
    expect(ledger).toEqual({ s1: { pin: 0 }, s2: { pin: -1 } })
  })
})
