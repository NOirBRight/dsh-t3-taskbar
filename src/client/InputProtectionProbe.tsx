import { useEffect } from 'react'
import type { InputZone } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { setRuntimeProtected } from './protection.ts'

/** Observe the mounted Session input machine without rendering or retaining other Sessions. */
export function InputProtectionProbe({ session, input }: InputZone) {
  const protectedNow = input.draft !== ''
    || input.attachmentIds.length > 0
    || input.phase !== 'plain'
    || input.queue.length > 0
    || session.pendingSubmissions.length > 0
  useEffect(() => {
    setRuntimeProtected(session.sessionId, protectedNow)
    return () => { if (!protectedNow) setRuntimeProtected(session.sessionId, false) }
  }, [session.sessionId, protectedNow])
  return null
}
