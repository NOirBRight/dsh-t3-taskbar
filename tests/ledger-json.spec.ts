import { describe, expect, it } from 'vitest'
import { parseLedger } from '../src/ledger-json.ts'

describe('ledger schema migration', () => {
  it('upgrades the legacy unversioned shape in memory', () => {
    expect(parseLedger({ revision: 3, records: { s1: { pin: 0 } } })).toEqual({
      schemaVersion: 3,
      revision: 3,
      records: { s1: { pin: 0 } },
    })
  })

  it('infers manual provenance for legacy settled records', () => {
    expect(parseLedger({ revision: 1, records: { s1: { settledAt: 5 } } })?.records.s1).toEqual({ settledAt: 5, settledBy: 'manual' })
    expect(parseLedger({ schemaVersion: 2, revision: 1, records: { s1: { settledAt: 5 } } })?.records.s1).toEqual({ settledAt: 5, settledBy: 'manual' })
  })

  it('rejects unknown versions, invalid revisions, and corrupt entries', () => {
    expect(parseLedger({ schemaVersion: 4, revision: 0, records: {} })).toBeUndefined()
    expect(parseLedger({ schemaVersion: 3, revision: -1, records: {} })).toBeUndefined()
    expect(parseLedger({ schemaVersion: 3, revision: 0, records: { s1: { settledAt: 'bad' } } })).toBeUndefined()
    expect(parseLedger({ schemaVersion: 3, revision: 0, records: { s1: { settledAt: 1 } } })).toBeUndefined()
    expect(parseLedger({ schemaVersion: 3, revision: 0, records: { s1: { active: 0, settledAt: 1 } } })).toBeUndefined()
    expect(parseLedger({ schemaVersion: 3, revision: 0, records: { s1: { settledBy: 'manual' } } })).toBeUndefined()
    expect(parseLedger({ schemaVersion: 3, revision: 0, records: { s1: { settledAt: 1, settledBy: 'auto-pr-merged' } } })).toBeUndefined()
    expect(parseLedger({ schemaVersion: 3, revision: 0, records: { s1: { settledAt: 1, settledBy: 'manual', settledPr: 7 } } })).toBeUndefined()
  })
})
