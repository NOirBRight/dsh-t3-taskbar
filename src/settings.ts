import Schema from '@deepseek-ai/schemastery'

export { DEFAULT_TASKBAR_SETTINGS, type TaskbarSettings } from './settings-values.ts'

export const TASKBAR_SETTINGS_NAMESPACE = 't3-taskbar'

export const taskbarSettingsSchema = Schema.object({
  autoSettleAfterDays: Schema.union([Schema.const(null), Schema.number().min(1).max(90).step(1)]).default(null)
    .description('Days of inactivity before an Active Session is settled; null disables the rule.'),
  autoSettleOnMerge: Schema.boolean().default(false).description('Settle an Active Session after its trusted pull request is merged.'),
  autoSettleOnClose: Schema.boolean().default(false).description('Settle an Active Session after its trusted pull request is closed without merge.'),
})
