# T3 Taskbar

**Status:** ready-for-agent

A DSH plugin that replaces the official left-hand Session list with a T3-style Taskbar: Unsent Draft rows, four Shelves, Cards with Live status, Host-backed overlay, official sidebar footer (including Provider Usage) left intact.

## Problem Statement

DSH's official sidebar lists Sessions under Workspace headings. That is a directory browser, not an inbox of work. T3 Code's left list is the inbox I want: new unsent work at the top, then Pinned / Active / Snoozed / Settled, each row a Card that shows which Workspace it belongs to without grouping the list by Workspace. Official DSH Session fields cannot express pin, snooze, or settle. I still need the Provider Usage quota tiles in the sidebar footer; replacing the whole sidebar column would destroy them.

## Solution

A new plugin occupies only the official sidebar's workspaces seat. In the wide column it draws the Taskbar. In the Rail it draws the official-style search and add-workspace icons and expands the sidebar; it never draws Cards at 56px.

Sessions sit on one of four Shelves. The assignment and the order inside Pinned and Active live in a plugin ledger on this Host, so every browser talking to that Host sees the same Shelves. Unsent Draft stays on DSH's existing per-Session composer persist (browser-local, as in T3). Waiting for approval is Live status on the Card, not a Shelf. Settle and Archive both exist: Settle is reversible on our ledger; Archive is the official hide. Provider Usage is not this plugin's job.

## User Stories

