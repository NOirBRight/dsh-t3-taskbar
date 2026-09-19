import { describe, expect, it } from 'vitest'
import { project, type Workspace } from '../src/taskbar.ts'

const workspaces: readonly Workspace[] = [
  { id: 'w1', title: 'alpha', path: '/apps/alpha', sessionIds: ['s1'] },
]

const session = { id: 's1', title: 'Fix login', updatedAt: 1, running: false, blank: false }

describe('project runtime marks', () => {
  it('keeps git branch and omits runtime when acpPresent is false', () => {
    const view = project({
      sessions: [session],
      workspaces,
      archivedSessionIds: [],
      acpPresent: false,
      providers: { s1: 'cursor-agent' },
      gitMarks: { s1: { branch: 'feat/inbox' } },
    })
    expect(view.shelves.active[0]?.marks).toEqual({ branch: 'feat/inbox' })
    expect(view.shelves.active[0]?.marks?.runtime).toBeUndefined()
  })

  it('maps cursor-agent to runtime cursor when acpPresent is true', () => {
    const view = project({
      sessions: [session],
      workspaces,
      archivedSessionIds: [],
      acpPresent: true,
      providers: { s1: 'cursor-agent' },
    })
    expect(view.shelves.active[0]?.marks).toEqual({ runtime: 'cursor' })
  })

  it('omits runtime when acpPresent is true but the Session has no provider', () => {
    const view = project({
      sessions: [session],
      workspaces,
      archivedSessionIds: [],
      acpPresent: true,
      gitMarks: { s1: { branch: 'feat/inbox' } },
    })
    expect(view.shelves.active[0]?.marks).toEqual({ branch: 'feat/inbox' })
    expect(view.shelves.active[0]?.marks?.runtime).toBeUndefined()
  })

  it('maps grok to dsh and keeps git marks beside it', () => {
    const view = project({
      sessions: [session],
      workspaces,
      archivedSessionIds: [],
      acpPresent: true,
      providers: { s1: 'grok' },
      gitMarks: { s1: { branch: 'feat/inbox', pr: '#12' } },
    })
    expect(view.shelves.active[0]?.marks).toEqual({ branch: 'feat/inbox', pr: '#12', runtime: 'dsh' })
  })

  it('maps antigravity catalog ids to agy and other providers to dsh', () => {
    const mapped = [
      ['antigravity', 'agy'],
      ['antigravity:work', 'agy'],
      ['google-antigravity', 'agy'],
      ['cursor-agent:home', 'cursor'],
      ['deepseek', 'dsh'],
      ['codex', 'dsh'],
      ['openai', 'dsh'],
      ['', 'dsh'],
    ] as const
    for (const [provider, runtime] of mapped) {
      const view = project({
        sessions: [session],
        workspaces,
        archivedSessionIds: [],
        acpPresent: true,
        providers: { s1: provider },
      })
      expect(view.shelves.active[0]?.marks).toEqual({ runtime })
    }
  })

  it('omits runtime when acpPresent is missing even if providers are supplied', () => {
    const view = project({
      sessions: [session],
      workspaces,
      archivedSessionIds: [],
      providers: { s1: 'antigravity' },
    })
    expect(view.shelves.active[0]?.marks).toBeUndefined()
  })
})
