import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { TASKBAR_RPC_CHANNEL } from '../contract.ts'

let rpc: ClientConnectionRpc | undefined

export function bindTaskbarRpc(value: ClientConnectionRpc): void {
  rpc = value
}

export async function callTaskbarRpc(endpoint: string, payload: unknown): Promise<unknown> {
  if (rpc === undefined) return undefined
  const result = await rpc.call(TASKBAR_RPC_CHANNEL, endpoint, payload)
  return result.ok ? result.value : undefined
}
