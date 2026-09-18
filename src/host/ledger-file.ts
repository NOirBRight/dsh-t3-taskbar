import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { Ledger, LedgerEntry } from '../taskbar.ts'

export interface LedgerFile {
  readonly revision: number
  readonly records: Ledger
}

function home(): string {
  const env = process.env.DSH_HOME
  return env !== undefined && env.trim() !== '' ? env : join(homedir(), '.dsh')
}

function filePath(): string {
  return join(home(), 't3-taskbar', 'ledger.json')
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

function parseFile(raw: string): LedgerFile {
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed) || typeof parsed.revision !== 'number' || !isRecord(parsed.records)) {
    return { revision: 0, records: {} }
  }
  const records: Record<string, LedgerEntry> = {}
  for (const [id, entry] of Object.entries(parsed.records)) {
    records[id] = parseEntry(entry)
  }
  return { revision: parsed.revision, records }
}

export function readLedgerFile(): LedgerFile {
  try {
    return parseFile(readFileSync(filePath(), 'utf8'))
  } catch {
    return { revision: 0, records: {} }
  }
}

export function writeLedgerFile(file: LedgerFile): void {
  const path = filePath()
  mkdirSync(dirname(path), { recursive: true })
  const pending = `${path}.tmp`
  writeFileSync(pending, `${JSON.stringify(file, null, 2)}\n`)
  renameSync(pending, path)
}
