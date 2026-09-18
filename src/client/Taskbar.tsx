import { useEffect, useMemo, useState, useSyncExternalStore, type DragEvent as ReactDragEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { WorkspaceBrowserProps } from '@deepseek-ai/dsh-client-ui-workspace/client'
import { project, type Card, type Command, type LiveStatus, type Session, type ViewModel } from '../taskbar.ts'
import { discardDraft, draftsSnapshot, subscribeDrafts } from './drafts.ts'
import { applyLedger, loadLedger, type HostLedger } from './ledger.ts'
import { matchingIds } from './search.ts'
import type { TaskbarKey } from './locales.ts'

type Props = Omit<WorkspaceBrowserProps, 't'> & { t: (key: TaskbarKey) => string }
type DropDest = 'pinned' | 'active' | 'settled'

const SEARCH_DEBOUNCE_MS = 250
const HOUR_MS = 60 * 60 * 1000
const NOW_TICK_MS = 1000

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function laterToday18(now: number): number | undefined {
  const d = new Date(now)
  d.setHours(18, 0, 0, 0)
  const until = d.getTime()
  return until > now ? until : undefined
}

function tomorrow09(now: number): number {
  const d = new Date(now)
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d.getTime()
}

function formatWake(until: number): string {
  return new Date(until).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 11l3.2 3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function AddWorkspaceIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 4.5h7.5a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 10.5 13.5h-7A1.5 1.5 0 0 1 2 12V6a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 4.5V3.75A1.75 1.75 0 0 1 6.75 2h2.5A1.75 1.75 0 0 1 11 3.75V4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7.25v4M6 9.25h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function PenIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function lineOne(workspaceTitle: string, liveStatus: LiveStatus | undefined, t: Props['t']): string {
  const live = liveStatus === undefined ? '' : t(`live.${liveStatus}`)
  if (workspaceTitle && live) return `${workspaceTitle} · ${live}`
  return workspaceTitle || live
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

function liveOf(session: { pendingInteraction?: Session['pendingInteraction'] | undefined; running: boolean; completed?: boolean | undefined }): LiveStatus | undefined {
  if (session.pendingInteraction) return 'waiting-for-me'
  if (session.running) return 'running'
  if (session.completed) return 'done-unread'
  return undefined
}

export function Taskbar(props: Props) {
  const {
    wide,
    expandSidebar,
    useSessions,
    useWorkspaces,
    open,
    renameSession,
    forkSession,
    archiveSession,
    createWorkspace,
    searchSessions,
    useDirectoryFlow,
    renderSlot,
    t,
  } = props

  const list = useSessions((state) => state)
  const workspaces = useWorkspaces((state) => state)
  const directoryFlowAvailable = useDirectoryFlow((occupied) => occupied)
  const [ledger, setLedger] = useState<HostLedger>({ revision: 0, records: {} })
  const drafts = useSyncExternalStore(subscribeDrafts, () => draftsSnapshot(list.ids))
  const [query, setQuery] = useState('')
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
  const [dropHint, setDropHint] = useState<{ dest: DropDest; index: number } | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), NOW_TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  const livingKey = useMemo(
    () => list.ids.filter((id) => !workspaces.archivedSessionIds.includes(id)).join('\0'),
    [list.ids, workspaces.archivedSessionIds],
  )

  useEffect(() => {
    if (list.phase !== 'ready') return
    let cancelled = false
    const livingIds = livingKey === '' ? [] : livingKey.split('\0')
    void loadLedger().then(async (loaded) => {
      if (cancelled) return
      const next = await applyLedger({ type: 'Gc', livingIds }, loaded.revision)
      if (cancelled) return
      setLedger(next ?? loaded)
    })
    return () => { cancelled = true }
  }, [livingKey, list.phase])

  const view = useMemo(() => project({
    ...(list.current !== undefined ? { current: list.current } : {}),
    archivedSessionIds: workspaces.archivedSessionIds,
    ledger: ledger.records,
    drafts,
    now,
    sessions: list.ids.flatMap((id) => {
      const session = list.byId[id]
      if (session === undefined) return []
      return [toSession(id, session)]
    }),
    workspaces: workspaces.items.map((workspace) => ({
      id: workspace.workspaceId,
      title: workspace.title,
      path: workspace.path,
      sessionIds: workspace.sessionIds,
    })),
  }), [list, workspaces, ledger.records, drafts, now])

  const cards = shelfCards(view)
  const draftIds = useMemo(() => new Set(view.unsentDrafts.map((card) => card.sessionId)), [view.unsentDrafts])
  const pinnedIds = useMemo(() => new Set(view.shelves.pinned.map((card) => card.sessionId)), [view.shelves.pinned])
  const snoozedIds = useMemo(() => new Set(view.shelves.snoozed.map((card) => card.sessionId)), [view.shelves.snoozed])
  const settledIds = useMemo(() => new Set(view.shelves.settled.map((card) => card.sessionId)), [view.shelves.settled])
  const searching = query.trim() !== ''

  useEffect(() => {
    if (!searching) {
      setHostHits([])
      return
    }
    const needle = query.trim()
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchSessions(needle, controller.signal).then((result) => {
        if (controller.signal.aborted) return
        setHostHits(result.items.map((item) => ({ sessionId: item.sessionId, snippet: item.snippet })))
      }).catch(() => {
        if (controller.signal.aborted) return
        setHostHits([])
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, searchSessions, searching])

  useEffect(() => {
    const close = () => setMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const workspaceTitleOf = (sessionId: string, cwd: string | undefined): string => {
    const byAccount = workspaces.items.find((workspace) => workspace.sessionIds.includes(sessionId as never))
    if (byAccount) return byAccount.title
    if (cwd === undefined) return ''
    return workspaces.items.find((workspace) => cwd === workspace.path || cwd.startsWith(`${workspace.path}/`))?.title ?? ''
  }

  const extraCard = (sessionId: string, snippet: string): Card | undefined => {
    if (workspaces.archivedSessionIds.includes(sessionId as never)) return undefined
    const session = list.byId[sessionId as never]
    if (session === undefined) {
      return { sessionId, workspaceTitle: '', sessionTitle: snippet, selected: list.current === sessionId }
    }
    if (session.origin === 'subagent') return undefined
    const liveStatus = liveOf(session)
    if (session.blank) {
      const preview = drafts[sessionId]
      if (preview === undefined || preview === '') return undefined
      return {
        sessionId,
        workspaceTitle: workspaceTitleOf(sessionId, session.cwd),
        sessionTitle: preview,
        selected: list.current === sessionId,
      }
    }
    return {
      sessionId,
      workspaceTitle: workspaceTitleOf(sessionId, session.cwd),
      sessionTitle: session.displayTitle,
      ...(liveStatus !== undefined ? { liveStatus } : {}),
      selected: list.current === sessionId,
      ...(drafts[sessionId] ? { unsentDraft: true as const } : {}),
    }
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
      const card = known.get(id) ?? extraCard(id, snippet)
      if (card === undefined) return
      seen.add(id)
      out.push(card)
    }
    for (const id of matchingIds(searchable, query)) push(id)
    for (const hit of hostHits) push(hit.sessionId, hit.snippet)
    return out
  })()

  const onOpen = (sessionId: string) => open(sessionId as never)
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

  const openMenu = (event: ReactMouseEvent, id: string) => {
    event.preventDefault()
    event.stopPropagation()
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setSnoozePanel(false)
    setCustomUntil(toDatetimeLocal(Date.now() + HOUR_MS))
    setMenu({ id, x: Math.min(window.innerWidth - 210, rect.right - 180), y: Math.min(window.innerHeight - 280, rect.bottom + 4) })
  }

  const started = (id: string) => list.byId[id as never]?.blank !== true
  const dragging = dragId !== null

  const dropCommand = (sessionId: string, dest: DropDest, index: number): Command => {
    if (dest === 'settled') return { type: 'Drop', sessionId, dest, index, at: Date.now() }
    return { type: 'Drop', sessionId, dest, index }
  }

  const dropVerbOf = (sessionId: string, dest: DropDest): TaskbarKey | undefined => {
    if (dest === 'pinned') return 'pin'
    if (dest === 'settled') return 'settle'
    if (pinnedIds.has(sessionId)) return 'unpin'
    if (snoozedIds.has(sessionId)) return 'wake'
    if (settledIds.has(sessionId)) return 'unsettle'
    return undefined
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
      send(dropCommand(source, dest, index))
    },
  })

  const bindDrag = (sessionId: string, drop?: { dest: DropDest; index: number }) => ({
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
    const key = dropVerbOf(sessionId, dropHint.dest)
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

  const renderDraft = (card: Card) => (
    <div key={card.sessionId} className={`dsht3-row dsht3-draft${card.selected ? ' dsht3-on' : ''}`}>
      <button
        type="button"
        className="dsht3-card"
        aria-current={card.selected ? true : undefined}
        onClick={() => onOpen(card.sessionId)}
      >
        <span className="dsht3-line1">{card.workspaceTitle}</span>
        <span className="dsht3-line2">{card.sessionTitle}</span>
      </button>
      <button type="button" className="dsht3-discard" onClick={() => discardDraft(card.sessionId)}>
        {t('draft.discard')}
      </button>
    </div>
  )

  const renderSnoozed = (card: Card) => {
    const until = ledger.records[card.sessionId]?.snoozedUntil
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
          <span className="dsht3-line2">{card.sessionTitle}</span>
          <span className="dsht3-line1">
            {until === undefined ? '' : `${t('snooze.until')} ${formatWake(until)}`}
          </span>
        </div>
        <button type="button" className="dsht3-wake" onClick={() => send({ type: 'Wake', sessionId: card.sessionId })}>
          {t('wake')}
        </button>
        <button type="button" className="dsht3-more" onClick={(event) => openMenu(event, card.sessionId)}>···</button>
        {dragVerb(card.sessionId)}
      </div>
    )
  }

  const renderSettled = (card: Card, index = 0) => (
    <div
      key={card.sessionId}
      className={rowClass(card)}
      {...(searching ? {} : bindDrag(card.sessionId, { dest: 'settled', index }))}
    >
      <div
        className="dsht3-slim"
        role="button"
        tabIndex={0}
        aria-current={card.selected ? true : undefined}
        onClick={() => onOpen(card.sessionId)}
        onKeyDown={openOnKey(card.sessionId)}
      >
        {card.sessionTitle}
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

  const renderCard = (card: Card, drop?: { dest: DropDest; index: number }) => {
    if (draftIds.has(card.sessionId) || (!started(card.sessionId) && drafts[card.sessionId])) {
      return renderDraft(card)
    }
    if (snoozedIds.has(card.sessionId)) return renderSnoozed(card)
    if (settledIds.has(card.sessionId) || card.slim === true) return renderSettled(card, drop?.index)
    const pinned = pinnedIds.has(card.sessionId)
    const pinKey = pinned ? 'unpin' : 'pin'
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
          <span className="dsht3-line1">{lineOne(card.workspaceTitle, card.liveStatus, t)}</span>
          <span className="dsht3-line2">
            {card.unsentDraft === true ? (
              <span className="dsht3-pen" aria-label={t('draft.pen')}><PenIcon /></span>
            ) : null}
            {card.sessionTitle}
          </span>
        </div>
        {started(card.sessionId) ? (
          <>
            <button
              type="button"
              className="dsht3-pin"
              aria-label={t(pinKey)}
              onClick={() => onTogglePin(card.sessionId, pinned)}
            >
              {t(pinKey)}
            </button>
            <button type="button" className="dsht3-more" onClick={(event) => openMenu(event, card.sessionId)}>···</button>
          </>
        ) : null}
        {dragVerb(card.sessionId)}
      </div>
    )
  }

  const directoryFlow = flowOpen && directoryFlowAvailable ? renderSlot('sidebar.workspaces.directoryFlow', {
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
  }) : null

  if (!wide) {
    return (
      <div className="dsht3-rail">
        <button type="button" className="dsht3-icon" aria-label={t('search.aria')} onClick={() => expandSidebar()}>
          <SearchIcon />
        </button>
        {directoryFlowAvailable ? (
          <button type="button" className="dsht3-icon" aria-label={t('workspace.add')} onClick={() => { setFlowOpen(true); expandSidebar() }}>
            <AddWorkspaceIcon />
          </button>
        ) : null}
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
        {directoryFlowAvailable ? <button type="button" className="dsht3-add" onClick={() => setFlowOpen(true)}>{t('workspace.add')}</button> : null}
        {directoryFlow}
      </div>
      <div className="dsht3-list">
        {searching ? (
          results.length === 0 ? <div className="dsht3-empty">{t('search.empty')}</div> : results.map((card) => renderCard(card))
        ) : empty ? <div className="dsht3-empty">{t('empty')}</div> : (
          <>
            {/* unsent-draft */}
            {unsentDrafts.length === 0 ? null : (
              <section className="dsht3-shelf">
                <div className="dsht3-shead">{t('draft.unsent')}</div>
                {unsentDrafts.map(renderDraft)}
              </section>
            )}
            {pinned.length > 0 || dragging ? (
              <section className={`dsht3-shelf${dropHint?.dest === 'pinned' ? ' dsht3-drop' : ''}`} {...bindDest('pinned', 0)}>
                <div className="dsht3-shead">{t('shelf.pinned')}</div>
                {pinned.map((card, index) => renderCard(card, { dest: 'pinned', index }))}
                {dragging ? <div className="dsht3-dropzone" {...bindDest('pinned', pinned.length)} /> : null}
              </section>
            ) : null}
            {active.length > 0 || dragging ? (
              <section className={`dsht3-shelf${dropHint?.dest === 'active' ? ' dsht3-drop' : ''}`} {...bindDest('active', 0)}>
                <div className="dsht3-shead">{t('shelf.active')}</div>
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
                <button type="button" onClick={() => { forkSession(menu.id as never); setMenu(null) }}>{t('menu.fork')}</button>
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
