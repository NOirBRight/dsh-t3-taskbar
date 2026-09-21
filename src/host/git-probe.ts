/** Host git/PR probes. Never writes GitHub tokens. */

import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { isRecord } from '../ledger-json.ts'
import type { GitMarks } from '../taskbar.ts'
import type { PullRequestFact } from '../auto-settle.ts'

const TTL_MS = 30_000
const TIMEOUT_MS = 8_000

const silentEnv: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
  GH_PROMPT_DISABLED: '1',
}

const cache = new Map<string, { at: number; marks: GitMarks }>()
const inflight = new Map<string, Promise<GitMarks>>()

async function run(cmd: string, args: readonly string[], cwd: string): Promise<string | undefined> {
  try {
    const stdout = await execUtf8(cmd, args, cwd)
    return stdout.trim()
  } catch {
    return undefined
  }
}

function execUtf8(cmd: string, args: readonly string[], cwd: string): Promise<string> {
  return new Promise((ok, fail) => {
    execFile(cmd, [...args], {
      cwd,
      timeout: TIMEOUT_MS,
      encoding: 'utf8',
      env: silentEnv,
      windowsHide: true,
    }, (error, stdout) => {
      if (error !== null) fail(error)
      else ok(stdout)
    })
  })
}

function linkedWorktreeMark(toplevel: string, porcelain: string): string | undefined {
  const roots: string[] = []
  for (const line of porcelain.split('\n')) {
    if (line.startsWith('worktree ')) roots.push(line.slice('worktree '.length))
  }
  if (roots.length < 2) return undefined
  const top = resolve(toplevel)
  for (const root of roots.slice(1)) {
    if (resolve(root) === top) return 'true'
  }
  return undefined
}

function prMark(raw: string | undefined): string | undefined {
  if (raw === undefined || raw === '') return undefined
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || !('number' in parsed)) return undefined
    const number = parsed.number
    if (typeof number !== 'number' || !Number.isInteger(number) || number <= 0) return undefined
    return `#${String(number)}`
  } catch {
    return undefined
  }
}

async function ghAuthed(cwd: string): Promise<boolean> {
  try {
    await execUtf8('gh', ['auth', 'status'], cwd)
    return true
  } catch {
    return false
  }
}

async function probePath(path: string): Promise<GitMarks> {
  const inside = await run('git', ['rev-parse', '--is-inside-work-tree'], path)
  if (inside !== 'true') return {}
  const marks: GitMarks = {}
  const branch = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], path)
  if (branch !== undefined && branch !== '') marks.branch = branch
  const toplevel = await run('git', ['rev-parse', '--show-toplevel'], path)
  const porcelain = await run('git', ['worktree', 'list', '--porcelain'], path)
  if (toplevel !== undefined && porcelain !== undefined) {
    const worktree = linkedWorktreeMark(toplevel, porcelain)
    if (worktree !== undefined) marks.worktree = worktree
  }
  if (await ghAuthed(path)) {
    const pr = prMark(await run('gh', ['pr', 'view', '--json', 'number'], path))
    if (pr !== undefined) marks.pr = pr
  }
  return marks
}

async function probePathCached(path: string, now: number): Promise<GitMarks> {
  const hit = cache.get(path)
  if (hit !== undefined && now - hit.at < TTL_MS) return hit.marks
  const pending = inflight.get(path)
  if (pending !== undefined) return pending
  const work = probePath(path).then((marks) => {
    cache.set(path, { at: Date.now(), marks })
    inflight.delete(path)
    return marks
  }, () => {
    inflight.delete(path)
    return {}
  })
  inflight.set(path, work)
  return work
}

async function probePullRequestUncached(path: string): Promise<PullRequestFact | undefined> {
  if (await run('git', ['rev-parse', '--is-inside-work-tree'], path) !== 'true') return undefined
  if (!await ghAuthed(path)) return undefined
  const [branch, head, raw] = await Promise.all([
    run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], path),
    run('git', ['rev-parse', 'HEAD'], path),
    run('gh', ['pr', 'view', '--json', 'number,state,mergedAt,closedAt,headRefName,headRefOid'], path),
  ])
  if (branch === undefined || branch === 'HEAD' || head === undefined || raw === undefined) return undefined
  try {
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value) || !Number.isInteger(value.number) || (value.number as number) <= 0) return undefined
    if (value.headRefName !== branch || value.headRefOid !== head) return undefined
    if (value.state === 'OPEN') return { number: value.number as number, state: 'open' }
    const date = value.state === 'MERGED' ? value.mergedAt : value.state === 'CLOSED' ? value.closedAt : undefined
    if (typeof date !== 'string') return undefined
    const terminalAt = Date.parse(date)
    if (!Number.isFinite(terminalAt)) return undefined
    return { number: value.number as number, state: value.state === 'MERGED' ? 'merged' : 'closed', terminalAt }
  } catch {
    return undefined
  }
}

/** Trusted branch-local PR fact. Unknown/auth/network/mismatch all fail closed. */
export function probePullRequest(path: string): Promise<PullRequestFact | undefined> {
  return probePullRequestUncached(path)
}

export async function probeGitMarks(paths: readonly string[]): Promise<Record<string, GitMarks>> {
  const now = Date.now()
  const result: Record<string, GitMarks> = {}
  await Promise.all(paths.map(async (path) => {
    const marks = await probePathCached(path, now)
    if (Object.keys(marks).length > 0) result[path] = marks
  }))
  return result
}

export function decodeGitProbePaths(payload: unknown): string[] | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.paths)) return undefined
  const paths: string[] = []
  for (const path of payload.paths) {
    if (typeof path !== 'string' || path === '') return undefined
    paths.push(path)
  }
  return paths
}
