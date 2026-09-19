import type { Ledger, LedgerEntry } from './taskbar.ts'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseLedgerEntry(value: unknown): LedgerEntry {
  if (!isRecord(value)) return {}
  const entry: { pin?: number; active?: number; settledAt?: number; snoozedUntil?: number } = {}
  if (typeof value.pin === 'number') entry.pin = value.pin
  if (typeof value.active === 'number') entry.active = value.active
  if (typeof value.settledAt === 'number') entry.settledAt = value.settledAt
  if (typeof value.snoozedUntil === 'number') entry.snoozedUntil = value.snoozedUntil
  return entry
}

export interface LedgerSnapshot {
  readonly revision: number
  readonly records: Ledger
}

export const EMPTY_LEDGER: LedgerSnapshot = { revision: 0, records: {} }

export function parseLedger(value: unknown): LedgerSnapshot | undefined {
  if (!isRecord(value) || typeof value.revision !== 'number' || !isRecord(value.records)) return undefined
  const records: Record<string, LedgerEntry> = {}
  for (const [id, entry] of Object.entries(value.records)) {
    records[id] = parseLedgerEntry(entry)
  }
  return { revision: value.revision, records }
}
