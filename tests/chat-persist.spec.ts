import { describe, expect, it } from 'vitest'
import { draftsSnapshot, previewFromChatPersist, readDraft } from '../src/client/drafts.ts'

function withLocalStorage(items: Record<string, string>, run: () => void): void {
  const previous = globalThis.localStorage
  const store = { ...items }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value },
      removeItem: (key: string) => { delete store[key] },
    },
  })
  try {
    run()
  } finally {
    if (previous === undefined) {
      Reflect.deleteProperty(globalThis, 'localStorage')
    } else {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previous })
    }
  }
}

describe('previewFromChatPersist', () => {
  it('returns a non-empty draft string', () => {
    expect(previewFromChatPersist({ draft: 'please fix the login' })).toBe('please fix the login')
  })

  it('ignores runtime-only attachment lookalikes in persisted data', () => {
    expect(previewFromChatPersist({ draft: '', imageIds: ['stale'] })).toBe('')
    expect(previewFromChatPersist({ attachments: [{ id: 'stale' }] })).toBe('')
  })

  it('returns empty when draft is empty', () => {
    expect(previewFromChatPersist({ draft: '' })).toBe('')
    expect(previewFromChatPersist(null)).toBe('')
  })
})

describe('draftsSnapshot', () => {
  it('reads alpha.2 conversation persistence keys', () => {
    withLocalStorage({
      'dsh.conversation.s1': JSON.stringify({ draft: 'real draft', view: null, viewRequest: null }),
      'dsh.conversation.chat.s1': JSON.stringify({ draft: 'obsolete draft' }),
    }, () => {
      expect(readDraft('s1')).toBe('real draft')
    })
  })

  it('returns the same object when Unsent Drafts have not changed', () => {
    withLocalStorage({}, () => {
      const first = draftsSnapshot(['s1', 's2'])
      const second = draftsSnapshot(['s1', 's2'])
      expect(first).toBe(second)
    })
  })
})
