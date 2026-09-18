export const NS = 't3-taskbar' as const

export const zh = {
  'shelf.active': '活跃',
  'live.waiting-for-me': '等待我',
  'live.running': '运行中',
  'live.done-unread': '完成未看',
  'search.aria': '搜索会话',
  'workspace.add': '添加工作区',
  'empty': '没有会话',
  'session.blank': '新会话',
}

export const en = {
  'shelf.active': 'Active',
  'live.waiting-for-me': 'Waiting for me',
  'live.running': 'Running',
  'live.done-unread': 'Done unread',
  'search.aria': 'Search sessions',
  'workspace.add': 'Add workspace',
  'empty': 'No sessions',
  'session.blank': 'New session',
}

export type TaskbarKey = keyof typeof zh
