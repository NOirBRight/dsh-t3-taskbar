import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type DragEvent as ReactDragEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { WorkspaceBrowserProps } from '@deepseek-ai/dsh-client-ui-workspace/client'
import { project, type Card, type CardMarks, type Command, type RelativeTime, type Session, type Shelf, type ViewModel } from '../taskbar.ts'
import { dropCommand, dropVerbOf, type DropDest, type DropHint } from './drop.ts'
import { discardDraft, draftsSnapshot, EMPTY_DRAFTS, subscribeDrafts } from './drafts.ts'
import { AddWorkspaceIcon, AgyRuntimeIcon, CursorRuntimeIcon, DshRuntimeIcon, NewSessionIcon, PenIcon, SearchIcon } from './icons.tsx'
import { applyLedger, loadGitMarks, loadLedger } from './ledger.ts'
import { EMPTY_LEDGER } from '../ledger-json.ts'
import { matchingIds } from './search.ts'
import type { TaskbarKey } from './locales.ts'
import { formatWake, HOUR_MS, laterToday18, toDatetimeLocal, tomorrow09 } from './snooze-time.ts'

type Props = Omit<WorkspaceBrowserProps, 't'> & { t: (key: TaskbarKey) => string; acpPresent?: boolean }

const SEARCH_DEBOUNCE_MS = 250
const NOW_TICK_MS = 1000

function formatRelative(time: RelativeTime, t: Props['t']): string {
  if (time.unit === 'now') return t('time.now')
  const key = `time.${time.unit}` as const
  return t(key).replace('{n}', String(time.n))
}

function formatSettled(at: number, t: Props['t']): string {
  const d = new Date(at)
  return t('date.ymd')
    .replace('{y}', String(d.getFullYear()))
    .replace('{m}', String(d.getMonth() + 1))
    .replace('{d}', String(d.getDate()))
}

function lineOneMeta(card: Card, t: Props['t']): string {
  if (card.liveStatus !== undefined) return t(`live.${card.liveStatus}`)
  if (card.relativeTime !== undefined) return formatRelative(card.relativeTime, t)
  return ''
}

function gitMarksText(card: Card): string {
  const marks = card.marks
  if (marks === undefined) return ''
  const worktree = marks.worktree === undefined || marks.worktree === ''
    ? undefined
    : marks.worktree === 'true' ? 'worktree' : marks.worktree
  return [marks.branch, worktree, marks.pr].filter((part) => part !== undefined && part !== '').join(' · ')
}

function RuntimeMark({ runtime, t }: { runtime: NonNullable<CardMarks['runtime']>; t: Props['t'] }) {
  const icon = runtime === 'agy'
    ? <AgyRuntimeIcon />
    : runtime === 'cursor'
      ? <CursorRuntimeIcon />
      : <DshRuntimeIcon />
  return (
    <span className="dsht3-runtime">
      {icon}
      {t(`runtime.${runtime}`)}
    </span>
  )
}

function providerOf(session: unknown): string | undefined {
  if (session === undefined || session === null || typeof session !== 'object') return undefined
  const values = (session as { projectionValues?: unknown }).projectionValues
  if (values === undefined || values === null || typeof values !== 'object') return undefined
  const selection = (values as { modelSelection?: unknown }).modelSelection
  if (selection === undefined || selection === null || typeof selection !== 'object') return undefined
  const rec = selection as { next?: unknown; lastUsed?: unknown }
  for (const candidate of [rec.next, rec.lastUsed]) {
    if (candidate === undefined || candidate === null || typeof candidate !== 'object') continue
    const provider = (candidate as { provider?: unknown }).provider
    if (typeof provider === 'string') return provider
  }
  return undefined
}

function providersOf(list: { ids: readonly string[]; byId: Record<string, unknown> }): Readonly<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const id of list.ids) {
    const provider = providerOf(list.byId[id])
    if (provider !== undefined) out[id] = provider
  }
  return out
}

