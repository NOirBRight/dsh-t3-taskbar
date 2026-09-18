import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { LEDGER_APPLY, LEDGER_GET, TASKBAR_RPC_CHANNEL } from '../contract.ts'
import type { Command, Ledger, LedgerEntry } from '../taskbar.ts'

export interface HostLedger {
  readonly revision: number
  readonly records: Ledger
}

const empty: HostLedger = { revision: 0, records: {} }

let rpc: ClientConnectionRpc | undefined

export function bindLedgerRpc(value: ClientConnectionRpc): void {
  rpc = value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseEntry(value: unknown): LedgerEntry {
  if (!isRecord(value)) return {}
  const entry: { pin?: number; active?: number; settledAt?: number; snoozedUntil?: number } = {}
  if (typeof value.pin === 'number') entry.pin = value.pin
  if (typeof value.active === 'number') entry.active = value.active
  if (typeof value.settledAt === 'number') entry.settledAt = value.settledAt
  if (typeof value.snoozedUntil === 'number') entry.snoozedUntil = value.snoozedUntil
  return entry
}

function decode(value: unknown): HostLedger {
  if (!isRecord(value) || typeof value.revision !== 'number' || !isRecord(value.records)) return empty
  const records: Record<string, LedgerEntry> = {}
  for (const [id, entry] of Object.entries(value.records)) {
    records[id] = parseEntry(entry)
  }
  return { revision: value.revision, records }
}

async function call(endpoint: string, payload: unknown): Promise<unknown> {
  if (rpc === undefined) return undefined
  const result = await rpc.call(TASKBAR_RPC_CHANNEL, endpoint, payload)
  return result.ok ? result.value : undefined
}

export async function loadLedger(): Promise<HostLedger> {
  return decode(await call(LEDGER_GET, {}))
}

export async function applyLedger(command: Command, revision: number): Promise<HostLedger | undefined> {
  const value = await call(LEDGER_APPLY, { revision, command })
  return value === undefined ? undefined : decode(value)
}
