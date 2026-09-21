import { useEffect, useState } from 'react'
import { AUTO_SETTLE_PREVIEW, SETTINGS_GET, SETTINGS_UPDATE } from '../contract.ts'
import { isRecord } from '../ledger-json.ts'
import { DEFAULT_TASKBAR_SETTINGS, type TaskbarSettings } from '../settings-values.ts'
import type { TaskbarKey } from './locales.ts'
import { callTaskbarRpc } from './rpc.ts'

type T = (key: TaskbarKey, params?: Record<string, string | number>) => string

function parseSettings(value: unknown): TaskbarSettings | undefined {
  if (!isRecord(value)) return undefined
  const days = value.autoSettleAfterDays
  if (days !== null && (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 90)) return undefined
  if (typeof value.autoSettleOnMerge !== 'boolean' || typeof value.autoSettleOnClose !== 'boolean') return undefined
  return { autoSettleAfterDays: days, autoSettleOnMerge: value.autoSettleOnMerge, autoSettleOnClose: value.autoSettleOnClose }
}

export function AutoSettleSettings({ t }: { t: T }) {
  const [settings, setSettings] = useState<TaskbarSettings>(DEFAULT_TASKBAR_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<string>()

  useEffect(() => {
    void callTaskbarRpc(SETTINGS_GET, {}).then(value => {
      const parsed = parseSettings(value)
      if (parsed !== undefined) setSettings(parsed)
    }).catch(() => {})
  }, [])

  const update = async (patch: Partial<TaskbarSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    setSaving(true)
    try {
      const value = await callTaskbarRpc(SETTINGS_UPDATE, patch)
      const parsed = parseSettings(value)
      if (parsed !== undefined) setSettings(parsed)
      else setSettings(settings)
    } catch {
      setSettings(settings)
    } finally {
      setSaving(false)
    }
  }

  const runPreview = async () => {
    const value = await callTaskbarRpc(AUTO_SETTLE_PREVIEW, {})
    if (!isRecord(value) || typeof value.eligible !== 'number' || !Array.isArray(value.rows)) return
    const blocked = value.rows.length - value.eligible
    setPreview(t('autosettle.preview.result', { eligible: value.eligible, blocked }))
  }

  return <section className="dsht3-settings" aria-label={t('autosettle.title')}>
    <h2>{t('autosettle.title')}</h2>
    <p>{t('autosettle.description')}</p>
    <label>
      <input type="checkbox" checked={settings.autoSettleAfterDays !== null} disabled={saving}
        onChange={event => { void update({ autoSettleAfterDays: event.currentTarget.checked ? 3 : null }) }} />
      <span>{t('autosettle.inactive')}</span>
    </label>
    {settings.autoSettleAfterDays !== null ? <label className="dsht3-settings-days">
      <span>{t('autosettle.days')}</span>
      <input type="number" min={1} max={90} step={1} value={settings.autoSettleAfterDays} disabled={saving}
        onChange={event => { const value = event.currentTarget.valueAsNumber; if (Number.isInteger(value) && value >= 1 && value <= 90) void update({ autoSettleAfterDays: value }) }} />
    </label> : null}
    <label>
      <input type="checkbox" checked={settings.autoSettleOnMerge} disabled={saving}
        onChange={event => { void update({ autoSettleOnMerge: event.currentTarget.checked }) }} />
      <span>{t('autosettle.merge')}</span>
    </label>
    <label>
      <input type="checkbox" checked={settings.autoSettleOnClose} disabled={saving}
        onChange={event => { void update({ autoSettleOnClose: event.currentTarget.checked }) }} />
      <span>{t('autosettle.close')}</span>
    </label>
    <button type="button" disabled={saving} onClick={() => { void runPreview().catch(() => {}) }}>{t('autosettle.preview')}</button>
    {preview === undefined ? null : <output aria-live="polite">{preview}</output>}
  </section>
}
