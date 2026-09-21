import type { Context } from '@deepseek-ai/cordis'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/types'
import type {} from '@deepseek-ai/dsh-api-session-controller'
import type {} from '@deepseek-ai/dsh-api-workspace-controller'
import { autoSettleDecision, type AutoSettleDecision, type PullRequestFact } from '../auto-settle.ts'
import type { Ledger, Shelf } from '../taskbar.ts'
import type { TaskbarSettings } from '../settings-values.ts'
import { isRecord } from '../ledger-json.ts'
import { readLedgerFile, writeLedgerFile } from './ledger-file.ts'
import { probePullRequest } from './git-probe.ts'
import { protectionFor, readProtectionFile } from './protection-file.ts'
import { apply } from '../taskbar.ts'

export interface AutoSettlePreviewRow {
  readonly sessionId: string
  readonly eligible: boolean
  readonly reason: string
  readonly settledAt?: number
  readonly pr?: number
}

export interface AutoSettlePreview {
  readonly enabled: boolean
  readonly eligible: number
  readonly rows: readonly AutoSettlePreviewRow[]
}

function shelfOf(ledger: Ledger, sessionId: string, now: number): Shelf {
  const entry = ledger[sessionId]
  if (entry?.snoozedUntil !== undefined && entry.snoozedUntil > now) return 'snoozed'
  if (entry?.settledAt !== undefined) return 'settled'
  if (entry?.pin !== undefined) return 'pinned'
  return 'active'
}

function directUserMessage(event: { type: string; data: unknown }): boolean {
  if (event.type !== 'user/message' || !isRecord(event.data)) return false
  return isRecord(event.data.source) && event.data.source.kind === 'user'
}

async function latestActivityAt(ctx: Context, session: SessionSummary): Promise<number> {
  const inspection = await ctx.sessionController.inspect(session.sessionId)
  let latest = Math.max(session.updatedAt, inspection.meta.createdAt)
  for (const event of inspection.events) {
    if (event.type === 'turn/start' || event.type === 'turn/end' || directUserMessage(event)) latest = Math.max(latest, event.time)
  }
  return latest
}

async function activeJobIds(ctx: Context): Promise<Set<string>> {
  const controller = new AbortController()
  const iterator = ctx.sessionController.control(controller.signal)[Symbol.asyncIterator]()
  try {
    const first = await iterator.next()
    if (first.done || first.value.type !== 'baseline') throw new Error('session control baseline unavailable')
    return new Set(Object.entries(first.value.value.jobs)
      .filter(([, jobs]) => jobs.some(job => job.status === 'running' || job.status === 'stopping'))
      .map(([sessionId]) => sessionId))
  } finally {
    controller.abort()
    await iterator.return?.()
  }
}

async function archivedIds(ctx: Context): Promise<Set<string>> {
  const controller = new AbortController()
  const iterator = ctx.workspaceController.follow(controller.signal)[Symbol.asyncIterator]()
  try {
    const first = await iterator.next()
    if (first.done || first.value.type !== 'baseline') throw new Error('workspace baseline unavailable')
    return new Set(first.value.value.archivedSessionIds)
  } finally {
    controller.abort()
    await iterator.return?.()
  }
}

function enabled(settings: TaskbarSettings): boolean {
  return settings.autoSettleAfterDays !== null || settings.autoSettleOnMerge || settings.autoSettleOnClose
}

interface Evaluated {
  summary: SessionSummary
  activityAt: number
  decision?: AutoSettleDecision
  row: AutoSettlePreviewRow
}

async function evaluate(ctx: Context, settings: TaskbarSettings, now: number): Promise<{ evaluated: Evaluated[]; ledgerRevision: number }> {
  const signal = new AbortController().signal
  const [{ items }, archived, activeJobs, ledger, protections] = await Promise.all([
    ctx.sessionController.list({}, signal),
    archivedIds(ctx),
    activeJobIds(ctx),
    Promise.resolve().then(readLedgerFile),
    Promise.resolve().then(readProtectionFile),
  ])
  const evaluated: Evaluated[] = []
  const prFacts = new Map<string, Promise<PullRequestFact | undefined>>()
  for (const summary of items) {
    const shelf = shelfOf(ledger.records, summary.sessionId, now)
    const protectedState = protectionFor(protections, summary.sessionId, now)
    if (summary.blank || summary.origin === 'subagent' || archived.has(summary.sessionId) || shelf !== 'active' || summary.running || activeJobs.has(summary.sessionId) || protectedState !== 'clear') {
      const reason = summary.blank ? 'blank'
        : summary.origin === 'subagent' ? 'subagent'
          : archived.has(summary.sessionId) ? 'archived'
            : shelf !== 'active' ? shelf
              : summary.running ? 'running'
                : activeJobs.has(summary.sessionId) ? 'background-job'
                  : protectedState === 'protected' ? 'protected' : 'protection-unknown'
      evaluated.push({ summary, activityAt: summary.updatedAt, row: { sessionId: summary.sessionId, eligible: false, reason } })
      continue
    }
    const activityAt = await latestActivityAt(ctx, summary)
    let pr: PullRequestFact | undefined
    if ((settings.autoSettleOnMerge || settings.autoSettleOnClose) && summary.cwd !== undefined) {
      let pending = prFacts.get(summary.cwd)
      if (pending === undefined) {
        pending = probePullRequest(summary.cwd)
        prFacts.set(summary.cwd, pending)
      }
      pr = await pending
    }
    const manualActiveAt = ledger.records[summary.sessionId]?.manualActiveAt
    const decision = autoSettleDecision({
      sessionId: summary.sessionId,
      latestActivityAt: activityAt,
      blank: summary.blank,
      running: summary.running,
      archived: false,
      origin: 'user',
      shelf,
      protected: false,
      ...(manualActiveAt === undefined ? {} : { manualActiveAt }),
      ...(pr === undefined ? {} : { pr }),
    }, settings, now)
    evaluated.push({
      summary,
      activityAt,
      ...(decision === undefined ? {} : { decision }),
      row: decision === undefined
        ? { sessionId: summary.sessionId, eligible: false, reason: 'not-due' }
        : { sessionId: summary.sessionId, eligible: true, reason: decision.reason, settledAt: decision.settledAt, ...('pr' in decision ? { pr: decision.pr } : {}) },
    })
  }
  return { evaluated, ledgerRevision: ledger.revision }
}

