# 04: Snooze and Wake

**What to build:** A Session can be Snoozed until a preset duration or a custom local time, and Woken early from the menu. Snoozed rows are slim, ordered by soonest wake, and show when they return. While a Session is waiting for the user (approval, question, plan review), Snooze is not offered and `apply` rejects it. When `snoozedUntil` is past, the Session is on Active. Snooze outranks Pin and Settle; snooze clears pin keys; wake is always Active. Dragging onto Snoozed is not built here.

**Blocked by:** 02 Pin on a Host ledger

**Status:** ready-for-agent

**Parent:** `.scratch/t3-taskbar/spec.md`

- [ ] Snooze with a preset or custom time moves the Session onto Snoozed; Wake returns it to Active
- [ ] After the wake time, `project` at that `now` shows the Session on Active without a click
- [ ] Snooze is unavailable (hidden and rejected) when `pendingInteraction` is set
- [ ] A snoozed row is only on Snoozed, even if it had been Pinned or Settled
- [ ] Snooze clears pin keys; wake does not restore Pinned
- [ ] Snoozed rows are slim, sorted by soonest `snoozedUntil`, and show a wake label
- [ ] Empty Snoozed is hidden; with rows it is collapsible
- [ ] `apply` Snooze / Wake rejection and pin-clear tests, plus `project` expiry tests, do not use React
