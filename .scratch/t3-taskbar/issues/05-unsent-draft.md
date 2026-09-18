# 05: Unsent Draft rows and the pen

**What to build:** Blank Sessions the user has typed into (or attached to) appear above the Shelves as Unsent Draft rows: Workspace name plus prompt preview or attachment count, with Discard. Discard clears the composer persist and the row disappears; the reusable blank Session is not deleted. Started Sessions with Unsent Draft stay on their Shelf and show a pen on the Card. Draft text is not written to the Host ledger. Opening the row lands on that Session so DSH can restore the composer.

**Blocked by:** 01 Active Cards occupy the workspaces seat

**Status:** resolved

**Parent:** `.scratch/t3-taskbar/spec.md`

- [x] A non-current blank with non-empty composer persist appears in the Unsent Draft block, not on a Shelf
- [x] A blank with empty persist stays hidden unless it is current
- [ ] Discard removes the row and clears persist; New Session in that Workspace still works
- [x] A started Session with persist shows a pen and stays on its Shelf
- [ ] Clicking an Unsent Draft row opens that blank Session
- [x] Unsent Draft is absent from the Host ledger; another browser does not have to show the same pens
- [x] `project` tests cover blank+draft vs started+pen vs hidden unused blank without React

## Comments

Merged as `ticket-05-unsent-draft`. Persist adapter only reads non-empty `draft` strings (no attachment ids). Discard / open-composer still need 3082.
