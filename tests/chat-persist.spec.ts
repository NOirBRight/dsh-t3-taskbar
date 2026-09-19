import { describe, expect, it } from 'vitest'
import { draftsSnapshot, previewFromChatPersist } from '../src/client/drafts.ts'

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

  it('treats non-empty image ids as an Unsent Draft when composer text is empty', () => {
    expect(previewFromChatPersist({ draft: '', imageIds: ['img-1', 'img-2'] })).toBe('📎 2')
  })

  it('treats a non-empty images list as an Unsent Draft', () => {
    expect(previewFromChatPersist({ images: [{ id: 'a' }] })).toBe('📎 1')
  })

  it('treats a non-empty attachments list as an Unsent Draft', () => {
    expect(previewFromChatPersist({ attachments: [{ id: 'a' }] })).toBe('📎 1')
  })

  it('returns empty when draft and attachments are empty', () => {
    expect(previewFromChatPersist({ draft: '', imageIds: [] })).toBe('')
    expect(previewFromChatPersist(null)).toBe('')
  })
})

describe('draftsSnapshot', () => {
  it('returns the same object when Unsent Drafts have not changed', () => {
    withLocalStorage({}, () => {
      const first = draftsSnapshot(['s1', 's2'])
      const second = draftsSnapshot(['s1', 's2'])
      expect(first).toBe(second)
    })
  })
})