function IdentityMark({ card }: { card: Card }) {
  return (
    <span className="dsht3-ident" data-color={card.identity.color} aria-hidden="true">{card.identity.monogram}</span>
  )
}

function toSession(id: string, session: {
  displayTitle: string
  cwd?: string | undefined
  updatedAt: number
  running: boolean
  blank: boolean
  origin?: 'subagent' | undefined
  pendingInteraction?: Session['pendingInteraction'] | undefined
  completed?: boolean | undefined
}): Session {
  const row: Session = {
    id,
    title: session.displayTitle,
    updatedAt: session.updatedAt,
    running: session.running,
    blank: session.blank,
  }
  if (session.cwd !== undefined) row.cwd = session.cwd
  if (session.origin !== undefined) row.origin = session.origin
  if (session.pendingInteraction !== undefined) row.pendingInteraction = session.pendingInteraction
  if (session.completed !== undefined) row.completed = session.completed
  return row
}

function shelfCards(view: ViewModel): Card[] {
  return [...view.shelves.pinned, ...view.shelves.active, ...view.shelves.snoozed, ...view.shelves.settled]
}

export function Taskbar(props: Props) {
  const {
    wide,
    expandSidebar,
    useSessions,
    useWorkspaces,
    open,
    startSession,
    renameSession,
    forkSession,
    archiveSession,
    createWorkspace,
    searchSessions,
    useDirectoryFlow,
    renameWorkspace,
    renderSlot,
    t,
    acpPresent = false,
  } = props

  const list = useSessions((state) => state)
  const workspaces = useWorkspaces((state) => state)
  const directoryFlowAvailable = useDirectoryFlow((occupied) => occupied)
  const [ledger, setLedger] = useState(() => ({ revision: 0, records: {} as typeof EMPTY_LEDGER.records }))
  const [gitMarks, setGitMarks] = useState<Readonly<Record<string, CardMarks>>>({})
  const sessionIds = list.ids
  const drafts = useSyncExternalStore(
    subscribeDrafts,
    () => draftsSnapshot(sessionIds),
    () => EMPTY_DRAFTS,
  )
  const [query, setQuery] = useState('')
  const [workspaceFilter, setWorkspaceFilter] = useState<string>()
  const [hostHits, setHostHits] = useState<readonly { sessionId: string; snippet: string }[]>([])
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [snoozePanel, setSnoozePanel] = useState(false)
  const [customUntil, setCustomUntil] = useState('')
  const [snoozedOpen, setSnoozedOpen] = useState(true)
  const [settledOpen, setSettledOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [flowOpen, setFlowOpen] = useState(false)
  const [flowBusy, setFlowBusy] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<DropHint | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), NOW_TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  const livingIdsKey = useMemo(
    () => list.ids.filter((id) => !workspaces.archivedSessionIds.includes(id)).join('\0'),
    [list.ids, workspaces.archivedSessionIds],
  )

  useEffect(() => {
    if (list.phase !== 'ready') return
    let cancelled = false
    const ids = livingIdsKey === '' ? [] : livingIdsKey.split('\0')
    void loadLedger().then(async (loaded) => {
      if (cancelled) return
      const next = await applyLedger({ type: 'Gc', livingIds: ids }, loaded.revision)
      if (cancelled) return
      const chosen = next ?? loaded
      setLedger((was) => was.revision === chosen.revision ? was : chosen)
    })
    return () => { cancelled = true }
  }, [livingIdsKey, list.phase])

  const projectWorkspaces = workspaces.items.map((workspace) => ({
    id: workspace.workspaceId,
    title: workspace.title,
    path: workspace.path,
    sessionIds: workspace.sessionIds,
  }))

  const probeKey = useMemo(() => {
    const rows: string[] = []
    for (const id of list.ids) {
      const session = list.byId[id]
      if (session === undefined) continue
      const workspace = workspaces.items.find((item) => item.sessionIds.includes(id))
      const path = session.cwd !== undefined && session.cwd !== '' ? session.cwd : workspace?.path
      if (path === undefined || path === '') continue
      rows.push(`${id}\0${path}`)
    }
    return rows.join('\n')
  }, [list, workspaces])

  useEffect(() => {
    if (list.phase !== 'ready') return
    let cancelled = false
    const sessions = probeKey === '' ? [] : probeKey.split('\n').flatMap((row) => {
      const split = row.indexOf('\0')
      if (split <= 0) return []
      return [{ id: row.slice(0, split), path: row.slice(split + 1) }]
    })
    const load = () => {
      void loadGitMarks(sessions).then((marks) => {
        if (!cancelled) setGitMarks(marks)
      })
    }
    load()
    const timer = window.setInterval(load, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [probeKey, list.phase])

  const showWorkspaceFilter = workspaces.items.length > 1
  const filterId = showWorkspaceFilter
    && workspaceFilter !== undefined
    && workspaces.items.some((workspace) => workspace.workspaceId === workspaceFilter)
    ? workspaceFilter
    : undefined

  const providers = useMemo(() => providersOf(list), [list])

  const projectSessions = (sessions: Session[]) => project({
    ...(list.current !== undefined ? { current: list.current } : {}),
    archivedSessionIds: workspaces.archivedSessionIds,
    ledger: ledger.records,
    drafts,
    now,
    sessions,
    workspaces: projectWorkspaces,
    ...(filterId !== undefined ? { workspaceFilter: filterId } : {}),
    ...(Object.keys(gitMarks).length === 0 ? {} : { gitMarks }),
    ...(acpPresent ? { acpPresent: true } : {}),
    ...(Object.keys(providers).length === 0 ? {} : { providers }),
  })

  const view = useMemo(
    () => projectSessions(list.ids.flatMap((id) => {
      const session = list.byId[id]
      if (session === undefined) return []
      return [toSession(id, session)]
    })),
    [list, workspaces, ledger.records, drafts, now, filterId, gitMarks, acpPresent, providers],
  )

  const cards = shelfCards(view)
  const draftIds = useMemo(() => new Set(view.unsentDrafts.map((card) => card.sessionId)), [view.unsentDrafts])
  const pinnedIds = useMemo(() => new Set(view.shelves.pinned.map((card) => card.sessionId)), [view.shelves.pinned])
  const snoozedIds = useMemo(() => new Set(view.shelves.snoozed.map((card) => card.sessionId)), [view.shelves.snoozed])
  const settledIds = useMemo(() => new Set(view.shelves.settled.map((card) => card.sessionId)), [view.shelves.settled])
  const shelfOf = (sessionId: string): Shelf => {
    if (pinnedIds.has(sessionId)) return 'pinned'
    if (snoozedIds.has(sessionId)) return 'snoozed'
    if (settledIds.has(sessionId)) return 'settled'
    return 'active'
  }
  const searchSessionsRef = useRef(searchSessions)
  searchSessionsRef.current = searchSessions
  const searching = query.trim() !== ''

  useEffect(() => {
    if (!searching) {
      setHostHits((hits) => (hits.length === 0 ? hits : []))
      return
    }
    const needle = query.trim()
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchSessionsRef.current(needle, controller.signal).then((result) => {
        if (controller.signal.aborted) return
        setHostHits(result.items.map((item) => ({ sessionId: item.sessionId, snippet: item.snippet })))
      }).catch(() => {
        if (controller.signal.aborted) return
        setHostHits((hits) => (hits.length === 0 ? hits : []))
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, searching])

  useEffect(() => {
    const close = () => setMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const cardFromHostHit = (sessionId: string, snippet: string): Card | undefined => {
    if (workspaces.archivedSessionIds.includes(sessionId as never)) return undefined
    const session = list.byId[sessionId as never]
    if (session === undefined) {
      return {
        sessionId,
        workspaceTitle: '',
        sessionTitle: snippet,
        identity: { monogram: 'PR', color: 'fuchsia' },
        selected: list.current === sessionId,
      }
    }
    if (session.origin === 'subagent') return undefined
    const extra = projectSessions([toSession(sessionId, session)])
    return extra.unsentDrafts[0] ?? shelfCards(extra)[0]
  }

  const results = (() => {
    if (!searching) return []
    const searchable = [
      ...view.unsentDrafts.map((card) => ({ ...card, draftPreview: card.sessionTitle })),
      ...cards.map((card) => {
        const preview = drafts[card.sessionId]
        return preview === undefined ? card : { ...card, draftPreview: preview }
      }),
    ]
    const known = new Map([...view.unsentDrafts, ...cards].map((card) => [card.sessionId, card]))
    const out: Card[] = []
    const seen = new Set<string>()
    const push = (id: string, snippet = '') => {
      if (seen.has(id)) return
      const card = known.get(id) ?? cardFromHostHit(id, snippet)
      if (card === undefined) return
      seen.add(id)
      out.push(card)
    }
    for (const id of matchingIds(searchable, query)) push(id)
    for (const hit of hostHits) push(hit.sessionId, hit.snippet)
    return out
  })()

  const onOpen = (sessionId: string) => open(sessionId as never)
  const onStartSession = () => startSession(filterId as never)
  const send = (command: Command) => {
    void (async () => {
      const next = await applyLedger(command, ledger.revision)
      if (next !== undefined) {
        setLedger(next)
        return
      }
      const loaded = await loadLedger()
      const retried = await applyLedger(command, loaded.revision)
      setLedger(retried ?? loaded)
    })()
  }
  const onTogglePin = (sessionId: string, isPinned: boolean) => {
    send(isPinned ? { type: 'Unpin', sessionId } : { type: 'Pin', sessionId })
  }
  const onSnooze = (sessionId: string, until: number) => {
    const pending = list.byId[sessionId as never]?.pendingInteraction
    send(pending === undefined
      ? { type: 'Snooze', sessionId, until }
      : { type: 'Snooze', sessionId, until, pendingInteraction: pending })
  }

  const openMenu = (event: ReactMouseEvent, id: string, snooze = false) => {
    event.preventDefault()
    event.stopPropagation()
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setSnoozePanel(snooze)
    setCustomUntil(toDatetimeLocal(Date.now() + HOUR_MS))
    setMenu({ id, x: Math.min(window.innerWidth - 210, rect.right - 180), y: Math.min(window.innerHeight - 280, rect.bottom + 4) })
  }

  const started = (id: string) => list.byId[id as never]?.blank !== true
  const dragging = dragId !== null

  const commandForDrop = (sessionId: string, dest: DropDest, index: number): Command | undefined => {
    const shelfIds = dest === 'pinned'
      ? view.shelves.pinned.map((card) => card.sessionId)
      : dest === 'active'
        ? view.shelves.active.map((card) => card.sessionId)
        : view.shelves.settled.map((card) => card.sessionId)
    return dropCommand({
      sessionId,
      dest,
      index,
      shelfIds,
      snoozed: snoozedIds.has(sessionId),
      at: Date.now(),
      now,
    })
  }

  const bindDest = (dest: DropDest, index: number) => ({
    onDragOver: (event: ReactDragEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'move'
      setDropHint({ dest, index })
    },
    onDrop: (event: ReactDragEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const source = event.dataTransfer.getData('text/plain') || dragId
      setDragId(null)
      setDropHint(null)
      if (!source) return
      const command = commandForDrop(source, dest, index)
      if (command !== undefined) send(command)
    },
  })

  const bindDrag = (sessionId: string, drop?: DropHint) => ({
    draggable: true as const,
    onDragStart: (event: ReactDragEvent<HTMLElement>) => {
      event.dataTransfer.setData('text/plain', sessionId)
      event.dataTransfer.effectAllowed = 'move'
      setDragId(sessionId)
    },
    onDragEnd: () => {
      setDragId(null)
      setDropHint(null)
    },
    ...(drop === undefined ? {} : bindDest(drop.dest, drop.index)),
  })

  const dragVerb = (sessionId: string) => {
    if (dragId !== sessionId || dropHint === null) return null
    const key = dropVerbOf(dropHint.dest, shelfOf(sessionId))
    if (key === undefined) return null
    return <span className="dsht3-verb">{t(key)}</span>
  }

  const openOnKey = (sessionId: string) => (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onOpen(sessionId)
  }

  const rowClass = (card: Card) =>
    `dsht3-row${card.selected ? ' dsht3-on' : ''}${dragId === card.sessionId ? ' dsht3-dragging' : ''}`

  const cardBody = (card: Card) => {
    const meta = lineOneMeta(card, t)
    const git = gitMarksText(card)
    const runtime = card.marks?.runtime
    return (
      <>
        <span className="dsht3-line1">
          <IdentityMark card={card} />
          <span className="dsht3-ws">{card.workspaceTitle}</span>
          {meta === '' ? null : <span className="dsht3-meta">{meta}</span>}
        </span>
        <span className="dsht3-line2">
          {card.unsentDraft === true ? (
            <span className="dsht3-pen" aria-label={t('draft.pen')}><PenIcon /></span>
          ) : null}
          {card.sessionTitle}
        </span>
        {git === '' && runtime === undefined ? null : (
          <span className="dsht3-line3">
            {git === '' ? null : <span className="dsht3-git">{git}</span>}
            {runtime === undefined ? null : <RuntimeMark runtime={runtime} t={t} />}
          </span>
        )}
      </>
    )
  }

  const renderDraft = (card: Card) => (
    <div key={card.sessionId} className={`dsht3-row dsht3-draft${card.selected ? ' dsht3-on' : ''}`}>
      <button
        type="button"
        className="dsht3-card"
        aria-current={card.selected ? true : undefined}
        onClick={() => onOpen(card.sessionId)}
      >
        {cardBody(card)}
      </button>
      <button type="button" className="dsht3-discard" onClick={() => discardDraft(card.sessionId)}>
        {t('draft.discard')}
      </button>
    </div>
  )

  const renderSnoozed = (card: Card) => {
    const until = card.wakeAt
    return (
      <div
        key={card.sessionId}
        className={`${rowClass(card)} dsht3-slim`}
        {...(searching ? {} : bindDrag(card.sessionId))}
      >
        <div
          className="dsht3-card"
          role="button"
          tabIndex={0}
          aria-current={card.selected ? true : undefined}
          onClick={() => onOpen(card.sessionId)}
          onKeyDown={openOnKey(card.sessionId)}
        >
          <span className="dsht3-line1">
            <IdentityMark card={card} />
            <span className="dsht3-title">{card.sessionTitle}</span>
            <span className="dsht3-meta">{until === undefined ? '' : `${t('snooze.until')} ${formatWake(until)}`}</span>
          </span>
        </div>
        <button type="button" className="dsht3-more" onClick={(event) => openMenu(event, card.sessionId)}>···</button>
        {dragVerb(card.sessionId)}
      </div>
    )
  }

  const renderSettled = (card: Card, index = 0) => {
    const pr = card.marks?.pr
    return (
      <div
        key={card.sessionId}
        className={`${rowClass(card)} dsht3-slim`}
        {...(searching ? {} : bindDrag(card.sessionId, { dest: 'settled', index }))}
      >
        <div
          className="dsht3-card"
          role="button"
          tabIndex={0}
          aria-current={card.selected ? true : undefined}
          onClick={() => onOpen(card.sessionId)}
          onKeyDown={openOnKey(card.sessionId)}
        >
          <span className="dsht3-line1">
            <IdentityMark card={card} />
            <span className="dsht3-title">{card.sessionTitle}</span>
            {pr === undefined || pr === '' ? null : <span className="dsht3-meta">{pr}</span>}
            <span className="dsht3-meta">{card.settledAt === undefined ? '' : formatSettled(card.settledAt, t)}</span>
          </span>
        </div>
        <button
          type="button"
          className="dsht3-unsettle"
          onClick={() => send({ type: 'Unsettle', sessionId: card.sessionId })}
        >
          {t('unsettle')}
        </button>
        <button type="button" className="dsht3-more" onClick={(event) => openMenu(event, card.sessionId)}>···</button>
        {dragVerb(card.sessionId)}
      </div>
    )
  }

  const renderCard = (card: Card, drop?: DropHint) => {
    if (draftIds.has(card.sessionId) || (!started(card.sessionId) && drafts[card.sessionId])) {
      return renderDraft(card)
    }
    if (!searching && snoozedIds.has(card.sessionId)) return renderSnoozed(card)
    if (!searching && (settledIds.has(card.sessionId) || card.slim === true)) return renderSettled(card, drop?.index)
    const pinned = pinnedIds.has(card.sessionId)
    const canSettle = started(card.sessionId) && !snoozedIds.has(card.sessionId) && !settledIds.has(card.sessionId)
    const canSnooze = canSettle && !pinned && list.byId[card.sessionId as never]?.pendingInteraction === undefined
    return (
      <div
        key={card.sessionId}
        className={rowClass(card)}
        {...(searching || !started(card.sessionId) ? {} : bindDrag(card.sessionId, drop))}
      >
        <div
          className="dsht3-card"
          role="button"
          tabIndex={0}
          aria-current={card.selected ? true : undefined}
          onClick={() => onOpen(card.sessionId)}
          onKeyDown={openOnKey(card.sessionId)}
        >
          {cardBody(card)}
        </div>
        {started(card.sessionId) ? (
          <>
            {pinned ? (
              <button
                type="button"
                className="dsht3-pin"
                aria-label={t('unpin')}
                onClick={() => onTogglePin(card.sessionId, true)}
              >
                {t('unpin')}
              </button>
            ) : null}
            {canSettle ? (
              <button
                type="button"
                className="dsht3-act"
                aria-label={t('settle')}
                onClick={() => send({ type: 'Settle', sessionId: card.sessionId, at: Date.now() })}
              >
                {t('settle')}
              </button>
            ) : null}
            {canSnooze ? (
              <button
                type="button"
                className="dsht3-act"
                aria-label={t('menu.snooze')}
                onClick={(event) => openMenu(event, card.sessionId, true)}
              >
                {t('menu.snooze')}
              </button>
            ) : null}
            <button type="button" className="dsht3-more" onClick={(event) => openMenu(event, card.sessionId)}>···</button>
          </>
        ) : null}
        {dragVerb(card.sessionId)}
      </div>
    )
  }

  const canRaiseDirectoryFlow = directoryFlowAvailable && renderSlot !== undefined
  const directoryFlow = flowOpen && canRaiseDirectoryFlow
    ? renderSlot('sidebar.workspaces.directoryFlow', {
      open: flowOpen,
      busy: flowBusy,
      onPicked: (path: string) => {
        setFlowBusy(true)
        void createWorkspace({ path }).finally(() => {
          setFlowBusy(false)
          setFlowOpen(false)
        })
      },
      onCancel: () => setFlowOpen(false),
      onError: () => setFlowOpen(false),
    })
    : null

  if (!wide) {
    return (
      <div className="dsht3-rail">
        <button type="button" className="dsht3-icon" aria-label={t('search.aria')} onClick={() => expandSidebar()}>
          <SearchIcon />
        </button>
        {canRaiseDirectoryFlow ? (
          <button type="button" className="dsht3-icon" aria-label={t('workspace.add')} onClick={() => { setFlowOpen(true); expandSidebar() }}>
            <AddWorkspaceIcon />
          </button>
        ) : null}
        <button type="button" className="dsht3-icon" aria-label={t('session.blank')} onClick={onStartSession}>
          <NewSessionIcon />
        </button>
      </div>
    )
  }

  const pinned = view.shelves.pinned
  const active = view.shelves.active
  const snoozed = view.shelves.snoozed
  const settled = view.shelves.settled
  const unsentDrafts = view.unsentDrafts
  const empty = pinned.length === 0 && active.length === 0 && snoozed.length === 0 && settled.length === 0 && unsentDrafts.length === 0

  return (
    <div className="dsht3">
      <div className="dsht3-head">
        <label className="dsht3-search">
          <input value={query} placeholder={t('search.placeholder')} aria-label={t('search.aria')} onChange={(event) => setQuery(event.target.value)} />
        </label>
        {showWorkspaceFilter ? (
          <select
            className="dsht3-filter"
            aria-label={t('filter.aria')}
            value={filterId ?? ''}
            onChange={(event) => setWorkspaceFilter(event.target.value === '' ? undefined : event.target.value)}
          >
            <option value="">{t('filter.all')}</option>
            {workspaces.items.map((workspace) => (
              <option key={workspace.workspaceId} value={workspace.workspaceId}>{workspace.title}</option>
            ))}
          </select>
        ) : null}
        {canRaiseDirectoryFlow ? (
          <button type="button" className="dsht3-icon" aria-label={t('workspace.add')} onClick={() => setFlowOpen(true)}>
            <AddWorkspaceIcon />
          </button>
        ) : null}
        <button type="button" className="dsht3-icon" aria-label={t('session.blank')} onClick={onStartSession}>
          <NewSessionIcon />
        </button>
        {directoryFlow}
      </div>
      <div className="dsht3-list">
        {searching ? (
          results.length === 0 ? <div className="dsht3-empty">{t('search.empty')}</div> : results.map((card) => renderCard(card))
        ) : empty ? <div className="dsht3-empty">{t('empty')}</div> : (
          <>
            {/* unsent-draft */}
            {unsentDrafts.length === 0 ? null : (
              <section className="dsht3-block">
                {unsentDrafts.map(renderDraft)}
              </section>
            )}
            {pinned.length > 0 || dragging ? (
              <section className={`dsht3-shelf${dropHint?.dest === 'pinned' ? ' dsht3-drop' : ''}`} {...bindDest('pinned', 0)}>
                {dragging ? <div className="dsht3-shead">{t('shelf.pinned')}</div> : null}
                {pinned.map((card, index) => renderCard(card, { dest: 'pinned', index }))}
                {dragging ? <div className="dsht3-dropzone" {...bindDest('pinned', pinned.length)} /> : null}
              </section>
            ) : null}
            {active.length > 0 || dragging ? (
              <section className={`dsht3-shelf${dropHint?.dest === 'active' ? ' dsht3-drop' : ''}`} {...bindDest('active', 0)}>
                {active.map((card, index) => renderCard(card, { dest: 'active', index }))}
                {dragging ? <div className="dsht3-dropzone" {...bindDest('active', active.length)} /> : null}
              </section>
            ) : null}
            {/* snoozed */}
            {snoozed.length === 0 ? null : (
              <section className="dsht3-shelf" onDragOver={() => setDropHint(null)}>
                <button type="button" className="dsht3-shead dsht3-stoggle" onClick={() => setSnoozedOpen((was) => !was)}>
                  {snoozedOpen ? '▾' : '▸'} {t('shelf.snoozed')}
                </button>
                {snoozedOpen ? snoozed.map(renderSnoozed) : null}
              </section>
            )}
            {/* settled */}
            {settled.length === 0 && !dragging ? null : (
              <section className={`dsht3-shelf${dropHint?.dest === 'settled' ? ' dsht3-drop' : ''}`} {...bindDest('settled', 0)}>
                {settled.length === 0 ? (
                  <div className="dsht3-shead">{t('shelf.settled')}</div>
                ) : (
                  <button
                    type="button"
                    className="dsht3-shead dsht3-stoggle"
                    aria-expanded={settledOpen}
                    onClick={() => setSettledOpen((wasOpen) => !wasOpen)}
                  >
                    {settledOpen ? '▾' : '▸'} {t('shelf.settled')}
                  </button>
                )}
                {settledOpen ? settled.map((card, index) => renderSettled(card, index)) : null}
                {dragging ? <div className="dsht3-dropzone" {...bindDest('settled', settled.length)} /> : null}
              </section>
            )}
          </>
        )}
      </div>
      {menu ? (
        <>
          <div className="dsht3-scrim" onClick={() => setMenu(null)} />
          <div className="dsht3-menu" style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()}>
            {snoozePanel ? (
              <>
                <button type="button" onClick={() => { onSnooze(menu.id, Date.now() + HOUR_MS); setMenu(null) }}>{t('snooze.hour')}</button>
                {laterToday18(now) === undefined ? null : (
                  <button type="button" onClick={() => {
                    const until = laterToday18(now)
                    if (until === undefined) return
                    onSnooze(menu.id, until)
                    setMenu(null)
                  }}>{t('snooze.laterToday')}</button>
                )}
                <button type="button" onClick={() => { onSnooze(menu.id, tomorrow09(now)); setMenu(null) }}>{t('snooze.tomorrow')}</button>
                <div className="dsht3-custom">
                  <input
                    type="datetime-local"
                    aria-label={t('snooze.custom')}
                    value={customUntil}
                    onChange={(event) => setCustomUntil(event.target.value)}
                  />
                  <button type="button" onClick={() => {
                    const until = new Date(customUntil).getTime()
                    if (!Number.isFinite(until) || until <= Date.now()) return
                    onSnooze(menu.id, until)
                    setMenu(null)
                  }}>{t('snooze.apply')}</button>
                </div>
              </>
            ) : (
              <>
                <button type="button" onClick={() => {
                  const title = window.prompt(t('menu.rename'))
                  if (title) void renameSession(menu.id as never, title)
                  setMenu(null)
                }}>{t('menu.rename')}</button>
                <button type="button" onClick={() => {
                  const workspace = workspaces.items.find((item) => item.sessionIds.includes(menu.id as never))
                  if (workspace === undefined) {
                    setMenu(null)
                    return
                  }
                  const title = window.prompt(t('menu.workspace'))
                  if (title) void renameWorkspace(workspace.workspaceId as never, title)
                  setMenu(null)
                }}>{t('menu.workspace')}</button>
                <button type="button" onClick={() => { forkSession(menu.id as never); setMenu(null) }}>{t('menu.fork')}</button>
                {snoozedIds.has(menu.id) ? (
                  <button type="button" onClick={() => { send({ type: 'Wake', sessionId: menu.id }); setMenu(null) }}>{t('wake')}</button>
                ) : null}
                {settledIds.has(menu.id) ? null : (
                  <button type="button" onClick={() => { onTogglePin(menu.id, pinnedIds.has(menu.id)); setMenu(null) }}>
                    {t(pinnedIds.has(menu.id) ? 'unpin' : 'pin')}
                  </button>
                )}
                {snoozedIds.has(menu.id) || settledIds.has(menu.id) || list.byId[menu.id as never]?.pendingInteraction !== undefined ? null : (
                  <button type="button" onClick={() => setSnoozePanel(true)}>{t('menu.snooze')}</button>
                )}
                {settledIds.has(menu.id) || snoozedIds.has(menu.id) ? null : (
                  <button type="button" onClick={() => {
                    send({ type: 'Settle', sessionId: menu.id, at: Date.now() })
                    setMenu(null)
                  }}>{t('settle')}</button>
                )}
                <button type="button" className="dsht3-danger" onClick={() => { void archiveSession(menu.id as never); setMenu(null) }}>{t('menu.archive')}</button>
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
