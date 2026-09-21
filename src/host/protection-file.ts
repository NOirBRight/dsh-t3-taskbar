import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { isRecord } from '../ledger-json.ts'

export interface ProtectionReport {
  readonly seq: number
  readonly receivedAt: number
  readonly checkedIds: readonly string[]
  readonly protectedIds: readonly string[]
}

export interface ProtectionState {
  readonly version: 1
  readonly clients: Readonly<Record<string, ProtectionReport>>
}

export const EMPTY_PROTECTION: ProtectionState = { version: 1, clients: {} }

function home(): string {
  const env = process.env.DSH_HOME
  return env !== undefined && env.trim() !== '' ? env : join(homedir(), '.dsh')
}

function path(): string {
  return join(home(), 't3-taskbar', 'protection.json')
}

export function parseProtectionIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length > 10_000) return undefined
  const out: string[] = []
  for (const item of value) {
    if (typeof item !== 'string' || item.length === 0 || item.length > 256) return undefined
    out.push(item)
  }
  return [...new Set(out)]
}

export function parseProtectionState(value: unknown): ProtectionState | undefined {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.clients)) return undefined
  const clients: Record<string, ProtectionReport> = {}
  for (const [clientId, raw] of Object.entries(value.clients)) {
    if (clientId.length === 0 || clientId.length > 128 || !isRecord(raw)) return undefined
    const checkedIds = parseProtectionIds(raw.checkedIds)
    const protectedIds = parseProtectionIds(raw.protectedIds)
    if (!Number.isSafeInteger(raw.seq) || (raw.seq as number) < 0 || typeof raw.receivedAt !== 'number' || !Number.isFinite(raw.receivedAt) || raw.receivedAt < 0 || checkedIds === undefined || protectedIds === undefined) return undefined
    clients[clientId] = { seq: raw.seq as number, receivedAt: raw.receivedAt, checkedIds, protectedIds }
  }
  return { version: 1, clients }
}

export function readProtectionFile(): ProtectionState {
  try {
    const parsed = parseProtectionState(JSON.parse(readFileSync(path(), 'utf8')))
    if (parsed === undefined) throw new Error('invalid t3-taskbar protection state')
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return EMPTY_PROTECTION
    throw error
  }
}

export function writeProtectionFile(state: ProtectionState): void {
  const target = path()
  mkdirSync(dirname(target), { recursive: true })
  const pending = `${target}.tmp`
  writeFileSync(pending, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
  renameSync(pending, target)
}

export function updateProtection(
  state: ProtectionState,
  clientId: string,
  seq: number,
  checkedIds: readonly string[],
  protectedIds: readonly string[],
  receivedAt: number,
): ProtectionState {
  const previous = state.clients[clientId]
  if (previous !== undefined && seq <= previous.seq) return state
  const clients = Object.fromEntries(Object.entries(state.clients).filter(([, report]) => Math.abs(receivedAt - report.receivedAt) <= PROTECTION_RETENTION_MS))
  return {
    version: 1,
    clients: { ...clients, [clientId]: { seq, receivedAt, checkedIds: [...new Set(checkedIds)], protectedIds: [...new Set(protectedIds)] } },
  }
}

export const PROTECTION_FRESH_MS = 120_000
export const PROTECTION_RETENTION_MS = 3_600_000

/** Union live client vetoes; an expired lease cannot outvote a current explicit report. */
export function protectionFor(state: ProtectionState, sessionId: string, now = Date.now()): 'unknown' | 'clear' | 'protected' {
  let freshClear = false
  for (const report of Object.values(state.clients)) {
    if (!report.checkedIds.includes(sessionId)) continue
    const age = now - report.receivedAt
    if (age < -PROTECTION_FRESH_MS || age > PROTECTION_FRESH_MS) continue
    if (report.protectedIds.includes(sessionId)) return 'protected'
    freshClear = true
  }
  return freshClear ? 'clear' : 'unknown'
}
