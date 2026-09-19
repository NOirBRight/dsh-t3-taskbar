export const HOUR_MS = 60 * 60 * 1000

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDatetimeLocal(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

export function laterToday18(now: number): number | undefined {
  const d = new Date(now)
  d.setHours(18, 0, 0, 0)
  const until = d.getTime()
  return until > now ? until : undefined
}

export function tomorrow09(now: number): number {
  const d = new Date(now)
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d.getTime()
}

export function formatWake(until: number): string {
  return new Date(until).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
