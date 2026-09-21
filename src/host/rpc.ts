import { AUTO_SETTLE_PREVIEW, GIT_PROBE, LEDGER_APPLY, LEDGER_GET, PROTECTION_SYNC, SETTINGS_GET, SETTINGS_UPDATE } from '../contract.ts'
import type { TaskbarSettings } from '../settings-values.ts'
import { isRecord } from '../ledger-json.ts'
import { apply, type Command } from '../taskbar.ts'
import { decodeGitProbePaths, probeGitMarks } from './git-probe.ts'
import { readLedgerFile, writeLedgerFile } from './ledger-file.ts'
import { parseProtectionIds, readProtectionFile, updateProtection, writeProtectionFile } from './protection-file.ts'

function fail(message: string): { ok: false; error: { code: 'internal'; message: string; details: Record<string, never> } } {
  return { ok: false, error: { code: 'internal', message, details: {} } }
}

function sessionIdOf(value: Record<string, unknown>): string | undefined {
  if (typeof value.sessionId !== 'string' || value.sessionId.length === 0 || value.sessionId.length > 256) return undefined
  return value.sessionId
}

function timestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function decodeCommand(value: unknown): Command | undefined {
  if (!isRecord(value) || typeof value.type !== 'string') return undefined
  if (value.type === 'Pin' || value.type === 'Unpin') {
    const sessionId = sessionIdOf(value)
    if (sessionId === undefined) return undefined
    return { type: value.type, sessionId }
  }
  if (value.type === 'Wake') {
    const sessionId = sessionIdOf(value)
    if (sessionId === undefined || (value.at !== undefined && !timestamp(value.at))) return undefined
    return { type: 'Wake', sessionId, ...(value.at === undefined ? {} : { at: value.at }) }
  }
  if (value.type === 'Unsettle') {
    const sessionId = sessionIdOf(value)
    if (sessionId === undefined || (value.at !== undefined && !timestamp(value.at))) return undefined
    return { type: 'Unsettle', sessionId, ...(value.at === undefined ? {} : { at: value.at }) }
  }
  if (value.type === 'Settle') {
    const sessionId = sessionIdOf(value)
    if (sessionId === undefined || !timestamp(value.at)) return undefined
    return { type: 'Settle', sessionId, at: value.at }
  }
  if (value.type === 'Snooze') {
    const sessionId = sessionIdOf(value)
    if (sessionId === undefined || !timestamp(value.until)) return undefined
    const pending = value.pendingInteraction
    if (pending === undefined) {
      return { type: 'Snooze', sessionId, until: value.until }
    }
    if (pending !== 'approval' && pending !== 'plan-review' && pending !== 'question') return undefined
    return { type: 'Snooze', sessionId, until: value.until, pendingInteraction: pending }
  }
  if (value.type === 'Drop') {
    const sessionId = sessionIdOf(value)
    if (sessionId === undefined || !Number.isSafeInteger(value.index) || (value.index as number) < 0) return undefined
    if (value.dest !== 'pinned' && value.dest !== 'active' && value.dest !== 'settled') return undefined
    if (!timestamp(value.at) || (value.now !== undefined && !timestamp(value.now))) return undefined
    const shelfIds = value.shelfIds === undefined ? undefined : parseProtectionIds(value.shelfIds)
    if (value.shelfIds !== undefined && shelfIds === undefined) return undefined
    return {
      type: 'Drop',
      sessionId,
      dest: value.dest,
      index: value.index as number,
      ...(typeof value.at === 'number' ? { at: value.at } : {}),
      ...(typeof value.now === 'number' ? { now: value.now } : {}),
      ...(shelfIds === undefined ? {} : { shelfIds }),
    }
  }
  if (value.type !== 'Gc') return undefined
  const livingIds = parseProtectionIds(value.livingIds)
  return livingIds === undefined ? undefined : { type: 'Gc', livingIds }
}

function decodeProtectionSync(payload: unknown): { clientId: string; seq: number; checkedIds: string[]; protectedIds: string[] } | undefined {
  if (!isRecord(payload) || typeof payload.clientId !== 'string' || payload.clientId.length === 0 || payload.clientId.length > 128) return undefined
  if (!Number.isSafeInteger(payload.seq) || (payload.seq as number) < 0) return undefined
  const checkedIds = parseProtectionIds(payload.checkedIds)
  const protectedIds = parseProtectionIds(payload.protectedIds)
  if (checkedIds === undefined || protectedIds === undefined || protectedIds.some(id => !checkedIds.includes(id))) return undefined
  return { clientId: payload.clientId, seq: payload.seq as number, checkedIds, protectedIds }
}

