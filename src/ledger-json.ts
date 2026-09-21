import type { Ledger, LedgerEntry } from './taskbar.ts'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const LEDGER_FIELDS = new Set(['pin', 'active', 'settledAt', 'snoozedUntil', 'settledBy', 'settledPr', 'manualActiveAt'])

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function parseLedgerEntry(value: unknown, legacy = false): LedgerEntry | undefined {
  if (!isRecord(value) || Object.keys(value).some(key => !LEDGER_FIELDS.has(key))) return undefined
  for (const field of ['pin', 'active'] as const) {
    if (value[field] !== undefined && !finiteNumber(value[field])) return undefined
  }
  for (const field of ['settledAt', 'snoozedUntil', 'manualActiveAt'] as const) {
    if (value[field] !== undefined && (!finiteNumber(value[field]) || (value[field] as number) < 0)) return undefined
  }
  const shelfFields = [value.pin, value.active, value.settledAt, value.snoozedUntil].filter(item => item !== undefined)
  if (shelfFields.length > 1) return undefined
  if (value.settledBy !== undefined && value.settledBy !== 'manual' && value.settledBy !== 'auto-inactive' && value.settledBy !== 'auto-pr-merged' && value.settledBy !== 'auto-pr-closed') return undefined
  if (value.settledBy !== undefined && value.settledAt === undefined) return undefined
  if (value.settledPr !== undefined && (!Number.isInteger(value.settledPr) || (value.settledPr as number) <= 0 || value.settledAt === undefined)) return undefined
  if (!legacy && value.settledAt !== undefined && value.settledBy === undefined) return undefined
  const settledBy = value.settledBy ?? (legacy && value.settledAt !== undefined ? 'manual' : undefined)
  const prSettlement = settledBy === 'auto-pr-merged' || settledBy === 'auto-pr-closed'
  if (prSettlement !== (value.settledPr !== undefined)) return undefined
  return {
    ...(value.pin === undefined ? {} : { pin: value.pin as number }),
    ...(value.active === undefined ? {} : { active: value.active as number }),
    ...(value.settledAt === undefined ? {} : { settledAt: value.settledAt as number }),
    ...(value.snoozedUntil === undefined ? {} : { snoozedUntil: value.snoozedUntil as number }),
    ...(settledBy === undefined ? {} : { settledBy: settledBy as Exclude<LedgerEntry['settledBy'], undefined> }),
    ...(value.settledPr === undefined ? {} : { settledPr: value.settledPr as number }),
    ...(value.manualActiveAt === undefined ? {} : { manualActiveAt: value.manualActiveAt as number }),
  }
}

export interface LedgerSnapshot {
  readonly schemaVersion: 3
  readonly revision: number
  readonly records: Ledger
}

export const EMPTY_LEDGER: LedgerSnapshot = { schemaVersion: 3, revision: 0, records: {} }

export function parseLedger(value: unknown): LedgerSnapshot | undefined {
  if (!isRecord(value) || (value.schemaVersion !== undefined && value.schemaVersion !== 1 && value.schemaVersion !== 2 && value.schemaVersion !== 3) || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0 || !isRecord(value.records)) return undefined
  const records: Record<string, LedgerEntry> = {}
  for (const [id, valueEntry] of Object.entries(value.records)) {
    if (id.length === 0 || id.length > 256) return undefined
    const entry = parseLedgerEntry(valueEntry, value.schemaVersion !== 3)
    if (entry === undefined) return undefined
    records[id] = entry
  }
  return { schemaVersion: 3, revision: value.revision as number, records }
}
