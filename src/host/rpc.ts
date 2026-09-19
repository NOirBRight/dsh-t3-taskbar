import { GIT_PROBE, LEDGER_APPLY, LEDGER_GET } from '../contract.ts'
import { isRecord } from '../ledger-json.ts'
import { apply, type Command } from '../taskbar.ts'
import { probeGitMarks } from './git-probe.ts'
import { readLedgerFile, writeLedgerFile } from './ledger-file.ts'

function fail(message: string): { ok: false; error: { code: 'internal'; message: string; details: Record<string, never> } } {
  return { ok: false, error: { code: 'internal', message, details: {} } }
}

function sessionIdOf(value: Record<string, unknown>): string | undefined {
  if (typeof value.sessionId !== 'string' || value.sessionId === '') return undefined
  return value.sessionId
}

function decodeCommand(value: unknown): Command | undefined {
  if (!isRecord(value) || typeof value.type !== 'string') return undefined
  if (value.type === 'Pin' || value.type === 'Unpin' || value.type === 'Wake' || value.type === 'Unsettle') {
    const sessionId = sessionIdOf(value)
    if (sessionId === undefined) return undefined
    return { type: value.type, sessionId }
  }
  if (value.type === 'Settle') {
    const sessionId = sessionIdOf(value)
    if (sessionId === undefined || typeof value.at !== 'number') return undefined
    return { type: 'Settle', sessionId, at: value.at }
  }
  if (value.type === 'Snooze') {
    const sessionId = sessionIdOf(value)
    if (sessionId === undefined || typeof value.until !== 'number') return undefined
    const pending = value.pendingInteraction
    if (pending === undefined) {
      return { type: 'Snooze', sessionId, until: value.until }
    }
    if (pending !== 'approval' && pending !== 'plan-review' && pending !== 'question') return undefined
    return { type: 'Snooze', sessionId, until: value.until, pendingInteraction: pending }
  }
  if (value.type === 'Drop') {
    const sessionId = sessionIdOf(value)
    if (sessionId === undefined || typeof value.index !== 'number') return undefined
    if (value.dest !== 'pinned' && value.dest !== 'active' && value.dest !== 'settled') return undefined
    let shelfIds: string[] | undefined
    if (Array.isArray(value.shelfIds)) {
      shelfIds = []
      for (const id of value.shelfIds) {
        if (typeof id !== 'string') return undefined
        shelfIds.push(id)
      }
    }
    return {
      type: 'Drop',
      sessionId,
      dest: value.dest,
      index: value.index,
      ...(typeof value.at === 'number' ? { at: value.at } : {}),
      ...(typeof value.now === 'number' ? { now: value.now } : {}),
      ...(shelfIds === undefined ? {} : { shelfIds }),
    }
  }
  if (value.type !== 'Gc' || !Array.isArray(value.livingIds)) return undefined
  const livingIds: string[] = []
  for (const id of value.livingIds) {
    if (typeof id !== 'string') return undefined
    livingIds.push(id)
  }
  return { type: 'Gc', livingIds }
}

export async function handleLedgerRpc(endpoint: string, payload: unknown): Promise<
  | { ok: true; value: unknown }
  | { ok: false; error: { code: 'internal'; message: string; details: Record<string, never> } }
> {
  if (endpoint === LEDGER_GET) {
    return { ok: true, value: readLedgerFile() }
  }
  if (endpoint === GIT_PROBE) {
    const paths = decodePaths(payload)
    if (paths === undefined) return fail('invalid git probe payload')
    return { ok: true, value: await probeGitMarks(paths) }
  }
  if (endpoint !== LEDGER_APPLY) return fail('unknown endpoint')
  if (!isRecord(payload) || typeof payload.revision !== 'number') return fail('invalid apply payload')
  const command = decodeCommand(payload.command)
  if (command === undefined) return fail('invalid command')
  const current = readLedgerFile()
  if (payload.revision !== current.revision) {
    return fail(`ledger revision ${String(payload.revision)} != ${String(current.revision)}`)
  }
  const records = apply(current.records, command)
  if (unchanged(current.records, records)) return { ok: true, value: current }
  const next = { revision: current.revision + 1, records }
  writeLedgerFile(next)
  return { ok: true, value: next }
}

function decodePaths(payload: unknown): string[] | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.paths)) return undefined
  const paths: string[] = []
  for (const path of payload.paths) {
    if (typeof path !== 'string' || path === '') return undefined
    paths.push(path)
  }
  return paths
}

function unchanged(left: ReturnType<typeof apply>, right: ReturnType<typeof apply>): boolean {
  const ids = Object.keys(left)
  if (ids.length !== Object.keys(right).length) return false
  for (const id of ids) {
    if (left[id] !== right[id]) return false
  }
  return true
}
