import { describe, expect, it } from 'vitest'
import { project, type Session, type Workspace } from '../src/taskbar.ts'

const session = (partial: Partial<Session> & Pick<Session, 'id' | 'title'>): Session => ({
  updatedAt: 1,
  running: false,
  blank: false,
  ...partial,
})

const workspaces: readonly Workspace[] = [
  { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1'] },
]

describe('project', () => {
  it('places a started Session on Active with Workspace on the Card, not as a heading', () => {
    const view = project({
      sessions: [session({ id: 's1', title: 'Fix login' })],
      workspaces,
      archivedSessionIds: [],
    })
    expect(view.shelves.active).toEqual([
      {
        sessionId: 's1',
        workspaceTitle: 'alpha',
        sessionTitle: 'Fix login',
        selected: false,
      },
    ])
    expect(view.shelves.pinned).toEqual([])
    expect(view.shelves.snoozed).toEqual([])
    expect(view.shelves.settled).toEqual([])
  })

  it('marks pendingInteraction as waiting-for-me Live status on Active, not another Shelf', () => {
    const view = project({
      sessions: [session({ id: 's1', title: 'Fix login', pendingInteraction: 'approval' })],
      workspaces,
      archivedSessionIds: [],
    })
    expect(view.shelves.active).toEqual([
      {
        sessionId: 's1',
        workspaceTitle: 'alpha',
        sessionTitle: 'Fix login',
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
      sessions: [session({ id: 's1', title: 'Fix login', running: true })],
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
      sessions: [session({ id: 's1', title: 'Fix login', completed: true })],
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
      sessions: [session({
        id: 's1',
        title: 'Fix login',
        running: true,
        pendingInteraction: 'question',
      })],
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
        session({ id: 's1', title: 'Fix login' }),
        session({ id: 'kid', title: 'child', origin: 'subagent' }),
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
        session({ id: 's1', title: 'Fix login' }),
        session({ id: 'arch', title: 'Old work' }),
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
        session({ id: 's1', title: 'Fix login' }),
        session({ id: 'unused', title: 'New', blank: true }),
        session({ id: 'blank', title: 'New', blank: true }),
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
        session({ id: 's1', title: 'Fix login' }),
        session({ id: 's2', title: 'Other', cwd: '/apps/beta' }),
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
        selected: false,
      },
      {
        sessionId: 's2',
        workspaceTitle: 'beta',
        sessionTitle: 'Other',
        selected: true,
      },
    ])
  })

  it('puts Workspace title on the Card from the Session cwd when membership is missing', () => {
    const view = project({
      sessions: [session({ id: 's9', title: 'Solo', cwd: '/apps/alpha' })],
      workspaces,
      archivedSessionIds: [],
    })
    expect(view.shelves.active).toEqual([
      {
        sessionId: 's9',
        workspaceTitle: 'alpha',
        sessionTitle: 'Solo',
        selected: false,
      },
    ])
  })
})
