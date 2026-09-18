import { useMemo, useSyncExternalStore } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { WorkspaceBrowserProps } from '@deepseek-ai/dsh-client-ui-workspace/client'
import { project, type LiveStatus, type Session } from '../taskbar.ts'
import { discardDraft, draftsSnapshot, subscribeDrafts } from './drafts.ts'
import type { TaskbarKey } from './locales.ts'

type Props = Omit<WorkspaceBrowserProps, 't'> & { t: (key: TaskbarKey) => string }

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

export function Taskbar(props: Props) {
  const {
    wide,
    expandSidebar,
    useSessions,
    useWorkspaces,
    open,
    useDirectoryFlow,
    t,
  } = props

  const list = useSessions((state) => state)
  const workspaces = useWorkspaces((state) => state)
  const directoryFlowAvailable = useDirectoryFlow((occupied) => occupied)
  const drafts = useSyncExternalStore(subscribeDrafts, () => draftsSnapshot(list.ids))

  const view = useMemo(() => project({
    ...(list.current !== undefined ? { current: list.current } : {}),
    archivedSessionIds: workspaces.archivedSessionIds,
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
    drafts,
  }), [list, workspaces, drafts])

  if (!wide) {
    return (
      <div className="dsht3-rail">
        <button type="button" className="dsht3-icon" aria-label={t('search.aria')} onClick={() => expandSidebar()}>
          <SearchIcon />
        </button>
        {directoryFlowAvailable ? (
          <button type="button" className="dsht3-icon" aria-label={t('workspace.add')} onClick={() => expandSidebar()}>
            <AddWorkspaceIcon />
          </button>
        ) : null}
      </div>
    )
  }

  const active = view.shelves.active
  const unsentDrafts = view.unsentDrafts
  return (
    <div className="dsht3">
      <div className="dsht3-list">
        {unsentDrafts.length === 0 && active.length === 0 ? <div className="dsht3-empty">{t('empty')}</div> : (
          <>
            {/* unsent-draft */}
            {unsentDrafts.length === 0 ? null : (
              <section className="dsht3-shelf">
                <div className="dsht3-shead">{t('draft.unsent')}</div>
                {unsentDrafts.map((card) => (
                  <div key={card.sessionId} className="dsht3-draft">
                    <button
                      type="button"
                      className="dsht3-card"
                      aria-current={card.selected ? true : undefined}
                      onClick={() => open(card.sessionId as never)}
                    >
                      <span className="dsht3-line1">{card.workspaceTitle}</span>
                      <span className="dsht3-line2">{card.sessionTitle}</span>
                    </button>
                    <button type="button" className="dsht3-discard" onClick={() => discardDraft(card.sessionId)}>
                      {t('draft.discard')}
                    </button>
                  </div>
                ))}
              </section>
            )}
            {active.length === 0 ? null : (
              <section className="dsht3-shelf">
                <div className="dsht3-shead">{t('shelf.active')}</div>
                {active.map((card) => (
                  <button
                    key={card.sessionId}
                    type="button"
                    className="dsht3-card"
                    aria-current={card.selected ? true : undefined}
                    onClick={() => open(card.sessionId as never)}
                  >
                    <span className="dsht3-line1">{lineOne(card.workspaceTitle, card.liveStatus, t)}</span>
                    <span className="dsht3-line2">
                      {card.unsentDraft === true ? (
                        <span className="dsht3-pen" aria-label={t('draft.pen')}><PenIcon /></span>
                      ) : null}
                      {card.sessionTitle}
                    </span>
                  </button>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