export function commandAtHostTime(command: Command, receivedAt: number): Command {
  if (command.type === 'Pin' || command.type === 'Settle' || command.type === 'Unsettle' || command.type === 'Snooze' || command.type === 'Wake') return { ...command, at: receivedAt }
  if (command.type !== 'Drop') return command
  return {
    ...command,
    ...(command.at === undefined ? {} : { at: receivedAt }),
    ...(command.now === undefined ? {} : { now: receivedAt }),
  }
}

export interface TaskbarRpcOptions {
  previewAutoSettle?: () => Promise<unknown>
  getSettings?: () => TaskbarSettings
  updateSettings?: (patch: Partial<TaskbarSettings>) => Promise<void>
}

export async function handleTaskbarRpc(endpoint: string, payload: unknown, options: TaskbarRpcOptions = {}): Promise<
  | { ok: true; value: unknown }
  | { ok: false; error: { code: 'internal'; message: string; details: Record<string, never> } }
> {
  if (endpoint === LEDGER_GET) {
    return { ok: true, value: readLedgerFile() }
  }
  if (endpoint === GIT_PROBE) {
    const paths = decodeGitProbePaths(payload)
    if (paths === undefined) return fail('invalid git probe payload')
    return { ok: true, value: await probeGitMarks(paths) }
  }
  if (endpoint === PROTECTION_SYNC) {
    const report = decodeProtectionSync(payload)
    if (report === undefined) return fail('invalid protection payload')
    const current = readProtectionFile()
    const next = updateProtection(current, report.clientId, report.seq, report.checkedIds, report.protectedIds, Date.now())
    if (next !== current) writeProtectionFile(next)
    return { ok: true, value: { accepted: next !== current } }
  }
  if (endpoint === AUTO_SETTLE_PREVIEW) {
    if (options.previewAutoSettle === undefined) return fail('auto settle unavailable')
    return { ok: true, value: await options.previewAutoSettle() }
  }
  if (endpoint === SETTINGS_GET) {
    if (options.getSettings === undefined) return fail('settings unavailable')
    return { ok: true, value: options.getSettings() }
  }
  if (endpoint === SETTINGS_UPDATE) {
    if (options.updateSettings === undefined || !isRecord(payload)) return fail('invalid settings payload')
    if ('autoSettleAfterDays' in payload && payload.autoSettleAfterDays !== null && (!Number.isInteger(payload.autoSettleAfterDays) || (payload.autoSettleAfterDays as number) < 1 || (payload.autoSettleAfterDays as number) > 90)) return fail('invalid inactivity days')
    if ('autoSettleOnMerge' in payload && typeof payload.autoSettleOnMerge !== 'boolean') return fail('invalid merge setting')
    if ('autoSettleOnClose' in payload && typeof payload.autoSettleOnClose !== 'boolean') return fail('invalid close setting')
    const patch: Partial<TaskbarSettings> = {
      ...('autoSettleAfterDays' in payload ? { autoSettleAfterDays: payload.autoSettleAfterDays as number | null } : {}),
      ...('autoSettleOnMerge' in payload ? { autoSettleOnMerge: payload.autoSettleOnMerge as boolean } : {}),
      ...('autoSettleOnClose' in payload ? { autoSettleOnClose: payload.autoSettleOnClose as boolean } : {}),
    }
    await options.updateSettings(patch)
    return { ok: true, value: options.getSettings?.() ?? patch }
  }
  if (endpoint !== LEDGER_APPLY) return fail('unknown endpoint')
  if (!isRecord(payload) || !Number.isSafeInteger(payload.revision) || (payload.revision as number) < 0) return fail('invalid apply payload')
  let command = decodeCommand(payload.command)
  if (command === undefined) return fail('invalid command')
  command = commandAtHostTime(command, Date.now())
  const current = readLedgerFile()
  if (payload.revision !== current.revision) {
    return fail(`ledger revision ${String(payload.revision)} != ${String(current.revision)}`)
  }
  const records = apply(current.records, command)
  if (unchanged(current.records, records)) return { ok: true, value: current }
  const next = { schemaVersion: 3 as const, revision: current.revision + 1, records }
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
