/** Read/discard DSH composer persist. Does not delete Sessions. */

const PREFIX = 'dsh.conversation.chat.'

const listeners = new Set<() => void>()

function key(sessionId: string): string {
  return `${PREFIX}${sessionId}`
}

function notify(): void {
  for (const listener of listeners) listener()
}

export function subscribeDrafts(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = () => listener()
  window.addEventListener('storage', onStorage)
  // ponytail: 500ms poll; same-window localStorage writes do not fire storage.
  const timer = window.setInterval(onStorage, 500)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
    window.clearInterval(timer)
  }
}

export function readDraft(sessionId: string): string {
  if (typeof localStorage === 'undefined') return ''
  try {
    const raw = localStorage.getItem(key(sessionId))
    if (raw === null) return ''
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return ''
    const draft = (parsed as { draft?: unknown }).draft
    return typeof draft === 'string' ? draft : ''
  } catch {
    return ''
  }
}

let cachedJson = ''
let cached: Readonly<Record<string, string>> = {}

export function draftsSnapshot(sessionIds: readonly string[]): Readonly<Record<string, string>> {
  const next: Record<string, string> = {}
  for (const sessionId of sessionIds) {
    const text = readDraft(sessionId)
    if (text !== '') next[sessionId] = text
  }
  const json = JSON.stringify(next)
  if (json === cachedJson) return cached
  cachedJson = json
  cached = next
  return cached
}

export function discardDraft(sessionId: string): void {
  if (typeof localStorage === 'undefined') {
    notify()
    return
  }
  try {
    const persistKey = key(sessionId)
    const raw = localStorage.getItem(persistKey)
    if (raw === null) {
      notify()
      return
    }
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object') {
      localStorage.setItem(persistKey, JSON.stringify({ ...parsed, draft: '' }))
    } else {
      localStorage.removeItem(persistKey)
    }
  } catch {
    try { localStorage.removeItem(key(sessionId)) } catch { /* ignore quota / private mode */ }
  }
  notify()
}
