import { describe, expect, it } from 'vitest'
import { project, type Workspace } from '../src/taskbar.ts'

const workspaces: readonly Workspace[] = [
  { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1', 'drafty', 'unused', 'blank'] },
]

describe('project Unsent Draft', () => {
  it('places a non-current blank with a non-empty draft in the Unsent Draft block, not on a Shelf', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 'drafty', title: 'New', blank: true, updatedAt: 1, running: false },
      ],
      workspaces,
      archivedSessionIds: [],
      drafts: { drafty: 'please fix the login' },
    })
    expect(view.unsentDrafts).toEqual([
      {
        sessionId: 'drafty',
        workspaceTitle: 'alpha',
        sessionTitle: 'please fix the login',
        selected: false,
      },
    ])
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s1'])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('hides a non-current blank with an empty draft', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 'unused', title: 'New', blank: true, updatedAt: 1, running: false },
      ],
      workspaces,
      archivedSessionIds: [],
      drafts: { unused: '' },
    })
    expect(view.unsentDrafts).toEqual([])
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s1'])
  })

  it('keeps a current blank without draft on Active and out of the Unsent Draft block', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 'blank', title: 'New', blank: true, updatedAt: 1, running: false },
      ],
      workspaces,
      current: 'blank',
      archivedSessionIds: [],
    })
    expect(view.unsentDrafts).toEqual([])
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s1', 'blank'])
  })

  it('places a current blank with draft in the Unsent Draft block, not on a Shelf', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 'blank', title: 'New', blank: true, updatedAt: 1, running: false },
      ],
      workspaces,
      current: 'blank',
      archivedSessionIds: [],
      drafts: { blank: 'hello from the composer' },
    })
    expect(view.unsentDrafts).toEqual([
      {
        sessionId: 'blank',
        workspaceTitle: 'alpha',
        sessionTitle: 'hello from the composer',
        selected: true,
      },
    ])
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s1'])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('keeps a started Session with Unsent Draft on Active and marks the Card', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      drafts: { s1: 'follow up in the composer' },
    })
    expect(view.unsentDrafts).toEqual([])
    expect(view.shelves.active).toEqual([
      {
        sessionId: 's1',
        workspaceTitle: 'alpha',
        sessionTitle: 'Fix login',
        selected: false,
        unsentDraft: true,
      },
    ])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })
})