1. As a DSH user, I want the left list to read as an inbox of Sessions rather than a Workspace tree, so that I can see what I am working on without hunting under directory names.
2. As a DSH user, I want Workspace to appear as the first line of each Card, so that I still know which project a Session belongs to.
3. As a DSH user, I want Provider Usage to remain in the sidebar footer, so that quota is still visible while the list above it changes.
4. As a DSH user, I want Settings to remain under the footer, so that the official chrome around the list does not disappear.
5. As a DSH user, I want the official New Session control above the list to keep working, so that starting work does not depend on this plugin inventing a second button.
6. As a DSH user, I want blank Sessions I have typed into but not sent to appear as Unsent Draft rows above the Shelves, so that invested new work is not hidden the way the official list hides unused blanks.
7. As a DSH user, I want an Unsent Draft row to show the Workspace name and a preview of the typed prompt (or an attachment count if there is no text), so that I can recognise the draft.
8. As a DSH user, I want to discard an Unsent Draft row, so that a false start leaves the inbox.
9. As a DSH user, I want discarding an Unsent Draft to clear the composer persist without deleting the reusable blank Session, so that New Session in that Workspace still works.
10. As a DSH user, I want a blank Session with an empty composer to stay hidden when it is not current, so that the inbox is not full of unused blanks.
11. As a DSH user, I want the current blank Session to remain reachable even without Unsent Draft text, so that the composer I am looking at has a matching row.
12. As a DSH user, I want a started Session with Unsent Draft text to stay on its Shelf and show a pen on the Card, so that unsent follow-up is visible without becoming a second kind of heading.
13. As a DSH user, I want switching back to a Session to restore its composer text the way DSH already does, so that the Taskbar does not own a second draft store.
14. As a DSH user, I want Unsent Draft detection to survive a reload in this browser, so that the pen and the top rows match what the composer will restore.
15. As a DSH user, I accept that Unsent Draft does not follow me to another browser, so that we do not pretend DSH composer persist is Host-wide.
16. As a DSH user, I want every visible started Session to sit in exactly one Shelf — Pinned, Active, Snoozed, or Settled — so that the list has a single place for each row.
17. As a DSH user, I want a new started Session that I have never pinned, snoozed, or settled to appear on Active, so that the default inbox is the live work.
18. As a DSH user, I want to Pin a Session from its menu, so that it stays above Active.
19. As a DSH user, I want to Unpin a Session from its menu or from the pin control on the Card, so that it returns to Active.
20. As a DSH user, I want Pinning a Snoozed Session to wake it into Pinned, so that snooze does not leave a pin stuck underneath.
21. As a DSH user, I want to Settle a Session from its menu or from the Settle control on a Card, so that finished work leaves Active without being Archived.
22. As a DSH user, I want to Un-settle a Session from a Settled row, so that I can resume it on Active.
23. As a DSH user, I want Settling not to Archive the Session, so that I can still find it on the Settled Shelf.
24. As a DSH user, I want to Archive a Session from its menu, so that it disappears from the Taskbar using the official hide.
25. As a DSH user, I want Archive to remain effectively one-way, so that I do not expect an Unarchive this plugin cannot give.
26. As a DSH user, I want to Snooze a Session until a preset duration or a custom local time, so that it leaves Active until that moment.
27. As a DSH user, I want Snooze to be unavailable while the Session is waiting for me (approval, question, or plan review), so that I cannot hide a row that needs a decision.
28. As a DSH user, I want a Snoozed row to show when it will wake, so that the Shelf answers "what comes back next".
29. As a DSH user, I want Snoozed rows ordered by soonest wake first, so that the next return is at the top of that Shelf.
30. As a DSH user, I want a Snoozed Session to appear back on Active (or Pinned, if it was pinned when I snoozed and pinning is restored on wake — pin is lost while snoozed; wake goes to Active unless I pin again) so that time passing is enough to restore it without a click. Wake target: Active. Pin does not survive snooze.
31. As a DSH user, I want to Wake a Snoozed Session from its menu, so that I can bring it back early onto Active.
32. As a DSH user, I want Snooze to outrank Pin and Settle until wake, so that a snoozed row is only on Snoozed.
33. As a DSH user, I want to drag a Session onto Pinned, Active, or Settled, so that the drop performs Pin, Unpin, Settle, Un-settle, or Wake.
34. As a DSH user, I want dragging onto Snoozed to be refused, so that snooze always goes through a wake time.
35. As a DSH user, I want a drag over a Shelf to show the verb the drop will perform (Pin, Unpin, Settle, Un-settle, Wake), so that I am not surprised on release.
36. As a DSH user, I want to reorder within Pinned and within Active by dragging, so that my arrangement sticks on this Host.
37. As a DSH user, I want a drop onto an empty Pinned Shelf (or the top edge when nothing is pinned) to Pin at the top, so that first pins are possible.
38. As a DSH user, I want Un-settle and Wake drops to land at the top of Active unless I drop onto a specific index, so that resumed work is in my face.
39. As a DSH user, I want Shelf changes from the menu and from drag to write the same Host ledger, so that the two gestures cannot disagree.
40. As a DSH user, I want another browser on the same Host to see Pin, Snooze, Settle, and Pinned/Active order after a reload, so that the inbox is not per-browser.
41. As a DSH user, I do not want lab (`~/.dsh-lab`) and production (`~/.dsh`) to share the ledger, so that experiments cannot pin production Sessions.
42. As a DSH user, I want dead Session ids dropped from the ledger when they are gone or Archived, so that the file does not grow forever.
43. As a DSH user, I want Pinned and Active rows to be Cards: Workspace name and Live status on line one, Session title on line two, so that density matches T3.
44. As a DSH user, I want Snoozed and Settled rows to be slim, so that parked work does not dominate the column.
45. As a DSH user, I want Live status on a Card to show waiting-for-me, running, or done-unread without moving the Session to another Shelf, so that "someone is waiting" is not a heading.
46. As a DSH user, I want waiting-for-me to win over running when both could apply, so that a Session that needs a click is labelled as such.
47. As a DSH user, I want the current Session's row to look selected, so that I can see where I am.
48. As a DSH user, I want clicking a row to open that Session, so that the list is navigation.
49. As a DSH user, I want clicking an Unsent Draft row to open that blank Session, so that I land on the composer with the persist restored.
50. As a DSH user, I want subagent Sessions hidden, so that the inbox is parent work only.
51. As a DSH user, I want Archived Sessions hidden, so that official Archive is honoured.
52. As a DSH user, I want empty Shelves not to take space at rest, so that a first-time list is just Active (and any Unsent Draft rows).
53. As a DSH user, I want Settled and Snoozed to be collapsible once they have rows, so that I can park them out of the way. Settled starts collapsed when it has any rows.
54. As a DSH user, I want to search the Taskbar by Session title, Workspace name, and Unsent Draft preview, so that a long inbox is still findable.
55. As a DSH user, I want search to query Host `session.search` after a short debounce as well as filtering visible rows, so that titles not yet in the local snapshot can appear.
56. As a DSH user, I want search results to be a flat list of matching Sessions (still Cards, still with Workspace on line one), so that Shelves do not fight the query.
57. As a DSH user, I want to add a Workspace from the Taskbar header when the official directory flow is installed, so that I do not lose that official action.
58. As a DSH user, I want to rename a Session or Workspace from the row menu, so that official rename still exists.
59. As a DSH user, I want to Fork a started Session from the row menu, so that official fork still exists.
60. As a DSH user, I want a blank Unsent Draft row to omit rename, fork, and archive, so that we match official "no menu until the first prompt" for unused blanks — discard is the draft action.
61. As a DSH user, I want the Rail (56px) to show search and add-workspace icons, not Cards, so that the collapsed column matches official rail chrome.
62. As a DSH user, I want tapping a Rail icon to expand the sidebar, so that I can get back to the Taskbar.
63. As a DSH user, I want Rail add-workspace to raise the directory flow after expand (or to expand and then open the flow), so that adding a Workspace is still possible from the collapsed column.
64. As a DSH user, I want the Taskbar to follow official light/dark tokens (`--dsw-*` / `--ds-*`), so that it does not clash with Provider Usage or Settings.
65. As a DSH user, I want Unsent Draft chrome to use the official warn token rather than a private amber palette, so that the pen is visible without a second theme.
66. As a DSH user, I want locale strings in zh and en, so that the plugin matches the rest of the DSH client.
67. As a DSH user, I want verification only on lab (3082 / `DSH_HOME=~/.dsh-lab`), so that production 3080 is never the experiment.
68. As a plugin maintainer, I want this plugin not to register `root` or `sidebar`, so that inner seats including `sidebar.footer.action` keep rendering.
69. As a plugin maintainer, I want this plugin not to reimplement quota, so that `dsh-llm-providers-ui` remains the owner of Provider Usage.
70. As a plugin maintainer, I want this plugin not to edit `dsh-better-taskbar`, so that the status-grouped inbox remains a separate product.
71. As a DSH user, I want no automatic Settle, so that a Session never leaves Active unless I Settle it or Archive it.
72. As a DSH user, I want no T3 branch, PR, diff, or provider badge on the Card's third line, so that we do not fake data DSH does not put on SessionSummary.
73. As a DSH user, I want failed Live status omitted until SessionSummary actually carries an error, so that we do not invent a failed Shelf or a lying badge.

