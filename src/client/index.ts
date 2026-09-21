import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { DirectoryFlowOwnerProps } from '@deepseek-ai/dsh-client-ui-workspace/client'
import type { StoredEntry } from '@deepseek-ai/dsh-client-ui-slots'
import { createElement } from 'react'
import { PluginIcon } from './icons.tsx'
import { InputProtectionProbe } from './InputProtectionProbe.tsx'
import { AutoSettleSettings } from './AutoSettleSettings.tsx'
import { Taskbar } from './Taskbar.tsx'
import { ensureTaskbarStyles } from './css.ts'
import { bindTaskbarRpc } from './rpc.ts'
import { en, NS, zh, type TaskbarKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 't3-taskbar': TaskbarKey }
  interface SlotMap {
    't3-taskbar.directoryFlow': { kind: 'single'; scope: 'root'; owner: DirectoryFlowOwnerProps }
  }
}

export const name = 'dsh-t3-taskbar-client'
export const inject = ['slots', 'locale', 'sessions', 'workspaces', 'conversation', 'uiWorkspace', 'layout']
const DIRECTORY_FLOW = 't3-taskbar.directoryFlow' as const
const HOST_DIRECTORY_FLOW = 'sidebar.workspaces.directoryFlow' as const

function acpPresentOf(ctx: unknown): boolean {
  const registry = (ctx as { registry?: { values?: () => Iterable<{ name?: string }> } }).registry
  for (const plugin of registry?.values?.() ?? []) {
    if (plugin.name?.includes('acp-antigravity') || plugin.name?.includes('acp-cursor')) return true
  }
  return false
}

/** Reuse the installed Host picker, under our own declared hole; never mutate its registration. */
function mirrorDirectoryFlow(ctx: ClientContext): () => void {
  let source: StoredEntry | undefined
  let dispose: (() => void) | undefined
  const sync = () => {
    const next = ctx.slots.entries(HOST_DIRECTORY_FLOW)[0]
    if (next === source) return
    dispose?.()
    source = next
    dispose = next === undefined ? undefined : ctx.slots.register({
      name: DIRECTORY_FLOW,
      inject: () => next.inject?.() ?? {},
    }, next.component as never)
  }
  const unsubscribe = ctx.slots.subscribe(HOST_DIRECTORY_FLOW, sync)
  sync()
  return () => { unsubscribe(); dispose?.() }
}

function occupyWorkspaces(ctx: ClientContext): () => void {
  // Host and Client both augment Cordis Context.sessions; narrow to the Client face here.
  const sessions = ctx.get('sessions') as unknown as ISessions
  const Occupant = (props: Parameters<typeof Taskbar>[0]) => createElement(Taskbar, {
    ...props,
    acpPresent: acpPresentOf(ctx),
  })
  return ctx.slots.register({
    name: 'sidebar.workspaces',
    priority: -1,
    locale: NS,
    children: { [DIRECTORY_FLOW]: { kind: 'single', scope: 'root' } },
    inject: () => ({
      startSession: (workspaceId?: string) => ctx.uiWorkspace.startSession(workspaceId as never),
      open: (sessionId: string) => ctx.uiWorkspace.openSession(sessionId as never),
      searchSessions: async (query: string, signal: AbortSignal) => {
        const result = await sessions.search(query, signal)
        if (!result.ok) throw new Error(result.error.message)
        return result.value
      },
      searchResultLimit: sessions.searchResultLimit,
      discardSessionDraft: (sessionId: string) => {
        void sessions.using(sessionId as never, { source: 'workspaceOperation' }, reference => {
          ctx.conversation.input.for(reference.binding.ctx).setDraft('')
        }).catch(() => {})
      },
      renameSession: async (sessionId: string, title: string) => {
        const result = await sessions.using(sessionId as never, { source: 'workspaceOperation' }, reference => reference.binding.session.rename(title))
        if (!result.ok) throw new Error(result.error.message)
      },
      forkSession: (sessionId: string) => { void ctx.uiWorkspace.forkSession(sessionId as never) },
      renameWorkspace: async (workspaceId: string, title: string) => { await ctx.workspaces.rename(workspaceId as never, title) },
      archiveSession: (sessionId: string) => ctx.uiWorkspace.archiveSession(sessionId as never),
      createWorkspace: (input: { path: string }) => ctx.workspaces.create(input),
      hooks: { directoryFlow: {
        getSnapshot: () => ctx.slots.entries(DIRECTORY_FLOW).length > 0,
        subscribe: (listener: () => void) => ctx.slots.subscribe(DIRECTORY_FLOW, listener),
      } },
    }),
  }, Occupant as never)
}

function occupyPluginFooter(ctx: ClientContext): () => void {
  let dispose: (() => void) | undefined
  const sync = () => {
    const available = ctx.slots.entries('main').some(entry => entry.options.key === 'plugins')
    if (available === (dispose !== undefined)) return
    dispose?.()
    dispose = undefined
    if (!available) return
    const t = ctx.locale.bind(NS)
    const FooterPlugin = ({ wide }: { wide: boolean }) => createElement('button', {
      type: 'button',
      className: 'dsht3-footer-plugin',
      'aria-label': t('plugins.aria'),
      title: t('plugins.aria'),
      onClick: () => ctx.layout.selectPanel('plugins' as never),
    }, createElement(PluginIcon, { size: wide ? 16 : 18 }), wide ? createElement('span', null, t('plugins.aria')) : null)
    dispose = ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 't3-plugins',
      order: 10,
      label: () => t('plugins.aria'),
    }, FooterPlugin as never)
  }
  const unsubscribe = ctx.slots.subscribe('main', sync)
  sync()
  return () => { unsubscribe(); dispose?.() }
}

export function apply(ctx: ClientContext): void {
  ctx.locale.register(NS, { zh, en })
  ensureTaskbarStyles()
  ctx.inject(['connection'], inner => {
    const connection = inner.get('connection') as unknown as { rpc: ClientConnectionRpc }
    bindTaskbarRpc(connection.rpc)
  })
  ctx.slots.inject('sidebar.workspaces', () => occupyWorkspaces(ctx))
  ctx.slots.inject('sidebar.footer.action', () => occupyPluginFooter(ctx))
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 't3-taskbar',
    order: 10,
    label: () => 'Taskbar',
    locale: NS,
    inject: () => ({ t: ctx.locale.bind(NS) }),
  }, AutoSettleSettings as never))
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 't3-taskbar-protection',
    order: -100,
  }, InputProtectionProbe as never))
  ctx.slots.inject(DIRECTORY_FLOW, () => mirrorDirectoryFlow(ctx))
}
