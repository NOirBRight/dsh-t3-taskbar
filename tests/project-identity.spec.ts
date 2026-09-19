import { describe, expect, it } from 'vitest'
import { project, type Workspace } from '../src/taskbar.ts'

const workspaces: readonly Workspace[] = [
  { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1'] },
]

describe('project Workspace Identity', () => {
  it('puts identity on the Card from the Workspace title', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
    })
    expect(view.shelves.active[0]?.identity).toEqual({ monogram: 'AA', color: 'orange' })
  })

  it('gives the same Workspace title the same mark on every Card', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false },
        { id: 's2', title: 'Other', updatedAt: 2, running: false, blank: false },
      ],
      workspaces: [
        { id: 'w1', title: 'Nebula', path: '/apps/a', sessionIds: ['s1'] },
        { id: 'w2', title: '  NEBULA  ', path: '/apps/b', sessionIds: ['s2'] },
      ],
      archivedSessionIds: [],
    })
    expect(view.shelves.active.map((card) => card.identity)).toEqual([
      { monogram: 'NA', color: 'red' },
      { monogram: 'NA', color: 'red' },
    ])
  })

  it('uses PR for an empty or mark-less Workspace title', () => {
    const view = project({
      sessions: [
        { id: 's1', title: 'Fix login', updatedAt: 2, running: false, blank: false },
        { id: 's2', title: 'Other', cwd: '/apps/dash', updatedAt: 1, running: false, blank: false },
      ],
      workspaces: [
        { id: 'w1', title: '', path: '/apps/alpha', sessionIds: ['s1'] },
        { id: 'w2', title: '---', path: '/apps/dash', sessionIds: ['s2'] },
      ],
      archivedSessionIds: [],
    })
    expect(view.shelves.active[0]?.identity).toEqual({ monogram: 'PR', color: 'fuchsia' })
    expect(view.shelves.active[1]?.identity).toEqual({ monogram: 'PR', color: 'cyan' })
  })

  it('derives monograms from first word, last word, and digits', () => {
    const named = [
      ['Silver Orchard', 'SO', 'sky'],
      ['Quiet Lantern Workshop', 'QW', 'amber'],
      ['m7forge', 'M7', 'blue'],
      ['M7 Forge', 'M7', 'emerald'],
      ['X', 'XX', 'indigo'],
    ] as const
    for (const [title, monogram, color] of named) {
      const view = project({
        sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
        workspaces: [{ id: 'w1', title, path: '/apps/alpha', sessionIds: ['s1'] }],
        archivedSessionIds: [],
      })
      expect(view.shelves.active[0]?.identity).toEqual({ monogram, color })
    }
  })
})

const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

describe('project Live status XOR relative time', () => {
  it('omits relativeTime when Live status is set even if now is provided', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', running: true, updatedAt: 1, blank: false }],
      workspaces,
      archivedSessionIds: [],
      now: 10 * HOUR,
    })
    expect(view.shelves.active[0]?.liveStatus).toBe('running')
    expect(view.shelves.active[0]?.relativeTime).toBeUndefined()
  })

  it('sets relativeTime from updatedAt when now is provided and Live status is not', () => {
    const now = 400 * DAY
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: now - 5 * MIN, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      now,
    })
    expect(view.shelves.active[0]?.liveStatus).toBeUndefined()
    expect(view.shelves.active[0]?.relativeTime).toEqual({ unit: 'minutes', n: 5 })
  })

  it('omits relativeTime when now is missing', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
    })
    expect(view.shelves.active[0]?.relativeTime).toBeUndefined()
    expect(view.shelves.active[0]?.liveStatus).toBeUndefined()
  })

  it('buckets relative time as now, minutes, hours, days, months, and years', () => {
    const now = 400 * DAY
    const cases = [
      [now - 10_000, { unit: 'now', n: 0 }],
      [now - 5 * MIN, { unit: 'minutes', n: 5 }],
      [now - 3 * HOUR, { unit: 'hours', n: 3 }],
      [now - 2 * DAY, { unit: 'days', n: 2 }],
      [now - 4 * 30 * DAY, { unit: 'months', n: 4 }],
      [now - 400 * DAY, { unit: 'years', n: 1 }],
    ] as const
    for (const [updatedAt, relativeTime] of cases) {
      const view = project({
        sessions: [{ id: 's1', title: 'Fix login', updatedAt, running: false, blank: false }],
        workspaces,
        archivedSessionIds: [],
        now,
      })
      expect(view.shelves.active[0]?.relativeTime).toEqual(relativeTime)
      expect(view.shelves.active[0]?.liveStatus).toBeUndefined()
    }
  })
})

describe('project Card marks and Settled date', () => {
  it('omits marks when none are supplied', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
    })
    expect(view.shelves.active[0]?.marks).toBeUndefined()
  })

  it('puts settledAt on a Settled slim Card', () => {
    const view = project({
      sessions: [{ id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }],
      workspaces,
      archivedSessionIds: [],
      ledger: { s1: { settledAt: 50 } },
    })
    expect(view.shelves.settled[0]?.settledAt).toBe(50)
    expect(view.shelves.settled[0]?.slim).toBe(true)
  })
})
