# 02: Pin on a Host ledger

**What to build:** A Session can be Pinned and Unpinned from its menu (and Unpinned from the Card pin control). Pinned Cards sit on a Pinned Shelf above Active. The assignment and Pinned order live in this plugin's Host ledger, so another browser on the same lab Host still sees the pins after reload. Snooze already clears pin keys in the ledger even though Snooze UI is a later ticket; there is no Pinned restore-on-wake. Lab and production Homes do not share the file.

**Blocked by:** 01 Active Cards occupy the workspaces seat

**Status:** resolved

**Parent:** `.scratch/t3-taskbar/spec.md`

- [x] Pin moves a Session from Active to Pinned; Unpin returns it to Active
- [x] A Session is never on two Shelves at once
- [ ] Reloading 3082, or opening a second browser to the same lab Host, shows the same Pinned set
- [ ] Production `~/.dsh` is not written during lab verification
- [x] Ledger entries for Sessions that no longer exist or are Archived are dropped on Gc
- [x] `apply` Pin / Unpin / Gc tests cover exclusivity and pin-key clearing; no React
- [x] The ledger is a plugin file under `$DSH_HOME` served over RPC, not `settings.yaml` and not `localStorage` (ADR 0001)

## Comments

Merged as `ticket-02-pin-host-ledger`. Pin is a Card button; row-menu Pin waits for later tickets. Lab reload / second-browser and production-home isolation still need 3082.
