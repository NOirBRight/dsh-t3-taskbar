import { describe, expect, it } from 'vitest'
import { previewFromChatPersist } from '../src/client/drafts.ts'

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
