import { describe, expect, it } from 'vitest'
import { matchingIds } from '../src/client/search.ts'

describe('matchingIds', () => {
  it('matches a Card whose Session title contains the query', () => {
    expect(matchingIds([
      { sessionId: 's1', sessionTitle: 'Fix login', workspaceTitle: '' },
      { sessionId: 's2', sessionTitle: 'Rewrite cache', workspaceTitle: '' },
    ], 'login')).toEqual(['s1'])
  })

  it('matches a Card whose Workspace name contains the query', () => {
    expect(matchingIds([
      { sessionId: 's1', sessionTitle: 'Fix login', workspaceTitle: 'alpha' },
      { sessionId: 's2', sessionTitle: 'Rewrite cache', workspaceTitle: 'billing' },
    ], 'bill')).toEqual(['s2'])
  })

  it('matches a Card whose Unsent Draft preview contains the query', () => {
    expect(matchingIds([
      { sessionId: 's1', sessionTitle: 'Fix login', workspaceTitle: 'alpha' },
      { sessionId: 's2', sessionTitle: 'New session', workspaceTitle: 'alpha', draftPreview: 'please rewrite the billing cron' },
    ], 'cron')).toEqual(['s2'])
  })

  it('matches title, Workspace, and draft preview case-insensitively', () => {
    expect(matchingIds([
      { sessionId: 's1', sessionTitle: 'Fix Login', workspaceTitle: '' },
      { sessionId: 's2', sessionTitle: 'Other', workspaceTitle: 'Billing' },
      { sessionId: 's3', sessionTitle: 'Other', workspaceTitle: '', draftPreview: 'Rewrite CRON' },
    ], 'login')).toEqual(['s1'])
    expect(matchingIds([
      { sessionId: 's2', sessionTitle: 'Other', workspaceTitle: 'Billing' },
    ], 'BILL')).toEqual(['s2'])
    expect(matchingIds([
      { sessionId: 's3', sessionTitle: 'Other', workspaceTitle: '', draftPreview: 'Rewrite CRON' },
    ], 'cron')).toEqual(['s3'])
  })

  it('returns no ids when the query is empty or only whitespace', () => {
    const cards = [{ sessionId: 's1', sessionTitle: 'Fix login', workspaceTitle: '' }]
    expect(matchingIds(cards, '')).toEqual([])
    expect(matchingIds(cards, '   ')).toEqual([])
  })
})
