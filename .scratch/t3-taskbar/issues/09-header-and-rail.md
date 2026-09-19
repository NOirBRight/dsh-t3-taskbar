# 09: Header actions and Rail icon stack

**What to build:** The wide Taskbar header is one row: search, plugin, Workspace filter, add-workspace, new session. Filter appears only when there is more than one Workspace, is browser-local, and is not written to the Host ledger. Plugin opens the official plugins/settings entry and is hidden when that action is missing. Add-workspace stays gated on directoryFlow. New session uses official `startSession`. The Rail (56px vertical) stacks search, plugin, add-workspace, and new session — never filter, never Cards. Search, plugin, and add-workspace expand the sidebar first; Rail new session may start immediately.

**Blocked by:** None (can start immediately). Tickets 01–07 are resolved.

**Status:** resolved

**Parent:** `.scratch/t3-taskbar/spec.md`

- [x] Wide header shows search + plugin + filter + add-workspace + new session in one row
- [x] Filter is absent with zero or one Workspace, present with more than one, and does not change the Host ledger
- [x] Plugin icon opens the official plugins entry, or is omitted when that action is unavailable
- [x] Add-workspace is omitted when directoryFlow has no occupant
- [x] New-session icon starts a Session through official `startSession`
- [x] Rail stacks search, plugin, add-workspace, and new session vertically; no filter; no Cards
- [x] Rail search / plugin / add-workspace call expand first; Rail new session may start without expanding
- [x] `pnpm test` and `pnpm run build` pass; lab `link:` only (production profile untouched)
