/** Official settings-shell trigger. There is no public open API (ADR 0005). */

export function officialSettingsTrigger(): HTMLElement | undefined {
  const content = document.querySelector('[data-slot="settings.trigger"]')
  const trigger = content?.closest('button[aria-haspopup="dialog"]')
  return trigger instanceof HTMLElement ? trigger : undefined
}

export function openOfficialSettings(): boolean {
  const trigger = officialSettingsTrigger()
  if (trigger === undefined) return false
  trigger.click()
  return true
}
