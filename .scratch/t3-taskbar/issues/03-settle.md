# 03: Settle without Archive

**What to build:** A Session can be Settled from the menu or the Card control and Un-settled from a Settled row. Settled rows are slim, live on their own Shelf, and that Shelf starts collapsed when it has any rows. Empty Settled takes no space. Archive remains a separate menu action that hides the Session from the Taskbar with no Unarchive. Nothing auto-Settles.

**Blocked by:** 02 Pin on a Host ledger

**Status:** ready-for-agent

**Parent:** `.scratch/t3-taskbar/spec.md`

- [ ] Settle moves a Session off Active (or Pinned) onto Settled; Un-settle returns it to Active at the top
- [ ] Settled rows are slim, not Cards
- [ ] Settled with rows starts collapsed and can be expanded; empty Settled is not shown
- [ ] Archive still removes the Session from every Shelf and from Unsent Draft; it does not appear on Settled
- [ ] Settling does not Archive; Archived does not Un-settle
- [ ] No timer or inactivity rule Settles a Session
- [ ] `apply` Settle / Unsettle tests cover exclusivity versus Pin; `project` tests cover slim Settled membership
