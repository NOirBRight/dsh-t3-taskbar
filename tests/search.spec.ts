import { describe, expect, it } from 'vitest'
import { matchingIds, type SearchCard } from '../src/client/search.ts'

const card = (partial: Pick<SearchCard, 'sessionId' | 'sessionTitle'> & Partial<SearchCard>): SearchCard => ({
  workspaceTitle: '',
  ...partial,
})

describe('matchingIds', () => {
  it('matches a Card whose session title contains the query', () => {
    expect(matchingIds([
      card({ sessionId: 's1', sessionTitle: 'Fix login' }),
      card({ sessionId: 's2', sessionTitle: 'Rewrite cache' }),
    ], 'login')).toEqual(['s1'])
  })

  it('matches a Card whose Workspace name contains the query', () => {
    expect(matchingIds([
      card({ sessionId: 's1', sessionTitle: 'Fix login', workspaceTitle: 'alpha' }),
      card({ sessionId: 's2', sessionTitle: 'Rewrite cache', workspaceTitle: 'billing' }),
    ], 'bill')).toEqual(['s2'])
  })

  it('matches a Card whose Unsent Draft preview contains the query', () => {
    expect(matchingIds([
      card({ sessionId: 's1', sessionTitle: 'Fix login', workspaceTitle: 'alpha' }),
      card({ sessionId: 's2', sessionTitle: 'New session', workspaceTitle: 'alpha', draftPreview: 'please rewrite the billing cron' }),
    ], 'cron')).toEqual(['s2'])
  })

  it('matches title, Workspace, and draft preview case-insensitively', () => {
    expect(matchingIds([
      card({ sessionId: 's1', sessionTitle: 'Fix Login' }),
      card({ sessionId: 's2', sessionTitle: 'Other', workspaceTitle: 'Billing' }),
      card({ sessionId: 's3', sessionTitle: 'Other', draftPreview: 'Rewrite CRON' }),
    ], 'login')).toEqual(['s1'])
    expect(matchingIds([
      card({ sessionId: 's2', sessionTitle: 'Other', workspaceTitle: 'Billing' }),
    ], 'BILL')).toEqual(['s2'])
    expect(matchingIds([
      card({ sessionId: 's3', sessionTitle: 'Other', draftPreview: 'Rewrite CRON' }),
    ], 'cron')).toEqual(['s3'])
  })

  it('returns no ids when the query is empty or only whitespace', () => {
    const cards = [card({ sessionId: 's1', sessionTitle: 'Fix login' })]
    expect(matchingIds(cards, '')).toEqual([])
    expect(matchingIds(cards, '   ')).toEqual([])
  })
})
