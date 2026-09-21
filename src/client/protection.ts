import { PROTECTION_SYNC } from '../contract.ts'
import { callTaskbarRpc } from './rpc.ts'

const KEY = 'dsh.t3-taskbar.client-id'
const SEQUENCE_KEY = 'dsh.t3-taskbar.client-sequence'
let fallbackId: string | undefined
let fallbackSequence = 0
const runtimeProtected = new Set<string>()
let runtimeSnapshot: readonly string[] = []
const listeners = new Set<() => void>()

function clientId(): string {
  if (fallbackId !== undefined) return fallbackId
  try {
    const stored = sessionStorage.getItem(KEY)
    const storedSequence = sessionStorage.getItem(SEQUENCE_KEY)
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (shouldReuseProtectionClient(stored, storedSequence, navigation?.type)) return (fallbackId = stored as string)
    const created = crypto.randomUUID()
    sessionStorage.setItem(KEY, created)
    sessionStorage.setItem(SEQUENCE_KEY, '0')
    return (fallbackId = created)
  } catch {
    return (fallbackId = crypto.randomUUID())
  }
}

export function shouldReuseProtectionClient(storedId: string | null, storedSequence: string | null, navigationType: PerformanceNavigationTiming['type'] | undefined): boolean {
  return storedId !== null && storedId !== '' && validProtectionSequence(storedSequence) && navigationType !== 'navigate'
}

export function validProtectionSequence(raw: string | null): boolean {
  if (raw === null || !/^\d+$/.test(raw)) return false
  const current = Number(raw)
  return Number.isSafeInteger(current) && current >= 0 && current < Number.MAX_SAFE_INTEGER
}

export function nextProtectionSequence(raw: string | null): number {
  return validProtectionSequence(raw) ? Number(raw) + 1 : 1
}

function nextSequence(): number {
  try {
    const next = nextProtectionSequence(sessionStorage.getItem(SEQUENCE_KEY))
    sessionStorage.setItem(SEQUENCE_KEY, String(next))
    return next
  } catch {
    fallbackSequence += 1
    return fallbackSequence
  }
}

export function setRuntimeProtected(sessionId: string, protectedNow: boolean): void {
  const changed = protectedNow ? !runtimeProtected.has(sessionId) : runtimeProtected.has(sessionId)
  if (!changed) return
  if (protectedNow) runtimeProtected.add(sessionId)
  else runtimeProtected.delete(sessionId)
  runtimeSnapshot = [...runtimeProtected]
  for (const listener of listeners) listener()
}

export function runtimeProtectionSnapshot(): readonly string[] {
  return runtimeSnapshot
}

export function subscribeRuntimeProtection(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function syncProtection(checkedIds: readonly string[], protectedIds: readonly string[]): Promise<void> {
  const id = clientId()
  await callTaskbarRpc(PROTECTION_SYNC, {
    clientId: id,
    seq: nextSequence(),
    checkedIds: [...new Set(checkedIds)],
    protectedIds: [...new Set(protectedIds)],
  })
}
