import type { AutoSettleSettings } from './auto-settle.ts'

export interface TaskbarSettings extends AutoSettleSettings {}

/** Existing installs remain inert until the user explicitly enables a rule. */
export const DEFAULT_TASKBAR_SETTINGS: TaskbarSettings = {
  autoSettleAfterDays: null,
  autoSettleOnMerge: false,
  autoSettleOnClose: false,
}
