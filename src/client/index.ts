import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { defineStore } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { Taskbar } from './Taskbar.tsx'
import { ensureTaskbarStyles } from './css.ts'
import { en, NS, zh, type TaskbarKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    't3-taskbar': TaskbarKey
  }
}

export const name = 'dsh-t3-taskbar-client'
export const inject = ['slots', 'sessions', 'workspaces', 'locale', 'connection', 'layout']

function createTaskbarStore() {
  return defineStore({
    init: () => ({}),
    actions: {},
  })
}

export function apply(ctx: ClientContext): void {
  ctx.locale.register(NS, { zh, en })
  ensureTaskbarStyles()
  const hostDescription = ctx.get('connection').hostDescription
  ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register({
    name: 'sidebar.workspaces',
    priority: -1,
    store: createTaskbarStore(),
    locale: NS,
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
          getSnapshot: () => ctx.slots.entries('sidebar.workspaces.directoryFlow').length > 0,
          subscribe: (listener: () => void) => ctx.slots.subscribe('sidebar.workspaces.directoryFlow', listener),
        },
        hostDescription,
      },
    }),
  }, Taskbar as never))
}