export async function previewAutoSettle(ctx: Context, settings: TaskbarSettings, now = Date.now()): Promise<AutoSettlePreview> {
  if (!enabled(settings)) return { enabled: false, eligible: 0, rows: [] }
  const { evaluated } = await evaluate(ctx, settings, now)
  return { enabled: true, eligible: evaluated.filter(item => item.decision !== undefined).length, rows: evaluated.map(item => item.row) }
}

/** Scan, revalidate the Host snapshot, then atomically commit all still-valid decisions. */
export async function runAutoSettle(ctx: Context, settings: TaskbarSettings, now = Date.now(), policyCurrent: () => boolean = () => true): Promise<number> {
  if (!enabled(settings)) return 0
  const { evaluated, ledgerRevision } = await evaluate(ctx, settings, now)
  const candidates = evaluated.filter((item): item is Evaluated & { decision: AutoSettleDecision } => item.decision !== undefined)
  if (candidates.length === 0) return 0

  const prPaths = [...new Set(candidates.flatMap(candidate => candidate.decision.reason === 'inactive' || candidate.summary.cwd === undefined ? [] : [candidate.summary.cwd]))]
  const prPairs = await Promise.all(prPaths.map(async path => [path, await probePullRequest(path)] as const))
  const signal = new AbortController().signal
  const [activityPairs, { items }, archived, activeJobs] = await Promise.all([
    Promise.all(candidates.map(async candidate => [candidate.summary.sessionId, await latestActivityAt(ctx, candidate.summary)] as const)),
    ctx.sessionController.list({}, signal),
    archivedIds(ctx),
    activeJobIds(ctx),
  ])
  const prFacts = new Map(prPairs)
  const activities = new Map(activityPairs)

  // Everything below is synchronous: Protection, policy, and ledger revision are the final commit boundary.
  const commitNow = Date.now()
  const summaries = new Map(items.map(item => [item.sessionId, item]))
  const protections = readProtectionFile()
  const current = readLedgerFile()
  if (current.revision !== ledgerRevision || !policyCurrent()) return 0
  let records = current.records
  let committed = 0
  for (const candidate of candidates) {
    const latest = summaries.get(candidate.summary.sessionId)
    if (latest === undefined || latest.running || latest.updatedAt !== candidate.summary.updatedAt || latest.cwd !== candidate.summary.cwd || activities.get(candidate.summary.sessionId) !== candidate.activityAt || archived.has(candidate.summary.sessionId) || activeJobs.has(candidate.summary.sessionId)) continue
    if (shelfOf(records, candidate.summary.sessionId, commitNow) !== 'active' || protectionFor(protections, candidate.summary.sessionId, commitNow) !== 'clear') continue
    if (candidate.decision.reason !== 'inactive') {
      if (latest.cwd === undefined) continue
      const pr = prFacts.get(latest.cwd)
      const state = candidate.decision.reason === 'pr-merged' ? 'merged' : 'closed'
      if (pr?.number !== candidate.decision.pr || pr.state !== state || pr.terminalAt !== candidate.decision.settledAt) continue
    }
    records = apply(records, {
      type: 'AutoSettle',
      sessionId: candidate.summary.sessionId,
      at: candidate.decision.settledAt,
      reason: candidate.decision.reason,
      ...('pr' in candidate.decision ? { pr: candidate.decision.pr } : {}),
    })
    committed += 1
  }
  if (committed === 0 || readLedgerFile().revision !== current.revision) return 0
  writeLedgerFile({ schemaVersion: 3, revision: current.revision + 1, records })
  return committed
}
