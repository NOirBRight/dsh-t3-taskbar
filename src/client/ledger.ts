import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { LEDGER_APPLY, LEDGER_GET, TASKBAR_RPC_CHANNEL } from '../contract.ts'
import { EMPTY_LEDGER, parseLedger, type LedgerSnapshot } from '../ledger-json.ts'
import type { Command } from '../taskbar.ts'

const empty: LedgerSnapshot = EMPTY_LEDGER

let rpc: ClientConnectionRpc | undefined

export function bindLedgerRpc(value: ClientConnectionRpc): void {
  rpc = value
}

function decode(value: unknown): LedgerSnapshot {
  return parseLedger(value) ?? empty
}

async function call(endpoint: string, payload: unknown): Promise<unknown> {
  if (rpc === undefined) return undefined
  const result = await rpc.call(TASKBAR_RPC_CHANNEL, endpoint, payload)
  return result.ok ? result.value : undefined
}

export async function loadLedger(): Promise<LedgerSnapshot> {
  return decode(await call(LEDGER_GET, {}))
}

export async function applyLedger(command: Command, revision: number): Promise<LedgerSnapshot | undefined> {
  const value = await call(LEDGER_APPLY, { revision, command })
  return value === undefined ? undefined : decode(value)
}
