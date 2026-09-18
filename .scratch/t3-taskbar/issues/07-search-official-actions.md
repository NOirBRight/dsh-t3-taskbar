# 07: Search and official row actions

**What to build:** The wide Taskbar header can search by Session title, Workspace name, and Unsent Draft preview, and also hits Host `session.search` after a short debounce. Search results are a flat list of Cards (Workspace still on line one), not Shelves. Started rows offer official Rename, Fork, and Archive. Add Workspace remains available when the official directory flow is installed (header when wide, Rail icon when collapsed). Unsent Draft rows do not get rename, fork, or archive — only Discard (from 05, or omitted until that ticket exists). Locale covers zh and en. Tokens stay official `--dsw-*` / `--ds-*`.

**Blocked by:** 01 Active Cards occupy the workspaces seat

**Status:** resolved

**Parent:** `.scratch/t3-taskbar/spec.md`

- [x] Local filter matches title, Workspace name, and Unsent Draft preview as those fields exist
- [ ] Debounced Host search can surface Sessions not in the current snapshot
- [x] A non-empty query replaces Shelves with a flat result list; Cards still show Workspace on line one
- [x] Rename and Fork work on started Sessions; Archive hides them via the official hide
- [x] Add Workspace appears only when directoryFlow has an occupant, wide and Rail
- [x] Unsent Draft rows, when present, do not offer rename, fork, or archive
- [x] zh and en strings exist; no private colour palette

## Comments

Merged as `ticket-07-search-official-actions`. Host-search adapter is wired; live debounce still needs 3082. Unsent Draft rows only get Discard.
