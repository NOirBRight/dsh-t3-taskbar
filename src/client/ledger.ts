import { LEDGER_APPLY, LEDGER_GET } from '../contract.ts'
import { EMPTY_LEDGER, parseLedger, type LedgerSnapshot } from '../ledger-json.ts'
import type { Command } from '../taskbar.ts'
import { callTaskbarRpc } from './rpc.ts'

const empty: LedgerSnapshot = EMPTY_LEDGER

function decode(value: unknown): LedgerSnapshot {
  return parseLedger(value) ?? empty
}

export async function loadLedger(): Promise<LedgerSnapshot> {
  return decode(await callTaskbarRpc(LEDGER_GET, {}))
}

export async function applyLedger(command: Command, revision: number): Promise<LedgerSnapshot | undefined> {
  const value = await callTaskbarRpc(LEDGER_APPLY, { revision, command })
  return value === undefined ? undefined : decode(value)
}
