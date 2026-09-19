import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
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

function parseFile(raw: string): LedgerSnapshot {
  return parseLedger(JSON.parse(raw)) ?? EMPTY_LEDGER
}

export function readLedgerFile(): LedgerSnapshot {
  try {
    return parseFile(readFileSync(filePath(), 'utf8'))
  } catch {
    return EMPTY_LEDGER
  }
}

export function writeLedgerFile(file: LedgerSnapshot): void {
  const path = filePath()
  mkdirSync(dirname(path), { recursive: true })
  const pending = `${path}.tmp`
  writeFileSync(pending, `${JSON.stringify(file, null, 2)}\n`)
  renameSync(pending, path)
}
