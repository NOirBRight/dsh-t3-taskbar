# 06: Drag to refile and reorder

**What to build:** Dragging a Session onto Pinned, Active, or Settled performs Pin, Unpin, Settle, Un-settle, or Wake, the same facts as the menus. While dragging, the row shows the verb the drop will perform. Dragging onto Snoozed does nothing. Dragging within Pinned or within Active writes order to the Host ledger. Dropping onto empty Pinned (or the top edge when nothing is pinned) Pins at the top. Un-settle and Wake land at the top of Active unless dropped on a specific index.

**Blocked by:** 03 Settle without Archive; 04 Snooze and Wake

**Status:** ready-for-agent

**Parent:** `.scratch/t3-taskbar/spec.md`

- [ ] Drop onto Pinned / Active / Settled changes Shelf the same way as the matching menu command
- [ ] Drop onto Snoozed is ignored; snooze still requires a wake time in the menu
- [ ] The dragged row shows Pin, Unpin, Settle, Un-settle, or Wake before release
- [ ] Reorder within Pinned and within Active survives reload on the same Host
- [ ] Empty Pinned (or top edge) accepts a Pin at the top
- [ ] Wake and Un-settle without a specific index land at the top of Active
- [ ] `apply` Drop tests cover dest, index, and refused snoozed dest without dragging in the DOM
