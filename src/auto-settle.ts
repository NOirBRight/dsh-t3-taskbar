import type { Shelf } from './taskbar.ts'

export interface AutoSettleSettings {
  readonly autoSettleAfterDays: number | null
  readonly autoSettleOnMerge: boolean
  readonly autoSettleOnClose: boolean
}

export interface PullRequestFact {
  readonly number: number
  readonly state: 'open' | 'merged' | 'closed'
  readonly terminalAt?: number
}

export interface AutoSettleCandidate {
  readonly sessionId: string
  readonly latestActivityAt: number
  readonly blank: boolean
  readonly running: boolean
  readonly archived: boolean
  readonly origin: 'user' | 'subagent'
  readonly shelf: Shelf
  readonly protected: boolean
  readonly manualActiveAt?: number
  readonly pr?: PullRequestFact
}

export type AutoSettleDecision =
  | { readonly reason: 'inactive'; readonly settledAt: number }
  | { readonly reason: 'pr-merged' | 'pr-closed'; readonly settledAt: number; readonly pr: number }

const DAY_MS = 86_400_000

/** Pure final eligibility check; uncertain facts always skip. */
export function autoSettleDecision(
  candidate: AutoSettleCandidate,
  settings: AutoSettleSettings,
  now: number,
): AutoSettleDecision | undefined {
  if (candidate.blank || candidate.running || candidate.archived || candidate.origin === 'subagent') return undefined
  if (candidate.shelf !== 'active' || candidate.protected) return undefined
  if (candidate.manualActiveAt !== undefined && candidate.latestActivityAt <= candidate.manualActiveAt) return undefined

  const pr = candidate.pr
  if (pr?.terminalAt !== undefined && pr.terminalAt >= candidate.latestActivityAt) {
    if (pr.state === 'merged' && settings.autoSettleOnMerge) {
      return { reason: 'pr-merged', settledAt: pr.terminalAt, pr: pr.number }
    }
    if (pr.state === 'closed' && settings.autoSettleOnClose) {
      return { reason: 'pr-closed', settledAt: pr.terminalAt, pr: pr.number }
    }
  }

  const days = settings.autoSettleAfterDays
  if (days !== null && candidate.latestActivityAt < now - days * DAY_MS) {
    return { reason: 'inactive', settledAt: candidate.latestActivityAt }
  }
  return undefined
}
