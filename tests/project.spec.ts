import { describe, expect, it } from 'vitest'
import { project, type Workspace } from '../src/taskbar.ts'

const workspaces: readonly Workspace[] = [
  { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1'] },
]

describe('project', () => {
  it('places a started Session on Active with Workspace on the Card, not as a heading', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
    })
    expect(view.shelves.active).toEqual([
      {
        sessionId: 's1',
        workspaceTitle: 'alpha',
        sessionTitle: 'Fix login',
        identity: { monogram: 'AA', color: 'orange' },
        selected: false,
      },
    ])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('marks waiting-for-me Live status on Active, not another Shelf', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', pendingInteraction: 'approval', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
    })
    expect(view.shelves.active).toEqual([
      {
        sessionId: 's1',
        workspaceTitle: 'alpha',
        sessionTitle: 'Fix login',
        identity: { monogram: 'AA', color: 'orange' },
        liveStatus: 'waiting-for-me',
        selected: false,
      },
    ])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('marks running as running Live status on Active', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', running: true, updatedAt: 1, blank: false }],
      workspaces,
      archivedSessionIds: [],
    })
    expect(view.shelves.active[0]?.liveStatus).toBe('running')
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('marks completed as done-unread Live status on Active', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', completed: true, updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
    })
    expect(view.shelves.active[0]?.liveStatus).toBe('done-unread')
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('lets waiting-for-me win over running when both could apply', () => {
    const view = project({
      sessions: [{
        id: 's1',
        title: 'Fix login',
        running: true,
        pendingInteraction: 'question',
        updatedAt: 1,
        blank: false,
      }],
      workspaces,
      archivedSessionIds: [],
    })
    expect(view.shelves.active[0]?.liveStatus).toBe('waiting-for-me')
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s1'])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('omits a subagent-origin Session from every Shelf', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 'kid', title: 'child', origin: 'subagent', updatedAt: 1, running: false, blank: false },
      ],
      workspaces,
      archivedSessionIds: [],
    })
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s1'])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('omits Archived Session ids from every Shelf', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 'arch', title: 'Old work', updatedAt: 1, running: false, blank: false },
      ],
      workspaces,
      archivedSessionIds: ['arch'],
    })
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s1'])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('hides a non-current empty blank and keeps the current blank on Active', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 'unused', title: 'New', blank: true, updatedAt: 1, running: false },
        { id: 'blank', title: 'New', blank: true, updatedAt: 1, running: false },
      ],
      workspaces,
      current: 'blank',
      archivedSessionIds: [],
    })
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s1', 'blank'])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('marks the current Session Card as selected', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 's2', title: 'Other', cwd: '/apps/beta', updatedAt: 1, running: false, blank: false },
      ],
      workspaces: [
        ...workspaces,
        { id: 'w2', title: 'beta', path: '/apps/beta', sessionIds: ['s2'] },
      ],
      current: 's2',
      archivedSessionIds: [],
    })
    expect(view.shelves.active).toEqual([
      {
        sessionId: 's1',
        workspaceTitle: 'alpha',
        sessionTitle: 'Fix login',
        identity: { monogram: 'AA', color: 'orange' },
        selected: false,
      },
      {
        sessionId: 's2',
        workspaceTitle: 'beta',
        sessionTitle: 'Other',
        identity: { monogram: 'BA', color: 'pink' },
        selected: true,
      },
    ])
  })

  it('orders Active by recency, newest first', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Older', updatedAt: 10, running: false, blank: false },
        { id: 's2', title: 'Newer', updatedAt: 20, cwd: '/apps/alpha', running: false, blank: false },
      ],
      workspaces: [
        { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1', 's2'] },
      ],
      archivedSessionIds: [],
    })
    expect(view.shelves.active.map((card) => card.sessionId)).toEqual(['s2', 's1'])
  })
})
