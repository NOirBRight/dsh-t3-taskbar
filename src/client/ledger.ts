import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { GIT_PROBE, LEDGER_APPLY, LEDGER_GET, TASKBAR_RPC_CHANNEL } from '../contract.ts'
import { EMPTY_LEDGER, isRecord, parseLedger, type LedgerSnapshot } from '../ledger-json.ts'
import type { CardMarks, Command } from '../taskbar.ts'

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

function gitMarksOf(value: unknown): CardMarks | undefined {
  if (!isRecord(value)) return undefined
  const marks: CardMarks = {}
  if (typeof value.branch === 'string' && value.branch !== '') marks.branch = value.branch
  if (typeof value.worktree === 'string' && value.worktree !== '') marks.worktree = value.worktree
  if (typeof value.pr === 'string' && value.pr !== '') marks.pr = value.pr
  return Object.keys(marks).length === 0 ? undefined : marks
}

export async function loadGitMarks(
  sessions: readonly { readonly id: string; readonly path: string }[],
): Promise<Readonly<Record<string, CardMarks>>> {
  const paths = [...new Set(sessions.map((row) => row.path))]
  const raw = await call(GIT_PROBE, { paths })
  if (!isRecord(raw)) return {}
  const byPath: Record<string, CardMarks> = {}
  for (const [path, value] of Object.entries(raw)) {
    const marks = gitMarksOf(value)
    if (marks !== undefined) byPath[path] = marks
  }
  const out: Record<string, CardMarks> = {}
  for (const { id, path } of sessions) {
    const marks = byPath[path]
    if (marks !== undefined) out[id] = marks
  }
  return out
}
