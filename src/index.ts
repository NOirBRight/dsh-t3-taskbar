/** Host plugin: ledger file under $DSH_HOME, served over Connection RPC. */

import { TASKBAR_RPC_CHANNEL } from './contract.ts'
import { handleLedgerRpc } from './host/rpc.ts'

export const name = 'dsh-t3-taskbar'
export const inject = ['connection']

export function apply(ctx: {
  effect: (fn: () => unknown) => void
  connection: {
    rpc: {
      handle: (
        channel: string,
        handler: typeof handleLedgerRpc,
        options: { authority: 'trusted-host' | 'loopback' },
      ) => () => Promise<void>
    }
  }
}): void {
  ctx.effect(() => ctx.connection.rpc.handle(TASKBAR_RPC_CHANNEL, handleLedgerRpc, { authority: 'trusted-host' }))
}
