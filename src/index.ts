/** Host plugin: Host-owned shelf ledger and AutoSettle policy. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-timer'
import type {} from '@deepseek-ai/dsh-api-session-controller'
import type {} from '@deepseek-ai/dsh-api-workspace-controller'
import type {} from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-client-connection'
import { TASKBAR_RPC_CHANNEL } from './contract.ts'
import { handleTaskbarRpc } from './host/rpc.ts'
import { previewAutoSettle, runAutoSettle } from './host/auto-settle-runner.ts'
import { DEFAULT_TASKBAR_SETTINGS, TASKBAR_SETTINGS_NAMESPACE, taskbarSettingsSchema } from './settings.ts'

export const name = 'dsh-t3-taskbar'
export const inject = ['connection', 'sessionController', 'workspaceController', 'settings', 'timer']

export function apply(ctx: Context): void {
  const settings = ctx.settings.register(TASKBAR_SETTINGS_NAMESPACE, taskbarSettingsSchema, {
    base: DEFAULT_TASKBAR_SETTINGS,
    applies: 'live',
  })
  let scanning = false
  let rescan = false
  const scan = async () => {
    if (scanning) {
      rescan = true
      return
    }
    scanning = true
    const policy = settings.get()
    try {
      await runAutoSettle(ctx, policy, Date.now(), () => {
        const current = settings.get()
        return current.autoSettleAfterDays === policy.autoSettleAfterDays
          && current.autoSettleOnMerge === policy.autoSettleOnMerge
          && current.autoSettleOnClose === policy.autoSettleOnClose
      })
    } catch (error) {
      ctx.logger.warn('t3-taskbar AutoSettle scan skipped', error)
    } finally {
      scanning = false
      if (rescan) {
        rescan = false
        void scan()
      }
    }
  }
  ctx.effect(() => ctx.connection.rpc.handle(TASKBAR_RPC_CHANNEL, (endpoint, payload) => handleTaskbarRpc(endpoint, payload, {
    previewAutoSettle: () => previewAutoSettle(ctx, settings.get()),
    getSettings: () => settings.get(),
    updateSettings: patch => settings.update(patch),
  })))
  ctx.interval(() => { void scan() }, 60_000)
  ctx.timeout(() => { void scan() }, 5_000)
  ctx.effect(() => settings.watch(() => { void scan() }))
}
