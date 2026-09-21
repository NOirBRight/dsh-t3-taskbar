import { describe, expect, it } from 'vitest'
import { LEDGER_APPLY } from '../src/contract.ts'
import { commandAtHostTime, handleTaskbarRpc } from '../src/host/rpc.ts'

describe('ledger RPC validation', () => {
  it('uses Host time for manual settlement and hold timestamps', () => {
    expect(commandAtHostTime({ type: 'Unsettle', sessionId: 's1', at: 999_999 }, 42)).toEqual({ type: 'Unsettle', sessionId: 's1', at: 42 })
    expect(commandAtHostTime({ type: 'Drop', sessionId: 's1', dest: 'active', index: 0, at: 999_999 }, 42)).toMatchObject({ at: 42 })
  })

  it.each([
    { revision: 0, command: { type: 'Pin', sessionId: 'x'.repeat(257) } },
    { revision: 0, command: { type: 'Settle', sessionId: 's1', at: Number.POSITIVE_INFINITY } },
    { revision: 0, command: { type: 'Drop', sessionId: 's1', dest: 'active', index: 0.5, at: 1 } },
    { revision: 0, command: { type: 'Drop', sessionId: 's1', dest: 'active', index: 0 } },
    { revision: Number.POSITIVE_INFINITY, command: { type: 'Pin', sessionId: 's1' } },
  ])('rejects values that cannot round-trip through the ledger', async payload => {
    expect((await handleTaskbarRpc(LEDGER_APPLY, payload)).ok).toBe(false)
  })
})