## Implementation Decisions

- One deep module, Taskbar. Callers use two verbs: `project` (sessions, workspaces, ledger, drafts, query, now → ViewModel) and `apply` (ledger, command → ledger). React, RPC, and localStorage are adapters.
- `project` assigns each visible Session to exactly one Shelf. Snooze (effective: `snoozedUntil > now`) outranks Settle and Pin. Settle outranks Pin. Everything else is Active. Subagent origin and Archived ids are omitted before assignment. Unsent Draft rows are not a Shelf: blank + non-empty draft (or the current blank) render in a block above the Shelves.
- `apply` commands: Pin, Unpin, Settle, Unsettle, Snooze `{ until }`, Wake, Drop `{ dest: pinned | active | settled, index }`, Gc `{ livingIds }`. Drop onto snoozed is not a command; the adapter must not emit it. Snooze while `pendingInteraction` is set is rejected. Pin while snoozed is Wake then Pin. Gc removes ledger entries whose Session id is missing or Archived.
- Ledger records, per Session id: optional pin order key, optional active order key, optional settledAt, optional snoozedUntil. Absence means Active with recency order. Within Pinned, ordered keys first then keyless by created/updated. Within Active, same. Settled ordered by settledAt descending. Snoozed ordered by snoozedUntil ascending.
- Host adapter: one JSON file under `$DSH_HOME` owned by this plugin, read/write via plugin RPC, optimistic concurrency with a revision. Not `settings.yaml`, not `localStorage`. Browsers on the same Host share it. Lab and production Homes are different files (ADR 0001).
- Unsent Draft adapter: read DSH conversation chat persist `dsh.conversation.chat.<sessionId>` for a non-empty `draft` string (and treat non-empty image ids as invested if the persist shape exposes them). Do not write that store except Discard, which clears `draft` through the same persist key. Do not copy Unsent Draft onto the Host ledger.
- Session and Workspace snapshots come from the official client runtime hooks already injected into the workspaces occupant (`useSessions`, `useWorkspaces`) plus the official occupant actions (open, startSession, rename, fork, archive, createWorkspace, search, directoryFlow).
- Client mounts by `slots.inject('sidebar.workspaces', …)` with priority such that this occupant wins over official WorkspaceBrowser. It does not register `root` or `sidebar`. `wide === false` renders Rail icons only (`expandSidebar`, search, add-workspace if directoryFlow is occupied). `wide === true` renders the Taskbar ViewModel.
- Drag-and-drop is an adapter: pointer geometry becomes a Drop command or a no-op. Tests of Taskbar do not drag in the DOM; they `apply` Drop. The occupant may use the same dnd approach as T3 (sortable list plus section markers) but that is not the seam.
- Live status is projected from `pendingInteraction`, `running`, and client `completed`. No failed badge. No third Card line.
- Visual: official `--dsw-*` / `--ds-*` tokens only. Card height and slim rows follow T3 structure, not T3's private sidebar colour names.
- Plugin shape matches sibling DSH plugins: Host entry + client entry, `pnpm test` then `pnpm run build` (`tsc && tsdown`). Lab profile `link:` to this checkout; production profile stays on published specifiers.
- Locale namespace owned by this plugin, zh and en.

