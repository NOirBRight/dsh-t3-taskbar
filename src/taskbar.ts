/** Pure Taskbar projection. No React, no RPC, no localStorage. */

export type Shelf = 'pinned' | 'active' | 'snoozed' | 'settled'

export type LiveStatus = 'waiting-for-me' | 'running' | 'done-unread'

export type PendingKind = 'approval' | 'plan-review' | 'question'

export interface Session {
  id: string
  title: string
  cwd?: string
  updatedAt: number
  running: boolean
  blank: boolean
  origin?: 'subagent'
  pendingInteraction?: PendingKind
  completed?: boolean
}

export interface Workspace {
  id: string
  title: string
  path: string
  sessionIds: readonly string[]
}

export interface ProjectInput {
  sessions: readonly Session[]
  workspaces: readonly Workspace[]
  current?: string
  archivedSessionIds: readonly string[]
  drafts?: Readonly<Record<string, string>>
}

export interface Card {
  sessionId: string
  workspaceTitle: string
  sessionTitle: string
  liveStatus?: LiveStatus
  selected: boolean
  unsentDraft?: true
}

export interface ViewModel {
  shelves: Record<Shelf, Card[]>
  unsentDrafts: Card[]
}

function workspaceOf(session: Session, workspaces: readonly Workspace[]): Workspace | undefined {
  const byAccount = workspaces.find((workspace) => workspace.sessionIds.includes(session.id))
  if (byAccount) return byAccount
  const cwd = session.cwd
  if (cwd === undefined) return undefined
  return workspaces.find((workspace) => cwd === workspace.path || cwd.startsWith(`${workspace.path}/`))
}

function liveStatusOf(session: Session): LiveStatus | undefined {
  if (session.pendingInteraction) return 'waiting-for-me'
  if (session.running) return 'running'
  if (session.completed) return 'done-unread'
  return undefined
}

function draftOf(input: ProjectInput, sessionId: string): string {
  const text = input.drafts?.[sessionId]
  return text !== undefined && text !== '' ? text : ''
}

function toCard(
  session: Session,
  workspaces: readonly Workspace[],
  current: string | undefined,
  opts?: { preview?: string, unsentDraft?: true },
): Card {
  const workspace = workspaceOf(session, workspaces)
  const liveStatus = liveStatusOf(session)
  return {
    sessionId: session.id,
    workspaceTitle: workspace?.title ?? '',
    sessionTitle: opts?.preview ?? session.title,
    ...(liveStatus !== undefined ? { liveStatus } : {}),
    selected: session.id === current,
    ...(opts?.unsentDraft === true ? { unsentDraft: true } : {}),
  }
}

export function project(input: ProjectInput): ViewModel {
  const archived = new Set(input.archivedSessionIds)
  const listed = input.sessions.filter((session) => {
    if (session.origin === 'subagent') return false
    if (archived.has(session.id)) return false
    return true
  })
  const unsentDrafts: Card[] = []
  const active: Card[] = []
  for (const session of listed) {
    const draft = draftOf(input, session.id)
    if (session.blank) {
      if (draft !== '') {
        unsentDrafts.push(toCard(session, input.workspaces, input.current, { preview: draft }))
        continue
      }
      if (session.id !== input.current) continue
    }
    active.push(toCard(session, input.workspaces, input.current, draft !== '' ? { unsentDraft: true } : undefined))
  }
  return {
    unsentDrafts,
    shelves: {
      pinned: [],
      active,
      snoozed: [],
      settled: [],
    },
  }
}
