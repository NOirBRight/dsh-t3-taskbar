import { describe, expect, it } from 'vitest'
import { project, type Workspace } from '../src/taskbar.ts'

const workspaces: readonly Workspace[] = [
  { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1'] },
]

describe('project git marks', () => {
  it('copies branch from gitMarks onto the Active Card and omits other git keys', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      gitMarks: { s1: { branch: 'feat/inbox' } },
    })
    expect(view.shelves.active[0]?.marks).toEqual({ branch: 'feat/inbox' })
    expect(view.shelves.active[0]?.marks?.worktree).toBeUndefined()
    expect(view.shelves.active[0]?.marks?.pr).toBeUndefined()
  })

  it('copies a worktree mark only when gitMarks provides one', () => {
    const linked = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      gitMarks: { s1: { branch: 'feat/inbox', worktree: 'true' } },
    })
    expect(linked.shelves.active[0]?.marks).toEqual({ branch: 'feat/inbox', worktree: 'true' })

    const pathMark = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      gitMarks: { s1: { worktree: '/apps/alpha-feat' } },
    })
    expect(pathMark.shelves.active[0]?.marks).toEqual({ worktree: '/apps/alpha-feat' })

    const main = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      gitMarks: { s1: { branch: 'main' } },
    })
    expect(main.shelves.active[0]?.marks).toEqual({ branch: 'main' })
    expect(main.shelves.active[0]?.marks?.worktree).toBeUndefined()
  })

  it('puts pr on a Settled slim Card', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { settledAt: 50 } },
      gitMarks: { s1: { pr: '#12' } },
    })
    expect(view.shelves.settled[0]?.slim).toBe(true)
    expect(view.shelves.settled[0]?.marks).toEqual({ pr: '#12' })
  })

  it('omits marks when gitMarks is missing or empty', () => {
    const missing = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
    })
    expect(missing.shelves.active[0]?.marks).toBeUndefined()

    const empty = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      gitMarks: { s1: {} },
    })
    expect(empty.shelves.active[0]?.marks).toBeUndefined()
  })

  it('does not copy runtime from gitMarks', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      gitMarks: { s1: { branch: 'feat/inbox', runtime: 'dsh' } },
    })
    expect(view.shelves.active[0]?.marks).toEqual({ branch: 'feat/inbox' })
  })
})
