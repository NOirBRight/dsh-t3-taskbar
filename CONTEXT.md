# T3 Taskbar

The left-hand Session inbox this plugin puts in DSH's official sidebar, and the line it will not cross around Provider Usage.

## Language

**Taskbar**:
The left-hand inbox of Sessions this plugin shows in the official sidebar's workspaces seat. It is not the OS taskbar, not T3's right-panel tab strip, and not the status-grouped inbox in dsh-better-taskbar.
_Avoid_: Dock, status bar, right-panel tabbar, Thread list

**Provider Usage**:
Vendor quota tiles that already occupy the sidebar footer. This plugin leaves them in place and does not reimplement quota.
_Avoid_: Session token fold, usage-monitor, tok/s

**Session**:
The DSH list row — one agent task. T3's Thread is the analogue, not a second entity here.
_Avoid_: Thread, Conversation (the open transcript)

**Workspace**:
A DSH directory grouping that Sessions can belong to. T3's Project is the analogue. On a Card it is the first line, never a list heading.
_Avoid_: Project, Workspace group

**Shelf**:
One of Pinned, Active, Snoozed, or Settled. A Session sits in exactly one Shelf. The assignment is this plugin's overlay on the Host, not a Session field.
_Avoid_: Status group (pending / running / idle), T3 server lifecycle

**Live status**:
What the Card shows on the first line about the running Session: waiting for you, running, failed, done-unread. It does not move the Session to another Shelf.
_Avoid_: Shelf, 需要处理 (as a list heading)

**Unsent Draft**:
Composer text stored on a Session that has not been sent. On a blank Session it is T3's new-thread draft row; on a started Session it is the pen on the Card. It is not a Shelf.
_Avoid_: Draft shelf, blank Session (the DSH list flag)

**Card**:
A Pinned or Active row: Workspace name and live status on the first line, Session title on the second. Snoozed and Settled rows are slim.
_Avoid_: One-line Session row, Workspace section header

**Rail**:
The official 56px collapsed sidebar. This plugin does not draw Cards there. The occupant's rail chrome matches the official WorkspaceBrowser: search and add-workspace icons that expand the sidebar. The Taskbar is the wide column only.
_Avoid_: Mini Cards, handing the seat back to a second occupant (the slot is single)
