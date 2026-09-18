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
}

export interface Card {
  sessionId: string
  workspaceTitle: string
  sessionTitle: string
  liveStatus?: LiveStatus
  selected: boolean
}

export interface ViewModel {
  shelves: Record<Shelf, Card[]>
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

function toCard(session: Session, workspaces: readonly Workspace[], current?: string): Card {
  const workspace = workspaceOf(session, workspaces)
  const liveStatus = liveStatusOf(session)
  return {
    sessionId: session.id,
    workspaceTitle: workspace?.title ?? '',
    sessionTitle: session.title,
    ...(liveStatus !== undefined ? { liveStatus } : {}),
    selected: session.id === current,
  }
}

export function project(input: ProjectInput): ViewModel {
  const archived = new Set(input.archivedSessionIds)
  const visible = input.sessions.filter((session) => {
    if (session.origin === 'subagent') return false
    if (archived.has(session.id)) return false
    if (session.blank && session.id !== input.current) return false
    return true
  })
  return {
    shelves: {
      pinned: [],
      active: visible.map((session) => toCard(session, input.workspaces, input.current)),
      snoozed: [],
      settled: [],
    },
  }
}
