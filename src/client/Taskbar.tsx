import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent as ReactFormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { WorkspaceBrowserProps } from '@deepseek-ai/dsh-client-ui-workspace/client'
import { identityOf, project, relativeTimeOf, type Card, type CardMarks, type Command, type GitMarks, type RelativeTime, type Session, type Shelf, type ViewModel } from '../taskbar.ts'
import { dropCommand, dropVerbOf, type DropDest, type DropHint } from './drop.ts'
import { draftsSnapshot, EMPTY_DRAFTS, subscribeDrafts } from './drafts.ts'
import { AddWorkspaceIcon, AgyRuntimeIcon, ArchiveIcon, ArrowLeftIcon, BranchIcon, BrandWordmark, CheckIcon, ChevronDownIcon, ChevronRightIcon, ClockIcon, CloseIcon, CursorRuntimeIcon, DshRuntimeIcon, FilterFilledIcon, FilterIcon, FolderIcon, LoadingIcon, MoreIcon, NewSessionIcon, PenIcon, PinIcon, PlusIcon, RestoreIcon, SearchIcon, SettingsIcon, SquarePenIcon, T3ChevronRightIcon, T3SearchIcon, WaitingIcon, WorkspaceFilterIcon, WorktreeIcon } from './icons.tsx'
import { loadGitMarks } from './git-marks.ts'
import { applyLedger, loadLedger } from './ledger.ts'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { EMPTY_LEDGER, isRecord } from '../ledger-json.ts'
import { matchingIds } from './search.ts'
import type { TaskbarKey } from './locales.ts'
import { formatWake, HOUR_MS, laterToday18, toDatetimeLocal, tomorrow09 } from './snooze-time.ts'
import { SETTLED_INITIAL, SETTLED_PAGE, settledVisibleCount } from './settled.ts'
import { placeMenu } from './place-menu.ts'
import { runtimeProtectionSnapshot, subscribeRuntimeProtection, syncProtection } from './protection.ts'

type Props = Omit<WorkspaceBrowserProps, 't' | 'renderSlot'> & PropsRenderSlots<'t3-taskbar.directoryFlow'> & {
  t: (key: TaskbarKey) => string
  discardSessionDraft: (sessionId: string) => void
  acpPresent?: boolean
  /** Set only by the APK mobile layout adapter. */
  mobile?: boolean
}

const SEARCH_DEBOUNCE_MS = 250
const NOW_TICK_MS = 1000
const MOBILE_DRAWER_BOOT_MS = 2500
const MOBILE_DRAWER_RETRY_MS = 400
const PLATFORM_BACK_EVENT = 'dsh-mobile:platform-back'

/** Survives Taskbar remounts; never toggles an already-open drawer. */
const mobileDrawerBoot = { poked: 0, lastAt: 0, seenOpen: false, userClosed: false, started: 0 }

function mobileDrawerIsOpen(): boolean {
  return document.querySelector('[data-dsh-mobile-frame]')?.hasAttribute('data-drawer-open') === true
}

function navigationMenuButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('button[aria-label="打开导航菜单"], button[aria-label="Open navigation menu"]')
    ?? document.querySelector<HTMLButtonElement>('[data-mobile-topbar] > button')
}

function pokeMobileDrawer(instant = false): void {
  if (mobileDrawerIsOpen()) return
  const drawer = document.querySelector<HTMLElement>('nav[aria-label="导航抽屉"]')
  if (instant && drawer !== null) drawer.style.setProperty('transition', 'none', 'important')
  navigationMenuButton()?.click()
  if (instant && drawer !== null) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { drawer.style.removeProperty('transition') })
    })
  }
}

let closeOpenMenu: (() => void) | undefined

function overlayBlocksPlatformBack(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null
    || document.querySelector('[data-dsh-profile-menu]') !== null
}

function onMobilePlatformBack(event: Event): void {
  if (document.querySelector('[data-dsh-mobile-frame], [data-dsh-mobile-taskbar]') === null) return
  if (document.querySelector('.dsht3-menu') !== null) {
    event.preventDefault()
    event.stopImmediatePropagation()
    closeOpenMenu?.()
    return
  }
  if (overlayBlocksPlatformBack()) return
  if (document.querySelector('.dsht3-choose-page') !== null) {
    event.preventDefault()
    event.stopImmediatePropagation()
    document.querySelector<HTMLButtonElement>('.dsht3-choose-head button')?.click()
    return
  }
  if (mobileDrawerIsOpen()) {
    event.stopImmediatePropagation()
    return
  }
  event.preventDefault()
  event.stopImmediatePropagation()
  pokeMobileDrawer()
}

type MenuState = { id: string; anchor: DOMRect; snooze: boolean }
type SwipeAction = 'settle' | 'unsettle' | 'wake'
type SwipeTrack = { pointerId: number; sessionId: string; startX: number; startY: number; width: number; dx: number; locked: boolean; action: SwipeAction | undefined }
type DialogState = { kind: 'rename-session' | 'rename-workspace' | 'archive'; id: string; value: string }
type DragVisual = { top: number; left: number; width: number; height: number }
type ScrollbarVisual = { top: number; height: number; visible: boolean }
type DragPreviewGroups = Readonly<Record<DropDest, readonly string[]>>
type DragHitTest = {
  scrollTop: number
  rows: readonly { dest: DropDest; index: number; top: number; bottom: number }[]
}

/** Return the row translations for the visual order preview; persistence still uses dropCommand. */
export function dragPreviewTranslations(input: {
  groups: DragPreviewGroups
  sessionId: string
  drop: DropHint
  rowAdvance: number
  targetAdvance?: number
}): Readonly<Record<string, number>> {
  const { groups, sessionId, drop, rowAdvance, targetAdvance = rowAdvance } = input
  if (!Number.isFinite(rowAdvance) || rowAdvance <= 0) return {}
  const sourceDest = (Object.keys(groups) as DropDest[]).find(dest => groups[dest].includes(sessionId))
  if (sourceDest === undefined) {
    const out: Record<string, number> = {}
    for (let index = Math.max(0, drop.index); index < groups[drop.dest].length; index++) out[groups[drop.dest][index]!] = targetAdvance
    return out
  }
  const sourceIndex = groups[sourceDest].indexOf(sessionId)
  const out: Record<string, number> = {}
  const add = (id: string, amount: number) => {
    if (amount !== 0) out[id] = amount
  }
  if (sourceDest === drop.dest) {
    if (drop.index > sourceIndex) {
      for (let index = sourceIndex + 1; index <= drop.index && index < groups[sourceDest].length; index++) {
        add(groups[sourceDest][index]!, -rowAdvance)
      }
    } else if (drop.index < sourceIndex) {
      for (let index = Math.max(0, drop.index); index < sourceIndex; index++) {
        add(groups[sourceDest][index]!, rowAdvance)
      }
    }
    return out
  }
  for (let index = sourceIndex + 1; index < groups[sourceDest].length; index++) {
    add(groups[sourceDest][index]!, -rowAdvance)
  }
  for (let index = Math.max(0, drop.index); index < groups[drop.dest].length; index++) {
    add(groups[drop.dest][index]!, targetAdvance)
  }
  return out
}

export function dragShelfOffset(shelf: Shelf, source: Shelf, destination: Shelf, removeAdvance: number, insertAdvance: number): number {
  if (source === destination) return 0
  const order: readonly Shelf[] = ['pinned', 'active', 'snoozed', 'settled']
  const index = order.indexOf(shelf)
  return (order.indexOf(destination) < index ? insertAdvance : 0)
    - (order.indexOf(source) < index ? removeAdvance : 0)
}

function normalizedDropIndex(sessionId: string, dest: DropDest, index: number, groups: DragPreviewGroups): number {
  const sourceIndex = groups[dest].indexOf(sessionId)
  return sourceIndex >= 0 && sourceIndex < index ? index - 1 : index
}

function formatRelative(time: RelativeTime, t: Props['t']): string {
  if (time.unit === 'now') return t('time.now')
  const key = `time.${time.unit}` as const
  return t(key).replace('{n}', String(time.n))
}

function shortenWorkspacePath(path: string): string {
  if (path.length <= 36) return path
  return `${path.slice(0, 18)}...${path.slice(-16)}`
}

function ChooseWorkspacePage({
  workspaces,
  canAdd,
  onBack,
  onAdd,
  onPick,
  t,
}: {
  workspaces: readonly { workspaceId: string; title: string; path: string }[]
  canAdd: boolean
  onBack: () => void
  onAdd: () => void
  onPick: (workspaceId: string) => void
  t: Props['t']
}) {
  return (
    <div className="dsht3-choose-page">
      <div className="dsht3-choose-head">
        <button type="button" className="dsht3-mobile-icon" aria-label={t('workspace.chooseBack')} onClick={onBack}>
          <ArrowLeftIcon />
        </button>
        <div className="dsht3-choose-title">{t('workspace.choose')}</div>
        {canAdd ? (
          <button type="button" className="dsht3-mobile-icon" aria-label={t('workspace.chooseAdd')} onClick={onAdd}>
            <PlusIcon />
          </button>
        ) : <span className="dsht3-mobile-icon" aria-hidden="true" />}
      </div>
      <div className="dsht3-choose-list">
        {workspaces.length === 0 ? (
          <div className="dsht3-choose-empty">
            <div>{t('workspace.chooseEmpty')}</div>
            <p>{t('workspace.chooseEmptyDetail')}</p>
            {canAdd ? <button type="button" className="dsht3-choose-empty-add" onClick={onAdd}>{t('workspace.chooseAdd')}</button> : null}
          </div>
        ) : workspaces.map(workspace => (
          <button
            key={workspace.workspaceId}
            type="button"
            className="dsht3-choose-row"
            data-dsh-mobile-session-nav
            onClick={() => onPick(workspace.workspaceId)}
          >
            <FolderIcon size={22} />
            <span className="dsht3-choose-copy">
              <span className="dsht3-choose-name">{workspace.title}</span>
              {workspace.path !== '' ? <span className="dsht3-choose-path">{shortenWorkspacePath(workspace.path)}</span> : null}
            </span>
            <T3ChevronRightIcon size={18} />
          </button>
        ))}
      </div>
    </div>
  )
}

