import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { createElement, useSyncExternalStore } from 'react'
import { Taskbar } from './Taskbar.tsx'
import { ensureTaskbarStyles } from './css.ts'
import { bindTaskbarRpc } from './rpc.ts'
import { openOfficialSettings } from './settings-trigger.ts'
import { en, NS, zh, type TaskbarKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    't3-taskbar': TaskbarKey
  }
}

export const name = 'dsh-t3-taskbar-client'
/** Wait for sessions/workspaces so occupant inject may read them; omit remote.directoryPicker so this still applies before ui-workspace (ADR 0002). */
export const inject = ['slots', 'locale', 'sessions', 'workspaces']

const DIRECTORY_FLOW = 'sidebar.workspaces.directoryFlow' as const

function acpPresentOf(ctx: unknown): boolean {
  try {
    const registry = (ctx as { registry?: { values?: () => Iterable<{ name?: string }> } }).registry
    const values = registry?.values
    if (typeof values !== 'function') return false
    for (const plugin of values.call(registry)) {
      const name = plugin?.name
      if (typeof name !== 'string') continue
      if (name.includes('acp-antigravity') || name.includes('acp-cursor')) return true
    }
  } catch {
    return false
  }
  return false
}

function withoutChildren<T extends { children?: unknown }>(options: T): Omit<T, 'children'> {
  const { children: _dropped, ...rest } = options
  return rest
}

function wrapRegisterKeepingFirstDirectoryFlowDeclarer(slots: ClientContext['slots']): boolean {
  const registry = (slots as unknown as Record<symbol, {
    _register: (options: { children?: Record<string, unknown> }, component: unknown) => () => void
  }>)[Symbol.for('cordis.original')]
  if (registry === undefined) return false
  const register = registry._register.bind(registry)
  registry._register = (options, component) => {
    const children = options.children
    if (children?.[DIRECTORY_FLOW] === undefined || slots.spec(DIRECTORY_FLOW) === undefined) {
      return register(options, component)
    }
    const { [DIRECTORY_FLOW]: _dropped, ...kept } = children
    return register(
      Object.keys(kept).length === 0 ? withoutChildren(options) : { ...options, children: kept },
      component,
    )
  }
  return true
}

const SETTINGS_SEAT = 'sidebar.settings' as const

function occupyWorkspaces(ctx: ClientContext, wrapAttached: boolean): () => void {
  const Occupant = (props: Parameters<typeof Taskbar>[0]) => {
    const settingsAvailable = useSyncExternalStore(
      (listener) => ctx.slots.subscribe(SETTINGS_SEAT, listener),
      () => ctx.slots.entries(SETTINGS_SEAT).length > 0,
      () => false,
    )
    return createElement(Taskbar, {
      ...props,
      acpPresent: acpPresentOf(ctx),
      ...(settingsAvailable ? { openSettings: openOfficialSettings } : {}),
    })
  }
  const options = {
    name: 'sidebar.workspaces' as const,
    priority: -1,
    locale: NS,
    ...wrapAttached ? {
      children: {
        [DIRECTORY_FLOW]: { kind: 'single' as const, scope: 'root' as const },
      },
    } : {},
    inject: () => ({
      startSession: (workspaceId?: string) => ctx.workspaces.startSession(workspaceId as never),
      open: (sessionId: string) => ctx.sessions.open(sessionId as never),
      searchSessions: async (query: string, signal: AbortSignal) => {
        const result = await ctx.sessions.search(query, signal)
        if (!result.ok) throw new Error(result.error.message)
        return result.value
      },
      searchResultLimit: ctx.sessions.searchResultLimit,
      renameSession: async (sessionId: string, title: string) => {
        const session = ctx.sessions.binding(sessionId as never)?.session
        if (session === undefined) throw new Error(`unknown session "${sessionId}"`)
        const result = await session.rename(title)
        if (!result.ok) throw new Error(result.error.message)
      },
      forkSession: (sessionId: string) => {
        void ctx.sessions.fork({ sessionId: sessionId as never, increaseTitle: true }).then((childId) => {
          ctx.sessions.open(childId)
        }).catch(() => {})
      },
      renameWorkspace: async (workspaceId: string, title: string) => {
        await ctx.workspaces.rename(workspaceId as never, title)
      },
      deleteWorkspace: async (workspaceId: string) => {
        await ctx.workspaces.delete(workspaceId as never)
      },
      insertWorkspaceBefore: async (workspaceId: string, beforeWorkspaceId?: string) => {
        await ctx.workspaces.insertBefore(workspaceId as never, beforeWorkspaceId as never)
      },
      archiveSession: async (sessionId: string) => {
        await ctx.workspaces.archiveSession(sessionId as never)
      },
      insertSessionBefore: async (workspaceId: string, sessionId: string, beforeSessionId?: string) => {
        await ctx.workspaces.insertSessionBefore(workspaceId as never, sessionId as never, beforeSessionId as never)
      },
      createWorkspace: (input: { path: string }) => ctx.workspaces.create(input),
      hooks: {
        directoryFlow: {
          getSnapshot: () => ctx.slots.entries(DIRECTORY_FLOW).length > 0,
          subscribe: (listener: () => void) => ctx.slots.subscribe(DIRECTORY_FLOW, listener),
        },
      },
    }),
  }
  try {
    return ctx.slots.register(options, Occupant as never)
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('already declared')) throw error
    return ctx.slots.register(withoutChildren(options), Occupant as never)
  }
}

export function apply(ctx: ClientContext): void {
  ctx.locale.register(NS, { zh, en })
  ensureTaskbarStyles()
  const wrapAttached = wrapRegisterKeepingFirstDirectoryFlowDeclarer(ctx.slots)
  ctx.inject(['connection'], (inner) => {
    bindTaskbarRpc(inner.get('connection').rpc)
  })
  ctx.slots.inject('sidebar.workspaces', () => occupyWorkspaces(ctx, wrapAttached))
}
