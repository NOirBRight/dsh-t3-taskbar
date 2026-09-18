import { LEDGER_APPLY, LEDGER_GET } from '../contract.ts'
import { apply, type Command } from '../taskbar.ts'
import { readLedgerFile, writeLedgerFile } from './ledger-file.ts'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(message: string): { ok: false; error: { code: 'internal'; message: string; details: Record<string, never> } } {
  return { ok: false, error: { code: 'internal', message, details: {} } }
}

function decodeCommand(value: unknown): Command | undefined {
  if (!isRecord(value) || typeof value.type !== 'string') return undefined
  if (value.type === 'Pin' || value.type === 'Unpin' || value.type === 'Wake') {
    if (typeof value.sessionId !== 'string' || value.sessionId === '') return undefined
    return { type: value.type, sessionId: value.sessionId }
  }
  if (value.type === 'Snooze') {
    if (typeof value.sessionId !== 'string' || value.sessionId === '') return undefined
    if (typeof value.until !== 'number') return undefined
    const pending = value.pendingInteraction
    if (pending === undefined) {
      return { type: 'Snooze', sessionId: value.sessionId, until: value.until }
    }
    if (pending !== 'approval' && pending !== 'plan-review' && pending !== 'question') return undefined
    return { type: 'Snooze', sessionId: value.sessionId, until: value.until, pendingInteraction: pending }
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

function unchanged(left: ReturnType<typeof apply>, right: ReturnType<typeof apply>): boolean {
  const ids = Object.keys(left)
  if (ids.length !== Object.keys(right).length) return false
  for (const id of ids) {
    if (left[id] !== right[id]) return false
  }
  return true
}
