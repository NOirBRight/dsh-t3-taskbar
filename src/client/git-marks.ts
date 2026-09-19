import { GIT_PROBE } from '../contract.ts'
import { isRecord } from '../ledger-json.ts'
import { copyGitMarks, type GitMarks } from '../taskbar.ts'
import { callTaskbarRpc } from './rpc.ts'

function gitMarksOf(value: unknown): GitMarks | undefined {
  if (!isRecord(value)) return undefined
  return copyGitMarks({
    ...(typeof value.branch === 'string' ? { branch: value.branch } : {}),
    ...(typeof value.worktree === 'string' ? { worktree: value.worktree } : {}),
    ...(typeof value.pr === 'string' ? { pr: value.pr } : {}),
  })
}

export async function loadGitMarks(
  sessions: readonly { readonly id: string; readonly path: string }[],
): Promise<Readonly<Record<string, GitMarks>>> {
  const paths = [...new Set(sessions.map((row) => row.path))]
  const raw = await callTaskbarRpc(GIT_PROBE, { paths })
  if (!isRecord(raw)) return {}
  const byPath: Record<string, GitMarks> = {}
  for (const [path, value] of Object.entries(raw)) {
    const marks = gitMarksOf(value)
    if (marks !== undefined) byPath[path] = marks
  }
  const out: Record<string, GitMarks> = {}
  for (const { id, path } of sessions) {
    const marks = byPath[path]
    if (marks !== undefined) out[id] = marks
  }
  return out
}
