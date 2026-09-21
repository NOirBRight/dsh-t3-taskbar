# T3 Taskbar

The left-hand Session inbox this plugin puts in DSH's official sidebar, and the line it will not cross around Provider Usage.

## Language

**Taskbar**:
The left-hand inbox of Sessions this plugin shows in the official sidebar's workspaces seat. It is not the OS taskbar, not T3's right-panel tab strip, and not the status-grouped inbox in dsh-better-taskbar.
_Avoid_: Dock, status bar, right-panel tabbar, Thread list

**Provider Usage**:
Vendor quota tiles that already occupy the sidebar footer. On the desktop Taskbar this plugin leaves them in place and does not reimplement quota. On the APK Taskbar they are hidden so the Session list matches T3 chrome.
_Avoid_: Session token fold, usage-monitor, tok/s

**Session**:
The DSH list row — one agent task. T3's Thread is the analogue, not a second entity here.
_Avoid_: Thread, Conversation (the open transcript)

**Workspace**:
A DSH directory grouping that Sessions can belong to. T3's Project is the analogue. On a Card it is named on the first line, never a list heading. The APK choose-Workspace page keeps T3's English chrome ("Choose project"); the entity is still Workspace.
_Avoid_: Project, Workspace group, Repo, 目录

**Workspace Identity**:
The Card's leading mark derived from the Workspace name (two-letter monogram and hashed color). Settings may replace it later; the derivation is the default.
_Avoid_: Favicon, project icon, Repo icon

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
A Pinned or Active row: Workspace Identity, Workspace name, and Live status or relative time on line one; Session title on line two; optional git / PR / Runtime marks on line three. Snoozed rows are slim. Settled rows are slim: Identity, title, PR, and date.
_Avoid_: One-line Session row, Workspace section header, Repo

**Runtime**:
Which agent backend is driving the Session: DSH Runtime, AGY, or Cursor. The Card draws this mark only when an AGY or Cursor ACP plugin is installed, and then on every row (native Sessions show DSH Runtime). Codex and Grok are DSH Runtime. Unknown backend collapses the mark. It is not the DSH product chrome, not Provider Usage, and not a settings Role badge.
_Avoid_: Provider (the settings card), Role, Product Worker, using bare “DSH” for this mark

**DSH Runtime**:
The official harness running the Session. On the Card it is one of three Runtimes, shown so AGY and Cursor rows are not mistaken for the product itself.
_Avoid_: DSH (the product), Provider Usage

**AGY**:
Antigravity ACP as a Runtime. The Card uses this short name.
_Avoid_: Antigravity (on the Card), Google, Gemini

**Rail**:
The official 56px collapsed sidebar. This plugin does not draw Cards there. Icons stack vertically: search, plugin, add-workspace, and new session — the wide header minus Workspace filter. Search, plugin, and add-workspace expand the sidebar first; new session may start immediately. The APK overlay drawer uses the wide Taskbar, not a second occupant.
_Avoid_: Mini Cards, handing the seat back to a second occupant (the slot is single), Workspace filter on the Rail