## Testing Decisions

- Tests assert observable results of `project` and `apply` only: which ids appear in which Shelf, Unsent Draft block membership, Live status on a row, order, command rejection, Gc, snooze expiry at `now`, exclusivity. They do not open React, RPC, or localStorage.
- Do not assert file paths, CSS class names, token names, or RPC method strings in the Taskbar tests.
- Adapter wiring (Host file, persist key, slot inject) is covered by a small number of contract tests if cheap; otherwise lab verification on 3082. Do not skip Taskbar tests in favour of only clicking the GUI.
- Prior art: `dsh-better-taskbar`'s TaskbarCore tests (`src/core/taskbar.test.ts`) — same seam height, different axis (status groups there, Shelves here). Do not import that module; this is a different product.

## Out of Scope

- Occupying `root` or `sidebar`; replacing or restyling Provider Usage; editing `dsh-llm-providers-ui` or `dsh-better-taskbar`.
- Official Session fields for pin / snooze / settle; DSH core changes; Host settings.yaml as the ledger.
- Automatic Settle (inactivity, PR merge).
- Dragging onto Snoozed.
- T3 right-panel tabbar, composer footer, branch / PR / diff / provider badges, worktree / environment switcher.
- Multi-draft rows that are not DSH Sessions (T3 `/draft/$draftId` pre-thread identities).
- Unarchive, delete Session, Session-level error Live status.
- OS taskbar / tray.
- Production 3080 / `~/.dsh` as the verification surface.
- v1 beyond this inbox: no second grouping toggle, no mobile-only arrange-threads sheet distinct from the same drag/menu.

## Further Notes

- Glossary: `CONTEXT.md`. Overlay decision: `docs/adr/0001-host-shelf-overlay.md`.
- T3 Active is the residual set, not "agent running". Running is Live status.
- Official `completed` is local done-unread, not Settled.
- Wake-from-snooze lands on Active. Pin does not persist across snooze (snooze outranks; the pin keys may be kept in the ledger but `project` ignores them until wake, and wake clears snooze and — to keep the story simple — does not auto-restore Pinned; user story 30 locks wake → Active). If Pin keys remain, Unpin-on-snooze should clear them so wake cannot surprise-pin. **Decision: Snooze clears pin keys; wake is always Active.**
- Discard vs Archive: Discard only applies to Unsent Draft (blank + persist). Archive applies to started Sessions.
- Next step after this spec: `/to-tickets` into `.scratch/t3-taskbar/issues/`.
