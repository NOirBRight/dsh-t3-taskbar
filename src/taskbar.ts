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
  drafts?: Readonly<Record<string, string>>
  now?: number
}

export interface Card {
  sessionId: string
  workspaceTitle: string
  sessionTitle: string
  liveStatus?: LiveStatus
  selected: boolean
  unsentDraft?: true
  slim?: true
}

export interface ViewModel {
  shelves: Record<Shelf, Card[]>
  unsentDrafts: Card[]
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
  | { readonly type: 'Snooze'; readonly sessionId: string; readonly until: number; readonly pendingInteraction?: PendingKind }
  | { readonly type: 'Wake'; readonly sessionId: string }
  | { readonly type: 'Gc'; readonly livingIds: readonly string[] }

function nextOrderKey(ledger: Ledger, field: 'pin' | 'active'): number {
  let min: number | undefined
  for (const entry of Object.values(ledger)) {
    const key = entry[field]
    if (key === undefined) continue
    if (min === undefined || key < min) min = key
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
    return write(ledger, command.sessionId, { pin: nextOrderKey(ledger, 'pin') })
  }
  if (command.type === 'Unpin') {
    const entry = ledger[command.sessionId]
    if (entry === undefined) return ledger
    return write(ledger, command.sessionId, withoutPin(entry))
  }
  if (command.type === 'Snooze') {
    if (command.pendingInteraction !== undefined) return ledger
    return write(ledger, command.sessionId, { snoozedUntil: command.until })
  }
  if (command.type === 'Wake') {
    return write(ledger, command.sessionId, { active: nextOrderKey(ledger, 'active') })
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
  const ledger = input.ledger ?? {}
  const now = input.now
  const unsentDrafts: Card[] = []
  const pinned: Card[] = []
  const active: Card[] = []
  const snoozed: Card[] = []
  for (const session of listed) {
    const draft = draftOf(input, session.id)
    if (session.blank) {
      if (draft !== '') {
        unsentDrafts.push(toCard(session, input.workspaces, input.current, { preview: draft }))
        continue
      }
      if (session.id !== input.current) continue
    }
    const card = toCard(
      session,
      input.workspaces,
      input.current,
      draft !== '' ? { unsentDraft: true } : undefined,
    )
    const until = ledger[session.id]?.snoozedUntil
    if (until !== undefined && now !== undefined && until > now) {
      snoozed.push({ ...card, slim: true })
      continue
    }
    if (ledger[session.id]?.pin !== undefined) pinned.push(card)
    else active.push(card)
  }
  pinned.sort((a, b) => (ledger[a.sessionId]?.pin ?? 0) - (ledger[b.sessionId]?.pin ?? 0))
  snoozed.sort((a, b) => (ledger[a.sessionId]?.snoozedUntil ?? 0) - (ledger[b.sessionId]?.snoozedUntil ?? 0))
  active.sort((a, b) => {
    const left = ledger[a.sessionId]?.active
    const right = ledger[b.sessionId]?.active
    if (left !== undefined && right !== undefined) return left - right
    if (left !== undefined) return -1
    if (right !== undefined) return 1
    return 0
  })
  return {
    unsentDrafts,
    shelves: {
      pinned,
      active,
      snoozed,
      settled: [],
    },
  }
}
