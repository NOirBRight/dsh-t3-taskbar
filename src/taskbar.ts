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
  ledger?: Ledger
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

/** Overlay facts per Session. Absence of a record means Active with recency order. */
export interface LedgerEntry {
  readonly pin?: number
  readonly active?: number
  readonly settledAt?: number
  readonly snoozedUntil?: number
}

export type Ledger = Readonly<Record<string, LedgerEntry>>

export type Command =
  | { readonly type: 'Pin'; readonly sessionId: string }
  | { readonly type: 'Unpin'; readonly sessionId: string }
  | { readonly type: 'Gc'; readonly livingIds: readonly string[] }

function nextPinKey(ledger: Ledger): number {
  let min: number | undefined
  for (const entry of Object.values(ledger)) {
    if (entry.pin === undefined) continue
    if (min === undefined || entry.pin < min) min = entry.pin
  }
  return min === undefined ? 0 : min - 1
}

/** Snooze (ticket 04) must clear pin keys the same way — wake is always Active. */
function withoutPin(entry: LedgerEntry): LedgerEntry | undefined {
  const next: { active?: number; settledAt?: number; snoozedUntil?: number } = {}
  if (entry.active !== undefined) next.active = entry.active
  if (entry.settledAt !== undefined) next.settledAt = entry.settledAt
  if (entry.snoozedUntil !== undefined) next.snoozedUntil = entry.snoozedUntil
  return Object.keys(next).length === 0 ? undefined : next
}

function write(ledger: Ledger, sessionId: string, entry: LedgerEntry | undefined): Ledger {
  const next = { ...ledger }
  if (entry === undefined) delete next[sessionId]
  else next[sessionId] = entry
  return next
}

export function apply(ledger: Ledger, command: Command): Ledger {
  if (command.type === 'Pin') {
    return write(ledger, command.sessionId, { pin: nextPinKey(ledger) })
  }
  if (command.type === 'Unpin') {
    const entry = ledger[command.sessionId]
    if (entry === undefined) return ledger
    return write(ledger, command.sessionId, withoutPin(entry))
  }
  const living = new Set(command.livingIds)
  const next: Record<string, LedgerEntry> = {}
  for (const [id, entry] of Object.entries(ledger)) {
    if (living.has(id)) next[id] = entry
  }
  return next
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
  const ledger = input.ledger ?? {}
  const pinned: Card[] = []
  const active: Card[] = []
  for (const session of visible) {
    const card = toCard(session, input.workspaces, input.current)
    if (ledger[session.id]?.pin !== undefined) pinned.push(card)
    else active.push(card)
  }
  pinned.sort((a, b) => (ledger[a.sessionId]?.pin ?? 0) - (ledger[b.sessionId]?.pin ?? 0))
  return {
    shelves: {
      pinned,
      active,
      snoozed: [],
      settled: [],
    },
  }
}
