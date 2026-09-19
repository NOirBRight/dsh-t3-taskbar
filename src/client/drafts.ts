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

function attachmentCount(value: Record<string, unknown>): number {
  for (const key of ['imageIds', 'images', 'attachments'] as const) {
    const listed = value[key]
    if (Array.isArray(listed) && listed.length > 0) return listed.length
  }
  return 0
}

function persistRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

/** Observable composer preview. Empty means no Unsent Draft. */
export function previewFromChatPersist(value: unknown): string {
  const record = persistRecord(value)
  if (record === undefined) return ''
  const draft = record.draft
  if (typeof draft === 'string' && draft !== '') return draft
  const count = attachmentCount(record)
  return count === 0 ? '' : `📎 ${String(count)}`
}

export function readDraft(sessionId: string): string {
  if (typeof localStorage === 'undefined') return ''
  try {
    const raw = localStorage.getItem(key(sessionId))
    if (raw === null) return ''
    return previewFromChatPersist(JSON.parse(raw))
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
      localStorage.setItem(persistKey, JSON.stringify({ ...parsed, draft: '', imageIds: [], images: [], attachments: [] }))
    } else {
      localStorage.removeItem(persistKey)
    }
  } catch {
    try { localStorage.removeItem(key(sessionId)) } catch { /* ignore quota / private mode */ }
  }
  notify()
}