function lineOneMeta(card: Card, t: Props['t']): string {
  if (card.liveStatus !== undefined) return t(`live.${card.liveStatus}`)
  if (card.relativeTime !== undefined) return formatRelative(card.relativeTime, t)
  return ''
}

function worktreeLabel(card: Card): string | undefined {
  const worktree = card.marks?.worktree
  if (worktree === undefined || worktree === '') return undefined
  return worktree === 'true' ? 'worktree' : worktree
}

function RuntimeMark({ runtime, t }: { runtime: NonNullable<CardMarks['runtime']>; t: Props['t'] }) {
  const icon = runtime === 'agy'
    ? <AgyRuntimeIcon />
    : runtime === 'cursor'
      ? <CursorRuntimeIcon />
      : <DshRuntimeIcon />
  const label = t(`runtime.${runtime}`)
  return <span className="dsht3-runtime" aria-label={label} title={label}>{icon}</span>
}

function LiveStatusIcon({ status }: { status: NonNullable<Card['liveStatus']> }) {
  if (status === 'running') return <span className="dsht3-spin"><LoadingIcon /></span>
  if (status === 'waiting-for-me') return <WaitingIcon />
  return <CheckIcon />
}

function providerOf(session: unknown): string | undefined {
  if (!isRecord(session)) return undefined
  const values = session.projectionValues
  if (!isRecord(values)) return undefined
  const selection = values.modelSelection
  if (!isRecord(selection)) return undefined
  for (const candidate of [selection.next, selection.lastUsed]) {
    if (!isRecord(candidate)) continue
    const provider = candidate.provider
    if (typeof provider === 'string' && provider !== '') return provider
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

function CardAction({ label, disabled = false, onClick, children }: { label: string; disabled?: boolean; onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void; children: ReactNode }) {
  return <span className="dsht3-tooltip">
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}>{children}</button>
    <span role="tooltip">{label}</span>
  </span>
}

function MoreAction({ label, onClick }: { label: string; onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void }) {
  return <span className="dsht3-tooltip dsht3-more-wrap">
    <button type="button" className="dsht3-more" aria-label={label} onClick={onClick}><MoreIcon /></button>
    <span role="tooltip">{label}</span>
  </span>
}

function DraftCloseAction({ label, onClick }: { label: string; onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void }) {
  return <span className="dsht3-tooltip dsht3-more-wrap">
    <button type="button" className="dsht3-more dsht3-draft-close" aria-label={label} onClick={onClick}><CloseIcon size={12} /></button>
    <span role="tooltip">{label}</span>
  </span>
}

function IdentityMark({ card }: { card: Card }) {
  return (
    <span className="dsht3-ident" data-color={card.identity.color} aria-hidden="true">{card.identity.monogram}</span>
  )
}

function MenuButton({ icon, label, danger = false, disabled = false, trailing = false, onClick }: {
  icon: ReactNode
  label: string
  danger?: boolean
  disabled?: boolean
  trailing?: boolean
  onClick: () => void
}) {
  return (
    <button type="button" role="menuitem" className={danger ? 'dsht3-danger' : undefined} disabled={disabled} onClick={onClick}>
      <span className="dsht3-menu-icon">{icon}</span><span>{label}</span>{trailing ? <span className="dsht3-menu-trailing"><ChevronRightIcon /></span> : null}
    </button>
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
    useSessionStatus,
    usePanelInfo,
    useWorkspaces,
    open,
    startSession,
    renameSession,
    forkSession,
    archiveSession,
    createWorkspace,
    searchSessions,
    discardSessionDraft,
    useDirectoryFlow,
    renameWorkspace,
    renderSlot,
    t,
    acpPresent = false,
    mobile = false,
  } = props
  // Official SidebarRoot only forwards { wide, expandSidebar }. Detect the APK
  // shell from MobileFrame's marker instead of waiting for a core change.
  const mobileLayout = mobile === true || (typeof document !== 'undefined' && document.querySelector('[data-dsh-mobile-frame]') !== null)

  const list = useSessions((state) => state)
  const statuses = useSessionStatus((state) => state)
  const panelActive = usePanelInfo((info) => info.activePanelId !== null)
  const retainedCurrent = Object.values(list.byId).find(session => (session.retainedBy.mainView ?? 0) > 0)?.id
  const current = panelActive ? undefined : retainedCurrent
  const workspaces = useWorkspaces((state) => state)
  const directoryFlowAvailable = useDirectoryFlow((occupied) => occupied)
  const [ledger, setLedger] = useState(() => EMPTY_LEDGER)
  const [gitMarks, setGitMarks] = useState<Readonly<Record<string, GitMarks>>>({})
  const sessionIds = list.ids
  const drafts = useSyncExternalStore(
    subscribeDrafts,
    () => draftsSnapshot(sessionIds),
    () => EMPTY_DRAFTS,
  )
  const runtimeProtectedIds = useSyncExternalStore(
    subscribeRuntimeProtection,
    runtimeProtectionSnapshot,
    () => [] as const,
  )
  const [query, setQuery] = useState('')
  const [pickingWorkspace, setPickingWorkspace] = useState(false)
  const [workspaceFilter, setWorkspaceFilter] = useState<string>()
  const [workspaceFilterOpen, setWorkspaceFilterOpen] = useState(false)
  const [workspaceQuery, setWorkspaceQuery] = useState('')
  const [hostHits, setHostHits] = useState<readonly { sessionId: string; snippet: string }[]>([])
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [customUntil, setCustomUntil] = useState('')
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [snoozedOpen, setSnoozedOpen] = useState(true)
  const [settledOpen, setSettledOpen] = useState(() => mobile === true || (typeof document !== 'undefined' && document.querySelector('[data-dsh-mobile-frame]') !== null))
  const [settingsOpenable, setSettingsOpenable] = useState(false)
  const [settledLimit, setSettledLimit] = useState(SETTLED_INITIAL)
  const [now, setNow] = useState(() => Date.now())
  const [flowOpen, setFlowOpen] = useState(false)
  const [flowBusy, setFlowBusy] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<DropHint | null>(null)
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null)
  const dragOverlayRef = useRef<HTMLDivElement>(null)
  const [dragTransforms, setDragTransforms] = useState<Readonly<Record<string, number>>>({})
  const [scrollbar, setScrollbar] = useState<ScrollbarVisual>({ top: 0, height: 0, visible: false })
  const [swipe, setSwipe] = useState<SwipeTrack | null>(null)
  const [swipeError, setSwipeError] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const workspaceFilterRef = useRef<HTMLDivElement>(null)
  const workspaceSearchRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuTriggerRef = useRef<HTMLElement | null>(null)
  const dialogWasOpen = useRef(false)
  const longPress = useRef<{ timer: number; x: number; y: number }>()
  const dragRows = useRef(new Map<string, HTMLDivElement>())
  const dragHitTest = useRef<DragHitTest>()
  const pointerDrag = useRef<{ pointerId: number; sessionId: string; x: number; y: number; clientX: number; clientY: number; scrollTop: number; offsetX: number; offsetY: number; left: number; width: number; height: number; active: boolean; drop: DropHint | undefined }>()
  const swipeTrack = useRef<SwipeTrack>()
  const swipeBusy = useRef(new Set<string>())
  const scrollbarDrag = useRef<{ pointerId: number; y: number; scrollTop: number }>()
  const suppressClick = useRef(false)
  const cancelLongPress = () => {
    window.clearTimeout(longPress.current?.timer)
    longPress.current = undefined
  }
  useEffect(() => cancelLongPress, [])
  const closeMenu = (restoreFocus = true) => {
    setMenu(null)
    setMenuPosition(null)
    if (restoreFocus) menuTriggerRef.current?.focus({ preventScroll: true })
  }
  closeOpenMenu = () => closeMenu(false)
  useEffect(() => () => { closeOpenMenu = undefined }, [])
  const closeDialog = () => setDialog(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), NOW_TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  // Persisted drafts cover every listed Session; transient input state exists only while its probe is mounted.
  const protectionCheckedKey = list.ids.join('\0')
  const protectionIdsKey = useMemo(() => {
    const protectedIds = new Set<string>([...Object.keys(drafts), ...runtimeProtectedIds])
    if (retainedCurrent !== undefined) protectedIds.add(retainedCurrent)
    for (const id of list.ids) {
      const status = statuses.get(id)
      if (status?.running === true || status?.pendingInteraction !== undefined) protectedIds.add(id)
      if (list.jobsBySession[id]?.some(job => job.status === 'running' || job.status === 'stopping')) protectedIds.add(id)
    }
    return [...protectedIds].sort().join('\0')
  }, [drafts, runtimeProtectedIds, retainedCurrent, statuses, list.ids, list.jobsBySession])

  useEffect(() => {
    if (list.phase !== 'ready') return
    const protectedIds = protectionIdsKey === '' ? [] : protectionIdsKey.split('\0')
    const checkedIds = [...new Set([...(protectionCheckedKey === '' ? [] : protectionCheckedKey.split('\0')), ...protectedIds])]
    const sync = () => { void syncProtection(checkedIds, protectedIds).catch(() => {}) }
    sync()
    const timer = window.setInterval(sync, 15_000)
    const onVisible = () => { if (document.visibilityState === 'visible') sync() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', sync)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', sync)
    }
  }, [list.phase, protectionCheckedKey, protectionIdsKey])

  useEffect(() => {
    if (list.phase !== 'ready') return
    let cancelled = false
    const load = () => {
      void loadLedger().then(loaded => {
        if (!cancelled) setLedger(was => loaded.revision > was.revision ? loaded : was)
      }).catch(() => {})
    }
    load()
    const timer = window.setInterval(load, 5_000)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [list.phase])

  const projectWorkspaces = workspaces.items.map((workspace) => ({
    id: workspace.workspaceId,
    title: workspace.title,
    path: workspace.path,
    sessionIds: workspace.sessionIds,
  }))

  const probeSessions = useMemo(() => {
    const rows: { id: string; path: string }[] = []
    for (const id of list.ids) {
      const session = list.byId[id]
      if (session === undefined) continue
      const workspace = workspaces.items.find((item) => item.sessionIds.includes(id))
      const path = session.cwd !== undefined && session.cwd !== '' ? session.cwd : workspace?.path
      if (path === undefined || path === '') continue
      rows.push({ id, path })
    }
    return rows
  }, [list, workspaces])

  useEffect(() => {
    if (list.phase !== 'ready') return
    let cancelled = false
    const load = () => {
      void loadGitMarks(probeSessions).then((marks) => {
        if (!cancelled) setGitMarks(marks)
      })
    }
    load()
    const timer = window.setInterval(load, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [probeSessions, list.phase])

  const filterId = workspaceFilter !== undefined
    && workspaces.items.some((workspace) => workspace.workspaceId === workspaceFilter)
    ? workspaceFilter
    : undefined

  const providers = useMemo(() => providersOf(list), [list])

  const projectSessions = (sessions: Session[]) => project({
    ...(current !== undefined ? { current: current } : {}),
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
      const status = statuses.get(id)
      return [toSession(id, { ...session, running: status?.running ?? session.running, pendingInteraction: status?.pendingInteraction?.kind, completed: status?.completionUnread })]
    })),
    [list, statuses, current, workspaces, ledger.records, drafts, now, filterId, gitMarks, acpPresent, providers],
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
  const syncScrollbar = () => {
    const element = listRef.current
    if (element === null) return
    const visible = element.scrollHeight > element.clientHeight + 1
    const height = visible ? Math.max(28, element.clientHeight * element.clientHeight / element.scrollHeight) : 0
    const top = visible ? (element.clientHeight - height) * element.scrollTop / (element.scrollHeight - element.clientHeight) : 0
    setScrollbar(current => current.visible === visible && Math.abs(current.height - height) < .5 && Math.abs(current.top - top) < .5 ? current : { visible, height, top })
  }

  useLayoutEffect(syncScrollbar, [view, searching, snoozedOpen, settledOpen, settledLimit, dragId])
  useEffect(() => {
    const element = listRef.current
    if (element === null) return
    const observer = new ResizeObserver(syncScrollbar)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const onScrollbarPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const element = listRef.current
    if (element === null) return
    event.preventDefault()
    event.stopPropagation()
    scrollbarDrag.current = { pointerId: event.pointerId, y: event.clientY, scrollTop: element.scrollTop }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onScrollbarPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = scrollbarDrag.current
    const element = listRef.current
    if (drag === undefined || element === null || drag.pointerId !== event.pointerId) return
    const travel = element.clientHeight - scrollbar.height
    if (travel > 0) element.scrollTop = drag.scrollTop + (event.clientY - drag.y) * (element.scrollHeight - element.clientHeight) / travel
  }
  const onScrollbarPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scrollbarDrag.current?.pointerId !== event.pointerId) return
    scrollbarDrag.current = undefined
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

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

  useLayoutEffect(() => {
    if (workspaceFilterOpen) workspaceSearchRef.current?.focus({ preventScroll: true })
  }, [workspaceFilterOpen])

  useEffect(() => {
    if (!workspaceFilterOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!workspaceFilterRef.current?.contains(event.target as Node)) setWorkspaceFilterOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setWorkspaceFilterOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [workspaceFilterOpen])

  useEffect(() => {
    if (menu === null) return
    const close = () => closeMenu(false)
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeMenu()
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
    }
  }, [menu])

  useLayoutEffect(() => {
    if (dialog !== null) {
      dialogWasOpen.current = true
      return
    }
    if (!dialogWasOpen.current) return
    dialogWasOpen.current = false
    menuTriggerRef.current?.focus({ preventScroll: true })
  }, [dialog])

  useEffect(() => {
    if (dialog === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      closeDialog()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [dialog])

  useLayoutEffect(() => {
    const element = menuRef.current
    if (menu === null || element === null) {
      setMenuPosition(null)
      return
    }
    const box = element.getBoundingClientRect()
    const originX = box.left - (menuPosition?.x ?? 0)
    const originY = box.top - (menuPosition?.y ?? 0)
    const placed = placeMenu(menu.anchor, { width: box.width, height: box.height }, { width: window.innerWidth, height: window.innerHeight })
    const next = { x: placed.x - originX, y: placed.y - originY }
    if (menuPosition === null || Math.abs(menuPosition.x - next.x) > 0.5 || Math.abs(menuPosition.y - next.y) > 0.5) {
      setMenuPosition(next)
    }
    element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
  }, [menu, menuPosition])

  const cardFromHostHit = (sessionId: string, snippet: string): Card | undefined => {
    if (workspaces.archivedSessionIds.includes(sessionId as never)) return undefined
    const session = list.byId[sessionId as never]
    if (session === undefined) {
      return {
        sessionId,
        workspaceTitle: '',
        sessionTitle: snippet,
        identity: { monogram: 'WS', color: 'gray' },
        selected: current === sessionId,
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
  const onPickWorkspace = (workspaceId: string) => {
    setPickingWorkspace(false)
    startSession(workspaceId as never)
  }
  const send = async (command: Command): Promise<boolean> => {
    try {
      const next = await applyLedger(command, ledger.revision)
      if (next !== undefined) {
        setLedger(next)
        return true
      }
      const loaded = await loadLedger()
      const retried = await applyLedger(command, loaded.revision)
      setLedger(retried ?? loaded)
      return retried !== undefined
    } catch {
      return false
    }
  }
  const archivedIdsKey = workspaces.archivedSessionIds.join('\0')
  useEffect(() => {
    if (list.phase !== 'ready') return
    const archived = new Set(workspaces.archivedSessionIds)
    send({ type: 'Gc', livingIds: list.ids.filter(id => !archived.has(id as never)) })
  }, [list.phase, protectionCheckedKey, archivedIdsKey])

  const onTogglePin = (sessionId: string, isPinned: boolean) => {
    send(isPinned ? { type: 'Unpin', sessionId } : { type: 'Pin', sessionId })
  }
  const canSnooze = (sessionId: string) => {
    const status = statuses.get(sessionId as never)
    return !snoozedIds.has(sessionId) && !settledIds.has(sessionId) && status?.running !== true && status?.pendingInteraction === undefined
  }
  const canSettle = (sessionId: string) => {
    const status = statuses.get(sessionId as never)
    return !snoozedIds.has(sessionId) && !settledIds.has(sessionId) && status?.running !== true && status?.pendingInteraction === undefined
  }
  const onSnooze = (sessionId: string, until: number) => {
    if (!canSnooze(sessionId)) return
    send({ type: 'Snooze', sessionId, until })
  }
  const onSettle = (sessionId: string) => {
    if (!canSettle(sessionId)) return
    void send({ type: 'Settle', sessionId, at: Date.now() })
  }
  const swipeActionFor = (sessionId: string): SwipeAction | undefined => {
    if (settledIds.has(sessionId)) return 'unsettle'
    if (snoozedIds.has(sessionId)) return 'wake'
    return canSettle(sessionId) ? 'settle' : undefined
  }

  const openMenu = (event: ReactMouseEvent, id: string, snooze = false) => {
    event.preventDefault()
    event.stopPropagation()
    const trigger = event.currentTarget as HTMLElement
    menuTriggerRef.current = trigger
    setCustomUntil(toDatetimeLocal(Date.now() + HOUR_MS))
    setMenuPosition(null)
    setMenu({ id, anchor: trigger.getBoundingClientRect(), snooze })
  }
  const openMenuForSwipe = (id: string, snooze = false) => {
    const trigger = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-session-id]') ?? [])].find(node => node.dataset.sessionId === id)
    if (trigger === undefined) return
    menuTriggerRef.current = trigger
    setCustomUntil(toDatetimeLocal(Date.now() + HOUR_MS))
    setMenuPosition(null)
    setMenu({ id, anchor: trigger.getBoundingClientRect(), snooze })
  }

  const runSwipeAction = (sessionId: string, action: SwipeAction) => {
    if (swipeBusy.current.has(sessionId)) return
    const command: Command = action === 'settle'
      ? { type: 'Settle', sessionId, at: Date.now() }
      : action === 'unsettle'
        ? { type: 'Unsettle', sessionId, at: Date.now() }
        : { type: 'Wake', sessionId, at: Date.now() }
    swipeBusy.current.add(sessionId)
    setSwipe(null)
    setSwipeError(false)
    void send(command).then(ok => { if (!ok) setSwipeError(true) }).finally(() => { swipeBusy.current.delete(sessionId) })
  }

  const registerDragRow = (sessionId: string) => (node: HTMLDivElement | null) => {
    if (node === null) dragRows.current.delete(sessionId)
    else dragRows.current.set(sessionId, node)
  }
  const dragRowStyle = (sessionId: string) => {
    const offset = dragTransforms[sessionId]
    return offset === undefined || offset === 0 ? undefined : { transform: `translate3d(0, ${offset}px, 0)` }
  }
  const targetAdvance = (dest: DropDest) => (dragOverlayRef.current?.getBoundingClientRect().height ?? 0)
    + (dest === 'settled' ? 0 : 8) // Full rows have an 8px trailing gap.
  const shelfDragOffset = (shelf: Shelf, sessionId: string, dest: DropDest) => {
    const row = dragRows.current.get(sessionId)
    return row === undefined ? 0 : dragShelfOffset(shelf, shelfOf(sessionId), dest, rowAdvance(row), targetAdvance(dest))
  }
  const shelfDragStyle = (shelf: Shelf) => {
    const offset = dragId === null || dropHint === null ? 0 : shelfDragOffset(shelf, dragId, dropHint.dest)
    return offset === 0 ? undefined : { transform: `translate3d(0, ${offset}px, 0)` }
  }
  const shelfTailStyle = (shelf: DropDest) => {
    if (dragId === null || dropHint === null || shelfOf(dragId) === dropHint.dest) return undefined
    const source = dragRows.current.get(dragId)
    const offset = (dropHint.dest === shelf ? targetAdvance(shelf) : 0)
      - (shelfOf(dragId) === shelf && source !== undefined ? rowAdvance(source) : 0)
    return offset === 0 ? undefined : { transform: `translate3d(0, ${offset}px, 0)` }
  }
  const dragGroupsFromDom = (): DragPreviewGroups => {
    const groups: Record<DropDest, string[]> = { pinned: [], active: [], settled: [] }
    for (const row of listRef.current?.querySelectorAll<HTMLElement>('section[data-drop-dest] > [data-session-id]') ?? []) {
      const dest = row.parentElement?.dataset.dropDest
      const id = row.dataset.sessionId
      if (id !== undefined && (dest === 'pinned' || dest === 'active' || dest === 'settled')) groups[dest].push(id)
    }
    return groups
  }
  const rowAdvance = (row: HTMLElement) => {
    const margin = Number.parseFloat(window.getComputedStyle(row).marginBottom)
    return row.getBoundingClientRect().height + (Number.isFinite(margin) ? margin : 0)
  }
  const clampDragVisual = (drag: NonNullable<typeof pointerDrag.current>, x: number, y: number): DragVisual => {
    const list = listRef.current?.getBoundingClientRect()
    const height = dragOverlayRef.current?.getBoundingClientRect().height ?? drag.height
    const wantedTop = y - drag.offsetY * height / drag.height
    const wantedLeft = x - drag.offsetX
    if (list === undefined) return { top: wantedTop, left: drag.left, width: drag.width, height: drag.height }
    const pinnedLabelBottom = listRef.current?.querySelector('.dsht3-pinned > .dsht3-shelf-head')?.getBoundingClientRect().bottom ?? list.top
    const minTop = Math.max(list.top, pinnedLabelBottom)
    const maxTop = Math.max(minTop, list.bottom - height)
    const maxLeft = Math.max(list.left, list.right - drag.width)
    return {
      top: Math.max(minTop, Math.min(maxTop, wantedTop)),
      left: Math.max(list.left, Math.min(maxLeft, wantedLeft)),
      width: drag.width,
      height,
    }
  }
  const dropAtPointer = (drag: NonNullable<typeof pointerDrag.current>, x: number, y: number): DropHint | undefined => {
    const groups = dragGroupsFromDom()
    const stabilize = (candidate: DropHint): DropHint => {
      const previous = drag.drop
      if (previous === undefined || previous.dest === candidate.dest) return candidate
      const order: readonly DropDest[] = ['pinned', 'active', 'settled']
      const direction = y - drag.clientY + (listRef.current?.scrollTop ?? 0) - drag.scrollTop
      // A resizing preview cannot switch shelves underneath a stationary pointer.
      const heading = listRef.current?.querySelector(`section[data-drop-dest="${candidate.dest}"] > .dsht3-shelf-head`)?.getBoundingClientRect()
      if (direction !== 0 && heading !== undefined && y >= heading.top && y <= heading.bottom) return candidate
      if ((order.indexOf(candidate.dest) - order.indexOf(previous.dest)) * direction <= 0) return previous
      return candidate
    }
    const hit = dragHitTest.current
    const scrollDelta = hit === undefined || listRef.current === null ? 0 : listRef.current.scrollTop - hit.scrollTop
    // A shelf owns the space from its live heading to the next heading, including whitespace.
    // Read animated/expanded/scrolled positions now; stabilize() prevents layout-driven reversals.
    const candidates = (['pinned', 'active', 'settled'] as const).flatMap(dest => {
      const heading = listRef.current?.querySelector(`section[data-drop-dest="${dest}"] > .dsht3-shelf-head`)
      if (heading == null) return []
      const bounds = heading.getBoundingClientRect()
      return x >= bounds.left && x <= bounds.right ? [{ dest, top: bounds.top }] : []
    })
    const section = candidates.findLast(candidate => y >= candidate.top) ?? candidates[0]
    if (hit !== undefined && section !== undefined) {
      // New settlements sort first; existing settled rows are not manually reordered.
      if (section.dest === 'settled') return stabilize({ dest: 'settled', index: Math.max(0, groups.settled.indexOf(drag.sessionId)) })
      const rowOffset = shelfDragOffset(section.dest, drag.sessionId, drag.drop?.dest ?? section.dest)
      const rows = hit.rows.filter(row => row.dest === section.dest)
      let index = rows.length
      for (const row of rows) {
        if (y < (row.top + row.bottom) / 2 + rowOffset - scrollDelta) {
          index = row.index
          break
        }
      }
      return stabilize({ dest: section.dest, index: normalizedDropIndex(drag.sessionId, section.dest, index, groups) })
    }
    const target = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-dest]')
    const rawIndex = Number(target?.dataset.dropIndex)
    const rawDest = target?.dataset.dropDest
    if ((rawDest !== 'pinned' && rawDest !== 'active' && rawDest !== 'settled') || !Number.isSafeInteger(rawIndex)) return undefined
    return stabilize({ dest: rawDest, index: normalizedDropIndex(drag.sessionId, rawDest, rawIndex, groups) })
  }
  const updatePointerDrag = (drag: NonNullable<typeof pointerDrag.current>, x: number, y: number) => {
    drag.drop = dropAtPointer(drag, x, y)
    drag.clientX = x
    drag.clientY = y
    drag.scrollTop = listRef.current?.scrollTop ?? 0
    setDragVisual(clampDragVisual(drag, x, y))
    setDropHint(drag.drop ?? null)
  }
  const finishSwipe = (pointerId: number, commit: boolean) => {
    const track = swipeTrack.current
    if (track === undefined || track.pointerId !== pointerId) return
    swipeTrack.current = undefined
    cancelLongPress()
    if (rootRef.current?.hasPointerCapture(pointerId)) rootRef.current.releasePointerCapture(pointerId)
    if (!track.locked || !commit || track.action === undefined) {
      setSwipe(null)
      return
    }
    const revealWidth = track.action === 'settle' ? 144 : 84
    if (-track.dx >= track.width * 0.65) {
      runSwipeAction(track.sessionId, track.action)
    } else if (-track.dx >= revealWidth) {
      setSwipe({ ...track, dx: -Math.min(revealWidth, track.width - 1) })
    } else {
      setSwipe(null)
    }
  }

  const onPointerStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    cancelLongPress()
    suppressClick.current = false
    const target = event.target as HTMLElement
    const row = target.closest<HTMLElement>('[data-session-id]')
    const id = row?.dataset.sessionId
    if (row === null || row === undefined || id === undefined) return
    if (event.pointerType === 'touch') {
      const interactive = target.closest('button,input,a,select,[data-dsh-mobile-swipe-action]') !== null
      const trigger = row.querySelector<HTMLElement>('.dsht3-card') ?? row
      if (mobileLayout && !interactive) {
        const bounds = row.getBoundingClientRect()
        swipeTrack.current = { pointerId: event.pointerId, sessionId: id, startX: event.clientX, startY: event.clientY, width: bounds.width, dx: 0, locked: false, action: swipeActionFor(id) }
        setSwipe(null)
      }
      if (interactive) return
      longPress.current = { x: event.clientX, y: event.clientY, timer: window.setTimeout(() => {
        if (mobileLayout) {
          const active = swipeTrack.current
          if (active?.pointerId !== event.pointerId || active.locked) return
          swipeTrack.current = undefined
        }
        suppressClick.current = true
        menuTriggerRef.current = trigger
        setCustomUntil(toDatetimeLocal(Date.now() + HOUR_MS))
        setMenuPosition(null)
        setMenu({ id, anchor: row.getBoundingClientRect(), snooze: false })
      }, 500) }
      return
    }
    if (event.button !== 0 || row.dataset.dragId === undefined || (event.target as HTMLElement).closest('button,input,a,select')) return
    const bounds = row.getBoundingClientRect()
    dragHitTest.current = undefined
    pointerDrag.current = { pointerId: event.pointerId, sessionId: row.dataset.dragId, x: event.clientX, y: event.clientY, clientX: event.clientX, clientY: event.clientY, scrollTop: listRef.current?.scrollTop ?? 0, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top, left: bounds.left, width: bounds.width, height: bounds.height, active: false, drop: undefined }
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const press = longPress.current
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) cancelLongPress()
    const touch = swipeTrack.current
    if (touch !== undefined && touch.pointerId === event.pointerId) {
      const dx = event.clientX - touch.startX
      const dy = event.clientY - touch.startY
      if (!touch.locked) {
        if (touch.action === undefined || Math.abs(dx) <= 12) {
          if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) {
            swipeTrack.current = undefined
            setSwipe(null)
          }
        } else if (dx >= 0 || Math.abs(dx) <= Math.abs(dy) * 1.4) {
          swipeTrack.current = undefined
          setSwipe(null)
        } else {
          touch.locked = true
          cancelLongPress()
          suppressClick.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
        }
      }
      if (touch.locked) {
        event.preventDefault()
        touch.dx = Math.max(-touch.width, Math.min(0, dx))
        setSwipe({ ...touch })
        return
      }
    }
    const drag = pointerDrag.current
    if (drag === undefined || drag.pointerId !== event.pointerId) return
    if (drag.active && event.pointerType === 'mouse' && event.buttons === 0) {
      finishPointerDrag(event.pointerId, false)
      return
    }
    if (!drag.active) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= 5) return
      drag.active = true
      suppressClick.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      setDragId(drag.sessionId)
    }
    event.preventDefault()
    updatePointerDrag(drag, event.clientX, event.clientY)
  }
  const finishPointerDrag = (pointerId: number, commit: boolean) => {
    cancelLongPress()
    const drag = pointerDrag.current
    if (drag === undefined || drag.pointerId !== pointerId) return
    pointerDrag.current = undefined
    dragHitTest.current = undefined
    if (rootRef.current?.hasPointerCapture(pointerId)) rootRef.current.releasePointerCapture(pointerId)
    setDragId(null)
    setDropHint(null)
    setDragVisual(null)
    setDragTransforms({})
    if (!commit || !drag.active || drag.drop === undefined) return
    const command = commandForDrop(drag.sessionId, drag.drop.dest, drag.drop.index)
    if (command !== undefined) send(command)
  }

  const started = (id: string) => list.byId[id as never]?.blank !== true
  const dragging = dragId !== null

  useLayoutEffect(() => {
    if (!dragging || dragId === null || listRef.current === null) {
      dragHitTest.current = undefined
      return
    }
    const list = listRef.current
    const rows: DragHitTest['rows'][number][] = []
    const groups = dragGroupsFromDom()
    for (const row of list.querySelectorAll<HTMLElement>('section[data-drop-dest] > [data-session-id]')) {
      const dest = row.parentElement?.dataset.dropDest
      const index = dest === 'pinned' || dest === 'active' || dest === 'settled' ? groups[dest].indexOf(row.dataset.sessionId!) : -1
      if ((dest !== 'pinned' && dest !== 'active' && dest !== 'settled') || !Number.isSafeInteger(index)) continue
      const bounds = row.getBoundingClientRect()
      const shelf = row.closest('.dsht3-shelf')
      const offset = new DOMMatrix(getComputedStyle(row).transform).m42
        + (shelf === null ? 0 : new DOMMatrix(getComputedStyle(shelf).transform).m42)
      rows.push({ dest, index, top: bounds.top - offset, bottom: bounds.bottom - offset })
    }
    dragHitTest.current = { scrollTop: list.scrollTop, rows }
  }, [dragId, dragging, settledOpen, snoozedOpen, settledLimit])

  useLayoutEffect(() => {
    const overlay = dragOverlayRef.current
    if (!dragging || overlay === null) return
    const measure = () => {
      const drag = pointerDrag.current
      if (drag?.active) setDragVisual(clampDragVisual(drag, drag.clientX, drag.clientY))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(overlay)
    return () => observer.disconnect()
  }, [dragging, dropHint?.dest])

  useLayoutEffect(() => {
    if (!dragging || dragId === null || dropHint === null) {
      setDragTransforms(previous => Object.keys(previous).length === 0 ? previous : {})
      return
    }
    const source = dragRows.current.get(dragId)
    if (source === undefined) return
    const next = dragPreviewTranslations({ groups: dragGroupsFromDom(), sessionId: dragId, drop: dropHint, rowAdvance: rowAdvance(source), targetAdvance: targetAdvance(dropHint.dest) })
    setDragTransforms(previous => {
      const keys = Object.keys(previous)
      const nextKeys = Object.keys(next)
      if (keys.length === nextKeys.length && nextKeys.every(key => previous[key] === next[key])) return previous
      return next
    })
  }, [dragId, dragging, dropHint, dragVisual?.height])

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
  const moveCommandFor = (sessionId: string, delta: -1 | 1): Command | undefined => {
    const dest = pinnedIds.has(sessionId) ? 'pinned' : shelfOf(sessionId) === 'active' ? 'active' : undefined
    if (dest === undefined) return undefined
    const ids = dest === 'pinned' ? view.shelves.pinned.map(card => card.sessionId) : view.shelves.active.map(card => card.sessionId)
    const index = ids.indexOf(sessionId)
    if (index < 0 || index + delta < 0 || index + delta >= ids.length) return undefined
    return commandForDrop(sessionId, dest, index + delta)
  }

  useEffect(() => {
    if (!dragging) return
    const finish = (event: PointerEvent) => finishPointerDrag(event.pointerId, true)
    const cancel = (event: PointerEvent) => finishPointerDrag(event.pointerId, false)
    const cancelAll = () => {
      const pointerId = pointerDrag.current?.pointerId
      if (pointerId !== undefined) finishPointerDrag(pointerId, false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      cancelAll()
    }
    window.addEventListener('pointerup', finish, true)
    window.addEventListener('pointercancel', cancel, true)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('blur', cancelAll)
    window.addEventListener('pagehide', cancelAll)
    window.addEventListener('resize', cancelAll)
    return () => {
      window.removeEventListener('pointerup', finish, true)
      window.removeEventListener('pointercancel', cancel, true)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('blur', cancelAll)
      window.removeEventListener('pagehide', cancelAll)
      window.removeEventListener('resize', cancelAll)
    }
  }, [dragging, dropHint])

  useLayoutEffect(() => {
    let defaulted = false
    const expandSettled = () => {
      if (defaulted || document.querySelector('[data-dsh-mobile-frame]') === null) return
      defaulted = true
      setSettledOpen(true)
    }
    expandSettled()
    const syncSettings = () => setSettingsOpenable(document.querySelector('[data-slot="settings.trigger"]') !== null)
    syncSettings()
    const observer = new MutationObserver(() => { expandSettled(); syncSettings() })
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-dsh-mobile-frame'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.addEventListener(PLATFORM_BACK_EVENT, onMobilePlatformBack, true)
    return () => document.removeEventListener(PLATFORM_BACK_EVENT, onMobilePlatformBack, true)
  }, [])

  useEffect(() => {
    if (mobileDrawerBoot.started === 0) mobileDrawerBoot.started = Date.now()
    let cancelled = false
    let observer: MutationObserver | undefined
    let interval = 0
    let timeout = 0
    const remaining = Math.max(0, MOBILE_DRAWER_BOOT_MS - (Date.now() - mobileDrawerBoot.started))
    const stop = () => {
      observer?.disconnect()
      window.clearInterval(interval)
      window.clearTimeout(timeout)
      document.removeEventListener('click', onSessionOpen, true)
    }
    const onSessionOpen = (event: Event) => {
      if (!(event.target instanceof Element)) return
      if (event.target.closest('[data-dsh-mobile-session-nav], [data-dsh-mobile-close]') === null) return
      mobileDrawerBoot.userClosed = true
      stop()
    }
    const tick = (): boolean => {
      if (cancelled || mobileDrawerBoot.userClosed) return true
      const now = Date.now()
      if (now - mobileDrawerBoot.started > MOBILE_DRAWER_BOOT_MS) return true
      if (mobileDrawerIsOpen()) {
        mobileDrawerBoot.seenOpen = true
        return true
      }
      if (document.querySelector('[data-dsh-mobile-frame]') === null) return false
      if (mobileDrawerBoot.poked >= 2) return true
      if (mobileDrawerBoot.poked > 0 && now - mobileDrawerBoot.lastAt < MOBILE_DRAWER_RETRY_MS) return false
      mobileDrawerBoot.poked += 1
      mobileDrawerBoot.lastAt = now
      pokeMobileDrawer(true)
      return mobileDrawerIsOpen()
    }
    document.addEventListener('click', onSessionOpen, true)
    if (tick()) {
      document.removeEventListener('click', onSessionOpen, true)
      return
    }
    observer = new MutationObserver(() => { if (tick()) stop() })
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-dsh-mobile-frame', 'data-drawer-open'] })
    interval = window.setInterval(() => { if (tick()) stop() }, 50)
    timeout = window.setTimeout(stop, remaining || MOBILE_DRAWER_BOOT_MS)
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  useEffect(() => {
    if (!mobileLayout) return
    const cancel = () => {
      const pointerId = swipeTrack.current?.pointerId
      if (pointerId !== undefined && rootRef.current?.hasPointerCapture(pointerId)) rootRef.current.releasePointerCapture(pointerId)
      swipeTrack.current = undefined
      cancelLongPress()
      setSwipe(null)
    }
    window.addEventListener('blur', cancel)
    window.addEventListener('pagehide', cancel)
    window.addEventListener('resize', cancel)
    document.addEventListener('visibilitychange', cancel)
    return () => {
      window.removeEventListener('blur', cancel)
      window.removeEventListener('pagehide', cancel)
      window.removeEventListener('resize', cancel)
      document.removeEventListener('visibilitychange', cancel)
    }
  }, [mobileLayout])

  useEffect(() => {
    if (!dragging) return
    let frame = 0
    const edge = 36
    const tick = () => {
      const drag = pointerDrag.current
      const list = listRef.current
      if (drag?.active === true && list !== null) {
        const bounds = list.getBoundingClientRect()
        const topDistance = bounds.top + edge - drag.clientY
        const bottomDistance = drag.clientY - (bounds.bottom - edge)
        const delta = topDistance > 0
          ? -Math.min(14, Math.max(1, Math.ceil(topDistance / edge * 14)))
          : bottomDistance > 0
            ? Math.min(14, Math.max(1, Math.ceil(bottomDistance / edge * 14)))
            : 0
        if (delta !== 0) {
          const before = list.scrollTop
          list.scrollTop += delta
          if (list.scrollTop !== before) updatePointerDrag(drag, drag.clientX, drag.clientY)
        }
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [dragging])

  const bindDest = (dest: DropDest, index: number) => ({
    'data-drop-dest': dest,
    'data-drop-index': index,
  })

  const bindDrag = (sessionId: string, drop?: DropHint) => ({
    'data-drag-id': sessionId,
    ...(drop === undefined ? {} : bindDest(drop.dest, drop.index)),
  })

  const dragVerb = (sessionId: string) => {
    if (dragId !== sessionId || dropHint === null) return null
    const key = dropVerbOf(dropHint.dest, shelfOf(sessionId))
    if (key === undefined) return null
    return <span className="dsht3-verb">{t(key)}</span>
  }
  const settledCrossTarget = dropHint?.dest === 'settled'
  const shelfHead = (dest: 'pinned' | 'active') => {
    if (!dragging) return null
    const crossTarget = dropHint?.dest === dest
    return <div className={`dsht3-shead dsht3-shelf-head${crossTarget ? ' dsht3-cross-target' : ''}`}><span>{t(`shelf.${dest}`)}</span><span className="dsht3-rule" /></div>
  }

  const openOnKey = (sessionId: string) => (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onOpen(sessionId)
  }

  const rowClass = (card: Card) =>
    `dsht3-row${card.selected ? ' dsht3-on' : ''}${card.unsentDraft === true ? ' dsht3-has-draft' : ''}${dragId === card.sessionId ? ' dsht3-dragging' : ''}`

  const swipeCardStyle = (sessionId: string) => {
    if (swipe?.sessionId !== sessionId) return undefined
    return { transform: `translate3d(${swipe.dx}px, 0, 0)` }
  }
  const renderSwipeActions = (card: Card) => {
    if (!mobileLayout) return null
    const action = swipeActionFor(card.sessionId)
    if (action === undefined) return null
    const label = action === 'settle' ? t('settle') : action === 'unsettle' ? t('unsettle') : t('wake')
    const icon = action === 'settle' ? <CheckIcon /> : <RestoreIcon />
    return (
      <span className="dsht3-swipe-actions" aria-label={t('menu.aria')}>
        <button type="button" className="dsht3-swipe-action dsht3-swipe-primary" data-dsh-mobile-swipe-action data-dsh-mobile-session-action aria-label={label} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); runSwipeAction(card.sessionId, action) }}>
          {icon}<span>{label}</span>
        </button>
        {action === 'settle' ? (
          <button type="button" className="dsht3-swipe-action" data-dsh-mobile-swipe-action data-dsh-mobile-session-action aria-label={t('menu.snooze')} onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); openMenuForSwipe(card.sessionId, true) }}>
            <ClockIcon /><span>{t('menu.snooze')}</span>
          </button>
        ) : null}
      </span>
    )
  }

  const cardBody = (card: Card, actions?: ReactNode) => {
    const meta = lineOneMeta(card, t)
    const marks = card.marks
    const worktree = worktreeLabel(card)
    const hasMarks = marks?.branch !== undefined || worktree !== undefined || marks?.pr !== undefined || marks?.runtime !== undefined
    return (
      <>
        <span className="dsht3-line1">
          <IdentityMark card={card} />
          <span className="dsht3-ws">{card.workspaceTitle}</span>
          {meta === '' && actions === undefined ? null : (
            <span className="dsht3-status-slot">
              {meta === '' ? null : (
                <span className={`dsht3-meta${card.liveStatus === undefined ? '' : ` dsht3-live dsht3-live-${card.liveStatus}`}`}>
                  {card.liveStatus === undefined ? null : <LiveStatusIcon status={card.liveStatus} />}
                  {meta}
                </span>
              )}
              {actions}
            </span>
          )}
        </span>
        <span className="dsht3-line2">
          {card.unsentDraft === true ? (
            <span className="dsht3-pen" aria-label={t('draft.pen')}><PenIcon size={12} /></span>
          ) : null}
          {card.sessionTitle}
        </span>
        {hasMarks ? (
          <span className="dsht3-line3">
            {marks?.branch === undefined ? null : <span className="dsht3-git"><BranchIcon />{marks.branch}</span>}
            {worktree === undefined ? null : <span className="dsht3-mark" title={worktree}><WorktreeIcon />{worktree === 'worktree' ? null : worktree}</span>}
            {marks?.pr === undefined ? null : <span className="dsht3-mark"><BranchIcon />{marks.pr}</span>}
            {marks?.runtime === undefined ? null : <RuntimeMark runtime={marks.runtime} t={t} />}
          </span>
        ) : null}
      </>
    )
  }

  const renderDraft = (card: Card) => (
    <div key={card.sessionId} data-session-id={card.sessionId}
         data-swipe-open={swipe?.sessionId === card.sessionId ? '' : undefined} ref={registerDragRow(card.sessionId)} style={dragRowStyle(card.sessionId)} className={`dsht3-row dsht3-draft${card.selected ? ' dsht3-on' : ''}`} onContextMenu={(event) => openMenu(event, card.sessionId)}>
      <button
        type="button"
        className="dsht3-card"
           data-dsh-mobile-session-nav={mobileLayout ? '' : undefined}
           style={swipeCardStyle(card.sessionId)}
        aria-current={card.selected ? true : undefined}
        onClick={() => onOpen(card.sessionId)}
      >
        {cardBody(card)}
      </button>
      <DraftCloseAction label={t('draft.discard')} onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        discardSessionDraft(card.sessionId)
      }} />
    </div>
  )

  const renderSnoozed = (card: Card) => {
    const until = card.wakeAt
    return (
      <div
        key={card.sessionId} data-session-id={card.sessionId}
         data-swipe-open={swipe?.sessionId === card.sessionId ? '' : undefined}
        ref={registerDragRow(card.sessionId)}
        style={dragRowStyle(card.sessionId)}
        className={`${rowClass(card)} dsht3-slim`}
        {...(searching ? {} : bindDrag(card.sessionId))}
        onContextMenu={(event) => openMenu(event, card.sessionId)}
      >
        <div
          className="dsht3-card"
           data-dsh-mobile-session-nav={mobileLayout ? '' : undefined}
           style={swipeCardStyle(card.sessionId)}
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
        <MoreAction label={t('menu.more')} onClick={(event) => openMenu(event, card.sessionId)} />
        {renderSwipeActions(card)}
         {dragVerb(card.sessionId)}
      </div>
    )
  }

  const settledCardBody = (card: Card, actions?: ReactNode) => (
    <span className="dsht3-line1">
      <IdentityMark card={card} />
      <span className="dsht3-title">{card.sessionTitle}</span>
      {card.marks?.pr ? <span className="dsht3-meta">{card.marks.pr}</span> : null}
      <span className="dsht3-status-slot">
        <span className="dsht3-meta" title={card.settledAt === undefined ? undefined : `${t('shelf.settled')} · ${new Date(card.settledAt).toLocaleString()}`}>{card.settledAt === undefined ? t('settle') : formatRelative(relativeTimeOf(card.settledAt, now), t)}</span>
        {actions}
      </span>
    </span>
  )

  const renderSettled = (card: Card, index = 0) => {
    return (
      <div
        key={card.sessionId} data-session-id={card.sessionId}
         data-swipe-open={swipe?.sessionId === card.sessionId ? '' : undefined}
        ref={registerDragRow(card.sessionId)}
        style={dragRowStyle(card.sessionId)}
        className={`${rowClass(card)} dsht3-slim`}
        {...(searching ? {} : bindDrag(card.sessionId, { dest: 'settled', index }))}
        onContextMenu={(event) => openMenu(event, card.sessionId)}
      >
        <div
          className="dsht3-card"
           data-dsh-mobile-session-nav={mobileLayout ? '' : undefined}
           style={swipeCardStyle(card.sessionId)}
          role="button"
          tabIndex={0}
          aria-current={card.selected ? true : undefined}
          onClick={() => onOpen(card.sessionId)}
          onKeyDown={openOnKey(card.sessionId)}
        >
          {settledCardBody(card, <span className="dsht3-card-actions" data-dsh-mobile-session-action={mobileLayout ? '' : undefined}>
            <CardAction label={t('unsettle')} onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              send({ type: 'Unsettle', sessionId: card.sessionId })
            }}><RestoreIcon /></CardAction>
            <CardAction label={t('menu.more')} onClick={(event) => openMenu(event, card.sessionId)}><MoreIcon /></CardAction>
          </span>)}
        </div>
        {renderSwipeActions(card)}
         {dragVerb(card.sessionId)}
      </div>
    )
  }

  const cardActions = (card: Card) => {
    const snoozeDisabled = !canSnooze(card.sessionId)
    const settleDisabled = !canSettle(card.sessionId)
    const label = (key: 'menu.snooze' | 'settle', disabled: boolean) => disabled ? `${t(key)} — ${t('action.unavailable')}` : t(key)
    return (
      <span className="dsht3-card-actions" data-dsh-mobile-session-action={mobileLayout ? '' : undefined}>
        {card.unsentDraft === true ? <span className="dsht3-draft-close"><CardAction label={t('draft.discard')} onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          discardSessionDraft(card.sessionId)
        }}><CloseIcon size={12} /></CardAction></span> : null}
        {pinnedIds.has(card.sessionId) ? <CardAction label={t('unpin')} onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onTogglePin(card.sessionId, true)
        }}><PinIcon /></CardAction> : null}
        <CardAction label={label('menu.snooze', snoozeDisabled)} disabled={snoozeDisabled} onClick={(event) => openMenu(event, card.sessionId, true)}><ClockIcon /></CardAction>
        <CardAction label={label('settle', settleDisabled)} disabled={settleDisabled} onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onSettle(card.sessionId)
        }}><CheckIcon /></CardAction>
        <CardAction label={t('menu.more')} onClick={(event) => openMenu(event, card.sessionId)}><MoreIcon /></CardAction>
      </span>
    )
  }

  const renderCard = (card: Card, drop?: DropHint) => {
    if (draftIds.has(card.sessionId) || (!started(card.sessionId) && drafts[card.sessionId])) {
      return renderDraft(card)
    }
    if (!searching && snoozedIds.has(card.sessionId)) return renderSnoozed(card)
    if (!searching && (settledIds.has(card.sessionId) || card.slim === true)) return renderSettled(card, drop?.index)
    return (
      <div
        key={card.sessionId} data-session-id={card.sessionId}
         data-swipe-open={swipe?.sessionId === card.sessionId ? '' : undefined}
        ref={registerDragRow(card.sessionId)}
        style={dragRowStyle(card.sessionId)}
        className={rowClass(card)}
        {...(searching || !started(card.sessionId) ? {} : bindDrag(card.sessionId, drop))}
        onContextMenu={(event) => openMenu(event, card.sessionId)}
      >
        <div
          className="dsht3-card"
           data-dsh-mobile-session-nav={mobileLayout ? '' : undefined}
           style={swipeCardStyle(card.sessionId)}
          role="button"
          tabIndex={0}
          aria-current={card.selected ? true : undefined}
          onClick={() => onOpen(card.sessionId)}
          onKeyDown={openOnKey(card.sessionId)}
        >
          {cardBody(card, started(card.sessionId) ? cardActions(card) : undefined)}
        </div>
        {renderSwipeActions(card)}
         {dragVerb(card.sessionId)}
      </div>
    )
  }

  const workspaceFor = (sessionId: string) => workspaces.items.find((item) => item.sessionIds.includes(sessionId as never))
  const openDialog = (kind: DialogState['kind'], id: string) => {
    const session = list.byId[id as never]
    const workspace = workspaceFor(id)
    const value = kind === 'rename-workspace' ? workspace?.title ?? '' : session?.displayTitle ?? ''
    closeMenu(false)
    setDialog({ kind, id, value })
  }
  const submitDialog = (event: ReactFormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (dialog === null) return
    const current = dialog
    closeDialog()
    if (current.kind === 'rename-session') {
      if (current.value.trim() !== '') void renameSession(current.id as never, current.value.trim())
      return
    }
    if (current.kind === 'rename-workspace') {
      const workspace = workspaceFor(current.id)
      if (workspace !== undefined && current.value.trim() !== '') void renameWorkspace(workspace.workspaceId as never, current.value.trim())
      return
    }
    void archiveSession(current.id as never)
  }
  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
    buttons[next]?.focus()
  }

  const canRaiseDirectoryFlow = directoryFlowAvailable && renderSlot !== undefined
  const directoryFlow = flowOpen && canRaiseDirectoryFlow
    ? renderSlot('t3-taskbar.directoryFlow', {
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
      <div ref={rootRef} className="dsht3-rail">
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
  const settledCount = settledVisibleCount(settled.map((card) => card.sessionId), current, settledLimit)
  const visibleSettled = settled.slice(0, settledCount)
  const settledRemaining = settled.length - settledCount
  const unsentDrafts = view.unsentDrafts
  const dragCard = dragId === null ? undefined : cards.find(card => card.sessionId === dragId)
  const dragShelf = dropHint?.dest ?? (dragId === null ? undefined : shelfOf(dragId))
  const dragSlim = dragShelf === 'settled' || dragShelf === 'snoozed'
  const showWorkspaceFilter = workspaces.items.length > 1
  const workspaceNeedle = workspaceQuery.trim().toLocaleLowerCase()
  const visibleWorkspaces = workspaceNeedle === '' ? workspaces.items : workspaces.items.filter(workspace => workspace.title.toLocaleLowerCase().includes(workspaceNeedle))
  const selectWorkspace = (id?: string) => {
    setWorkspaceFilter(id)
    setWorkspaceFilterOpen(false)
    setWorkspaceQuery('')
  }
  const empty = pinned.length === 0 && active.length === 0 && snoozed.length === 0 && settled.length === 0 && unsentDrafts.length === 0
  const openSettings = () => {
    document.querySelector<HTMLButtonElement>('[data-slot="settings.trigger"]')?.click()
  }
  const workspaceFilterControl = showWorkspaceFilter ? (
    <div ref={workspaceFilterRef} className="dsht3-workspace-filter">
      <button
        type="button"
        className={mobileLayout ? 'dsht3-mobile-icon' : 'dsht3-icon'}
        aria-label={t('filter.aria')}
        aria-expanded={workspaceFilterOpen}
        onClick={() => setWorkspaceFilterOpen(open => !open)}
      >
        {mobileLayout
          ? (filterId !== undefined ? <FilterFilledIcon /> : <FilterIcon />)
          : <WorkspaceFilterIcon />}
      </button>
      {workspaceFilterOpen ? (
        <div className="dsht3-workspace-menu" role="dialog" aria-label={t('filter.aria')}>
          <label className="dsht3-workspace-search">
            <SearchIcon />
            <input ref={workspaceSearchRef} value={workspaceQuery} placeholder={t('filter.search')} aria-label={t('filter.search')} onChange={event => setWorkspaceQuery(event.target.value)} />
          </label>
          {mobileLayout && canRaiseDirectoryFlow ? (
            <button type="button" className="dsht3-workspace-add" onClick={() => { setWorkspaceFilterOpen(false); setFlowOpen(true) }}>
              <PlusIcon size={16} /><span>{t('workspace.add')}</span>
            </button>
          ) : null}
          <div className="dsht3-workspace-options" role="listbox" aria-label={t('filter.aria')}>
            <button type="button" role="option" aria-selected={filterId === undefined} className={filterId === undefined ? 'dsht3-workspace-selected' : undefined} onClick={() => selectWorkspace()}>
              <WorkspaceFilterIcon /><span>{t('filter.all')}</span>
            </button>
            {visibleWorkspaces.map(workspace => {
              const identity = identityOf(workspace.title)
              return (
                <button key={workspace.workspaceId} type="button" role="option" aria-selected={filterId === workspace.workspaceId} className={filterId === workspace.workspaceId ? 'dsht3-workspace-selected' : undefined} onClick={() => selectWorkspace(workspace.workspaceId)}>
                  <span className="dsht3-ident" data-color={identity.color} aria-hidden="true">{identity.monogram}</span><span>{workspace.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  ) : null

  return (
    <div ref={rootRef} className={mobileLayout ? 'dsht3 dsht3-mobile' : 'dsht3'}
      data-dsh-mobile-taskbar={mobileLayout ? '' : undefined}
      onPointerDown={onPointerStart} onPointerMove={onPointerMove}
      onPointerUp={event => { finishSwipe(event.pointerId, true); finishPointerDrag(event.pointerId, true) }} onPointerCancel={event => { finishSwipe(event.pointerId, false); finishPointerDrag(event.pointerId, false) }}
      onClickCapture={event => {
        const target = event.target as Element
        if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation(); return }
        if (swipe !== null && target.closest('[data-dsh-mobile-swipe-action]') === null) setSwipe(null)
      }}
    >
      {mobileLayout && pickingWorkspace ? (
        <ChooseWorkspacePage
          workspaces={workspaces.items.map(workspace => ({ workspaceId: workspace.workspaceId, title: workspace.title, path: workspace.path ?? '' }))}
          canAdd={canRaiseDirectoryFlow}
          onBack={() => setPickingWorkspace(false)}
          onAdd={() => setFlowOpen(true)}
          onPick={onPickWorkspace}
          t={t}
        />
      ) : null}
      {mobileLayout && !pickingWorkspace ? (
        <>
          <div className="dsht3-mobile-head">
            <div className="dsht3-mobile-brand" aria-label="DeepSeek Harness">
              <BrandWordmark size={20} />
            </div>
            {workspaceFilterControl}
            {settingsOpenable ? (
              <button type="button" className="dsht3-mobile-icon" aria-label={t('mobile.settings')} onClick={openSettings}>
                <SettingsIcon />
              </button>
            ) : null}
          </div>
          <label className="dsht3-search dsht3-mobile-search">
            <T3SearchIcon size={16} />
            <input autoCapitalize="none" autoCorrect="off" enterKeyHint="search" spellCheck={false} value={query} placeholder={t('search.placeholder')} aria-label={t('search.aria')} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </>
      ) : null}
      {swipeError ? <div className="dsht3-mobile-error" role="status">{t('action.failed')}</div> : null}
      <div className="dsht3-head">
        {mobileLayout ? null : (
          <label className="dsht3-search">
            <SearchIcon />
            <input autoCapitalize="none" autoCorrect="off" enterKeyHint="search" spellCheck={false} value={query} placeholder={t('search.placeholder')} aria-label={t('search.aria')} onChange={(event) => setQuery(event.target.value)} />
          </label>
        )}
        {mobileLayout ? null : workspaceFilterControl}
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
      <div className="dsht3-list-wrap" hidden={mobileLayout && pickingWorkspace} aria-hidden={mobileLayout && pickingWorkspace ? true : undefined}>
      <div ref={listRef} className="dsht3-list" onScroll={() => { cancelLongPress(); swipeTrack.current = undefined; setSwipe(null); closeMenu(false); syncScrollbar() }}>
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
            <section className="dsht3-shelf dsht3-pinned" {...bindDest('pinned', 0)}>
              {shelfHead('pinned')}
              {pinned.map((card, index) => renderCard(card, { dest: 'pinned', index }))}
              {dragging ? <div className="dsht3-dropzone" style={shelfTailStyle('pinned')} {...bindDest('pinned', pinned.length)} /> : null}
            </section>
            <section className="dsht3-shelf dsht3-active" style={shelfDragStyle('active')} {...bindDest('active', 0)}>
              {shelfHead('active')}
              {active.map((card, index) => renderCard(card, { dest: 'active', index }))}
              {dragging ? <div className="dsht3-dropzone" style={shelfTailStyle('active')} {...bindDest('active', active.length)} /> : null}
            </section>
            {/* snoozed */}
            {snoozed.length === 0 ? null : (
              <section className="dsht3-shelf" style={shelfDragStyle('snoozed')}>
                <button type="button" className="dsht3-shead dsht3-stoggle" onClick={() => setSnoozedOpen((was) => !was)}>
                  <span className={snoozedOpen ? 'dsht3-chevron dsht3-chevron-open' : 'dsht3-chevron'}><ChevronDownIcon /></span>{t('shelf.snoozed')}
                </button>
                {snoozedOpen ? snoozed.map(renderSnoozed) : null}
              </section>
            )}
            {/* settled */}
            {settled.length === 0 && !dragging ? null : (
              <section className="dsht3-shelf dsht3-settled" style={shelfDragStyle('settled')} {...bindDest('settled', 0)}>
                {settled.length === 0 ? (
                  <div className={`dsht3-shead dsht3-shelf-head${settledCrossTarget ? ' dsht3-cross-target' : ''}`}><span>{t('shelf.settled')}</span><span className="dsht3-rule" /></div>
                ) : (
                  <button
                    type="button"
                    className={`dsht3-shead dsht3-shelf-head dsht3-stoggle${settledCrossTarget ? ' dsht3-cross-target' : ''}`}
                    {...bindDest('settled', 0)}
                    aria-expanded={settledOpen}
                    onClick={() => setSettledOpen((wasOpen) => !wasOpen)}
                  >
                    <span>{t('shelf.settled')}</span><span className="dsht3-rule" /><span className={settledOpen ? 'dsht3-chevron dsht3-chevron-open' : 'dsht3-chevron'}><ChevronDownIcon /></span>
                  </button>
                )}
                {settledOpen ? visibleSettled.map((card, index) => renderSettled(card, index)) : null}
                {settledOpen && settledRemaining > 0 ? (
                  <button type="button" className="dsht3-show-more" style={shelfTailStyle('settled')} onClick={() => setSettledLimit((count) => count + SETTLED_PAGE)}>
                    + {t('settled.more').replace('{n}', String(Math.min(SETTLED_PAGE, settledRemaining))).replace('{remaining}', String(settledRemaining))}
                  </button>
                ) : null}
                {dragging ? <div className="dsht3-dropzone" style={shelfTailStyle('settled')} {...bindDest('settled', settled.length)} /> : null}
              </section>
            )}
          </>
        )}
      </div>
      {!mobileLayout && scrollbar.visible ? <div
        className="dsht3-scroll-thumb"
        role="scrollbar"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, (listRef.current?.scrollHeight ?? 0) - (listRef.current?.clientHeight ?? 0))}
        aria-valuenow={listRef.current?.scrollTop ?? 0}
        style={{ height: scrollbar.height, transform: `translateY(${scrollbar.top}px)` }}
        onPointerDown={onScrollbarPointerDown}
        onPointerMove={onScrollbarPointerMove}
        onPointerUp={onScrollbarPointerEnd}
        onPointerCancel={onScrollbarPointerEnd}
      /> : null}
      </div>
      {mobileLayout && !pickingWorkspace ? (
        <button type="button" className="dsht3-mobile-new" aria-label={t('session.blank')} onClick={() => { setWorkspaceFilterOpen(false); setPickingWorkspace(true) }}>
          <SquarePenIcon size={20} />
        </button>
      ) : null}
      {dragVisual !== null && dragCard !== undefined ? <div ref={dragOverlayRef} className={`dsht3-drag-overlay${dragSlim ? ' dsht3-slim' : ''}`} style={{ top: dragVisual.top, left: dragVisual.left, width: dragVisual.width }} aria-hidden="true">
        <div className="dsht3-card"
           data-dsh-mobile-session-nav={mobileLayout ? '' : undefined}
           style={swipeCardStyle(dragCard.sessionId)}>{dragSlim ? settledCardBody(dragCard) : cardBody(dragCard)}</div>
      </div> : null}
      {menu ? (
        <>
        <div
          className="dsht3-menu-backdrop"
          onPointerDown={event => {
            event.preventDefault()
            event.stopPropagation()
            suppressClick.current = true
          }}
          onPointerUp={event => {
            event.preventDefault()
            event.stopPropagation()
            closeMenu(false)
          }}
          onClick={event => {
            event.preventDefault()
            event.stopPropagation()
          }}
        />
        <div
          ref={menuRef}
          className={mobileLayout ? 'dsht3-menu dsht3-mobile-menu' : 'dsht3-menu'}
          role="group"
          aria-label={t('menu.aria')}
          style={{
            left: menuPosition?.x ?? 0,
            top: menuPosition?.y ?? 0,
            visibility: menuPosition === null ? 'hidden' : 'visible',
          }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={event => event.stopPropagation()}
          onKeyDown={onMenuKeyDown}
        >
          <div className="dsht3-menu-head">{workspaceFor(menu.id)?.title ?? t('menu.aria')}</div>
          {menu.snooze ? (
            <>
              <MenuButton icon={<RestoreIcon />} label={t('menu.back')} onClick={() => setMenu({ ...menu, snooze: false })} />
              <hr />
              <MenuButton icon={<ClockIcon />} label={t('snooze.hour')} onClick={() => { onSnooze(menu.id, Date.now() + HOUR_MS); closeMenu(false) }} />
              {laterToday18(now) === undefined ? null : (
                <MenuButton icon={<ClockIcon />} label={t('snooze.laterToday')} onClick={() => {
                  const until = laterToday18(now)
                  if (until === undefined) return
                  onSnooze(menu.id, until)
                  closeMenu(false)
                }} />
              )}
              <MenuButton icon={<ClockIcon />} label={t('snooze.tomorrow')} onClick={() => { onSnooze(menu.id, tomorrow09(now)); closeMenu(false) }} />
              <div className="dsht3-custom">
                <input type="datetime-local" aria-label={t('snooze.custom')} value={customUntil} onChange={(event) => setCustomUntil(event.target.value)} />
                <button type="button" onClick={() => {
                  const until = new Date(customUntil).getTime()
                  if (!Number.isFinite(until) || until <= Date.now()) return
                  onSnooze(menu.id, until)
                  closeMenu(false)
                }}>{t('snooze.apply')}</button>
              </div>
            </>
          ) : !started(menu.id) ? (
            <>
              {draftIds.has(menu.id) ? <MenuButton icon={<ArchiveIcon size={16} />} label={t('draft.discard')} danger onClick={() => { discardSessionDraft(menu.id); closeMenu(false) }} /> : null}
              <MenuButton icon={<PenIcon />} label={t('menu.rename')} onClick={() => openDialog('rename-session', menu.id)} />
            </>
          ) : (
            <>
              {settledIds.has(menu.id) ? (
                <MenuButton icon={<RestoreIcon />} label={t('unsettle')} onClick={() => { send({ type: 'Unsettle', sessionId: menu.id, at: Date.now() }); closeMenu(false) }} />
              ) : snoozedIds.has(menu.id) ? (
                <MenuButton icon={<RestoreIcon />} label={t('wake')} onClick={() => { send({ type: 'Wake', sessionId: menu.id, at: Date.now() }); closeMenu(false) }} />
              ) : (
                <>
                  <MenuButton icon={<PinIcon off={pinnedIds.has(menu.id)} />} label={t(pinnedIds.has(menu.id) ? 'unpin' : 'pin')} onClick={() => { onTogglePin(menu.id, pinnedIds.has(menu.id)); closeMenu(false) }} />
                  <MenuButton icon={<ClockIcon />} label={t('menu.snooze')} trailing disabled={!canSnooze(menu.id)} onClick={() => setMenu({ ...menu, snooze: true })} />
                  <MenuButton icon={<CheckIcon />} label={t('settle')} disabled={!canSettle(menu.id)} onClick={() => { onSettle(menu.id); closeMenu(false) }} />
                  {mobileLayout && (pinnedIds.has(menu.id) || shelfOf(menu.id) === 'active') ? (
                    <>
                      <hr />
                      <MenuButton icon={<span className="dsht3-menu-move-up"><ChevronDownIcon /></span>} label={t('menu.moveUp')} disabled={moveCommandFor(menu.id, -1) === undefined} onClick={() => { const command = moveCommandFor(menu.id, -1); if (command !== undefined) void send(command); closeMenu(false) }} />
                      <MenuButton icon={<ChevronDownIcon />} label={t('menu.moveDown')} disabled={moveCommandFor(menu.id, 1) === undefined} onClick={() => { const command = moveCommandFor(menu.id, 1); if (command !== undefined) void send(command); closeMenu(false) }} />
                    </>
                  ) : null}
                </>
              )}
              <hr />
              <MenuButton icon={<PenIcon />} label={t('menu.rename')} onClick={() => openDialog('rename-session', menu.id)} />
              <MenuButton icon={<BranchIcon />} label={t('menu.fork')} onClick={() => { forkSession(menu.id as never); closeMenu(false) }} />
              <MenuButton icon={<WorkspaceFilterIcon />} label={t('menu.workspace')} onClick={() => openDialog('rename-workspace', menu.id)} />
              <hr />
              <MenuButton icon={<ArchiveIcon size={16} />} label={t('menu.archive')} danger onClick={() => openDialog('archive', menu.id)} />
            </>
          )}
        </div>
        </>
      ) : null}
      {dialog ? (
        <div className="dsht3-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeDialog() }}>
          <form className="dsht3-dialog" role="dialog" aria-modal="true" aria-labelledby="dsht3-dialog-title" onSubmit={submitDialog}>
            <h2 id="dsht3-dialog-title">{t(`dialog.${dialog.kind}.title`)}</h2>
            <p>{t(`dialog.${dialog.kind}.description`)}</p>
            {dialog.kind === 'archive' ? null : (
              <input autoFocus value={dialog.value} onChange={(event) => setDialog({ ...dialog, value: event.target.value })} required />
            )}
            <div className="dsht3-dialog-actions">
              <button type="button" autoFocus={dialog.kind === 'archive'} onClick={closeDialog}>{t('dialog.cancel')}</button>
              <button type="submit" className={dialog.kind === 'archive' ? 'dsht3-dialog-danger' : 'dsht3-dialog-primary'}>{t(dialog.kind === 'archive' ? 'menu.archive' : 'dialog.save')}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
