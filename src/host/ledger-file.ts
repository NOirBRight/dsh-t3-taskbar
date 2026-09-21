import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { EMPTY_LEDGER, parseLedger, type LedgerSnapshot } from '../ledger-json.ts'

function home(): string {
  const env = process.env.DSH_HOME
  return env !== undefined && env.trim() !== '' ? env : join(homedir(), '.dsh')
}

function filePath(): string {
  return join(home(), 't3-taskbar', 'ledger.json')
}

export function readLedgerFile(): LedgerSnapshot {
  try {
    const path = filePath()
    const raw = readFileSync(path, 'utf8')
    const value: unknown = JSON.parse(raw)
    const parsed = parseLedger(value)
    if (parsed === undefined) throw new Error('invalid t3-taskbar ledger')
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && (value as { schemaVersion?: unknown }).schemaVersion !== 3) {
      const backup = `${path}.${(value as { schemaVersion?: unknown }).schemaVersion === 2 ? 'v2' : 'v1'}.bak`
      if (!existsSync(backup)) copyFileSync(path, backup)
      writeLedgerFile(parsed)
    }
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return EMPTY_LEDGER
    throw error
  }
}

export function writeLedgerFile(file: LedgerSnapshot): void {
  const path = filePath()
  mkdirSync(dirname(path), { recursive: true })
  const pending = `${path}.tmp`
  writeFileSync(pending, `${JSON.stringify(file, null, 2)}\n`)
  renameSync(pending, path)
}
