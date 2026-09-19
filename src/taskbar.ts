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
  /** Browser-local Workspace id. When set, Sessions outside that Workspace are omitted. Not a ledger field. */
  workspaceFilter?: string
}

export interface Card {
  sessionId: string
  workspaceTitle: string
  sessionTitle: string
  liveStatus?: LiveStatus
  selected: boolean
  unsentDraft?: true
  slim?: true
  wakeAt?: number
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
  | { readonly type: 'Settle'; readonly sessionId: string; readonly at: number }
  | { readonly type: 'Unsettle'; readonly sessionId: string }
  | { readonly type: 'Snooze'; readonly sessionId: string; readonly until: number; readonly pendingInteraction?: PendingKind }
  | { readonly type: 'Wake'; readonly sessionId: string }
  | { readonly type: 'Drop'; readonly sessionId: string; readonly dest: 'pinned' | 'active' | 'settled'; readonly index: number; readonly at?: number; readonly now?: number; readonly shelfIds?: readonly string[] }
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

function orderKeyAt(ledger: Ledger, field: 'pin' | 'active', sessionId: string, index: number): number {
  const keys: number[] = []
  for (const [id, entry] of Object.entries(ledger)) {
    if (id === sessionId) continue
    const key = entry[field]
    if (key === undefined) continue
    keys.push(key)
  }
  keys.sort((a, b) => a - b)
  if (keys.length === 0 || index <= 0) return keys.length === 0 ? 0 : keys[0]! - 1
  if (index >= keys.length) return keys[keys.length - 1]! + 1
  return (keys[index - 1]! + keys[index]!) / 2
}

/** Snooze (ticket 04) must clear pin keys the same way — wake is always Active. */
function withoutPin(entry: LedgerEntry): LedgerEntry | undefined {
  const next: { active?: number; settledAt?: number; snoozedUntil?: number } = {}
  if (entry.active !== undefined) next.active = entry.active
  if (entry.settledAt !== undefined) next.settledAt = entry.settledAt
  if (entry.snoozedUntil !== undefined) next.snoozedUntil = entry.snoozedUntil
  return Object.keys(next).length === 0 ? undefined : next
}

function placeOnShelf(
  ledger: Ledger,
  sessionId: string,
  field: 'pin' | 'active',
  index: number,
  shelfIds: readonly string[] | undefined,
): Ledger {
  if (shelfIds === undefined) {
    return write(ledger, sessionId, { [field]: orderKeyAt(ledger, field, sessionId, index) })
  }
  const others = shelfIds.filter((id) => id !== sessionId)
  const at = Math.max(0, Math.min(index, others.length))
  const order = [...others.slice(0, at), sessionId, ...others.slice(at)]
  const next: Record<string, LedgerEntry> = { ...ledger }
  for (let i = 0; i < order.length; i++) {
    next[order[i]!] = { [field]: i }
  }
  return next
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
  if (command.type === 'Settle') {
    return write(ledger, command.sessionId, { settledAt: command.at })
  }
  if (command.type === 'Unsettle') {
    return parkOnActive(ledger, command.sessionId)
  }
  if (command.type === 'Snooze') {
    if (command.pendingInteraction !== undefined) return ledger
    return write(ledger, command.sessionId, { snoozedUntil: command.until })
  }
  if (command.type === 'Wake') {
    return parkOnActive(ledger, command.sessionId)
  }
  if (command.type === 'Drop') {
    if (command.dest === 'pinned') {
      return placeOnShelf(ledger, command.sessionId, 'pin', command.index, command.shelfIds)
    }
    if (command.dest === 'active') {
      return placeOnShelf(ledger, command.sessionId, 'active', command.index, command.shelfIds)
    }
    if (command.dest === 'settled') {
      const entry = ledger[command.sessionId]
      if (entry?.settledAt !== undefined) return ledger
      const until = entry?.snoozedUntil
      if (until !== undefined && (command.now === undefined || until > command.now)) return ledger
      if (command.at === undefined) return ledger
      return write(ledger, command.sessionId, { settledAt: command.at })
    }
    return ledger
  }
  const living = new Set(command.livingIds)
  const next: Record<string, LedgerEntry> = {}
  for (const [id, entry] of Object.entries(ledger)) {
    if (living.has(id)) next[id] = entry
  }
  return next
}

function byOrderThenRecency(
  field: 'pin' | 'active',
  ledger: Ledger,
  recency: Map<string, number>,
): (a: Card, b: Card) => number {
  return (a, b) => {
    const left = ledger[a.sessionId]?.[field]
    const right = ledger[b.sessionId]?.[field]
    if (left !== undefined && right !== undefined) return left - right
    if (left !== undefined) return -1
    if (right !== undefined) return 1
    return (recency.get(b.sessionId) ?? 0) - (recency.get(a.sessionId) ?? 0)
  }
}

function parkOnActive(ledger: Ledger, sessionId: string): Ledger {
  return write(ledger, sessionId, { active: nextOrderKey(ledger, 'active') })
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
  opts?: { preview?: string, unsentDraft?: true, slim?: true, wakeAt?: number },
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
    ...(opts?.slim === true ? { slim: true } : {}),
    ...(opts?.wakeAt !== undefined ? { wakeAt: opts.wakeAt } : {}),
  }
}

export function project(input: ProjectInput): ViewModel {
  const archived = new Set(input.archivedSessionIds)
  const listed = input.sessions.filter((session) => {
    if (session.origin === 'subagent') return false
    if (archived.has(session.id)) return false
    if (input.workspaceFilter !== undefined && workspaceOf(session, input.workspaces)?.id !== input.workspaceFilter) {
      return false
    }
    return true
  })
  const ledger = input.ledger ?? {}
  const now = input.now
  const recency = new Map(listed.map((session) => [session.id, session.updatedAt]))
  const unsentDrafts: Card[] = []
  const pinned: Card[] = []
  const active: Card[] = []
  const snoozed: Card[] = []
  const settled: Card[] = []
  for (const session of listed) {
    const draft = draftOf(input, session.id)
    if (session.blank) {
      if (draft !== '') {
        unsentDrafts.push(toCard(session, input.workspaces, input.current, { preview: draft }))
        continue
      }
      if (session.id !== input.current) continue
    }
    const entry = ledger[session.id]
    const until = entry?.snoozedUntil
    const onSnoozed = until !== undefined && now !== undefined && until > now
    const onSettled = !onSnoozed && entry?.settledAt !== undefined
    const card = toCard(
      session,
      input.workspaces,
      input.current,
      {
        ...(draft !== '' ? { unsentDraft: true as const } : {}),
        ...(onSnoozed || onSettled ? { slim: true as const } : {}),
        ...(onSnoozed && until !== undefined ? { wakeAt: until } : {}),
      },
    )
    if (onSnoozed) snoozed.push(card)
    else if (onSettled) settled.push(card)
    else if (entry?.pin !== undefined) pinned.push(card)
    else active.push(card)
  }
  pinned.sort(byOrderThenRecency('pin', ledger, recency))
  snoozed.sort((a, b) => (ledger[a.sessionId]?.snoozedUntil ?? 0) - (ledger[b.sessionId]?.snoozedUntil ?? 0))
  settled.sort((a, b) => (ledger[b.sessionId]?.settledAt ?? 0) - (ledger[a.sessionId]?.settledAt ?? 0))
  active.sort(byOrderThenRecency('active', ledger, recency))
  return {
    unsentDrafts,
    shelves: {
      pinned,
      active,
      snoozed,
      settled,
    },
  }
}
