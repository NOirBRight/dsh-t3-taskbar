# T3 Taskbar

**Status:** ready-for-agent

A DSH plugin that replaces the official left-hand Session list with a T3-style Taskbar: Unsent Draft rows, four Shelves, three-line Cards with Workspace Identity, Host-probed git/PR marks, optional Runtime marks, Host-backed overlay, official sidebar footer (including Provider Usage) left intact.

## Problem Statement

DSH's official sidebar lists Sessions under Workspace headings. That is a directory browser, not an inbox of work. T3 Code's left list is the inbox I want: search and actions in one header row, no "Active" heading, each Session a Card with Workspace Identity and name on line one, title on line two, and honest git / PR / Runtime marks on line three when they exist. Official DSH Session fields cannot express pin, snooze, settle, branch, or PR. I still need the Provider Usage quota tiles in the sidebar footer; replacing the whole sidebar column would destroy them. The same occupant must work in the official Rail, the wide column, and the APK overlay drawer.

## Solution

A new plugin occupies only the official sidebar's workspaces seat. Official Logo and Toggle stay in DSH chrome. In the wide column it draws a T3-like header (search, plugin, Workspace filter, add-workspace, new session) and the Taskbar list. In the Rail it stacks the same icons vertically minus Workspace filter, and never draws Cards at 56px. The APK overlay drawer uses the wide Taskbar, not a second occupant.

Sessions sit on one of four Shelves. The assignment and the order inside Pinned and Active live in a plugin ledger on this Host. Git / PR facts are probed on the Host from the Workspace path and passed into `project`. Runtime marks appear only when an AGY or Cursor ACP plugin is installed, mapped from model selection, never guessed. Unsent Draft stays on DSH's existing per-Session composer persist (browser-local). Waiting for approval is Live status on the Card, not a Shelf. Provider Usage is not this plugin's job.

## User Stories

1. As a DSH user, I want the left list to read as an inbox of Sessions rather than a Workspace tree, so that I can see what I am working on without hunting under directory names.
2. As a DSH user, I want Workspace Identity, Workspace name, and Live status or relative time on the first line of each Card, so that I still know which Workspace a Session belongs to and whether it needs me.
3. As a DSH user, I want Provider Usage to remain in the sidebar footer, so that quota is still visible while the list above it changes.
4. As a DSH user, I want Settings to remain under the footer, so that the official chrome around the list does not disappear.
5. As a DSH user, I want a new-session icon in the Taskbar header that starts a Session through the official `startSession` action, so that starting work lives in the same row as search.
6. As a DSH user, I want blank Sessions I have typed into but not sent to appear as Unsent Draft rows above the Shelves, so that invested new work is not hidden the way the official list hides unused blanks.
7. As a DSH user, I want an Unsent Draft row to use the same Card structure as Active (Identity, Workspace, preview or attachment count as the title line) without a "draft" heading, so that drafts are not a second kind of list.
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
18. As a DSH user, I want to Pin a Session from its menu or by dragging onto Pinned, so that it stays above Active.
19. As a DSH user, I want to Unpin a Session from its menu, so that it returns to Active. The pin glyph on a Card appears only when the Session is already Pinned, not as a hover verb on unpinned rows.
20. As a DSH user, I want Pinning a Snoozed Session to wake it into Pinned, so that snooze does not leave a pin stuck underneath.
21. As a DSH user, I want to Settle a Session from the Card hover (fine pointer), from the selected Card (coarse pointer), or from its menu, so that finished work leaves Active without being Archived.
22. As a DSH user, I want to Un-settle a Session from a Settled row the same way (hover, selected, or menu), so that I can resume it on Active.
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
43. As a DSH user, I want Pinned and Active rows to be Cards of three lines: Identity + Workspace + Live or time; Session title; optional git / PR / Runtime marks, so that density matches T3.
44. As a DSH user, I want Snoozed rows to stay slim (Identity, title, wake time). I want Settled rows to be slim as Identity, title, PR, and date, so that parked work does not dominate the column.
45. As a DSH user, I want Live status on a Card to show waiting-for-me, running, or done-unread without moving the Session to another Shelf, so that "someone is waiting" is not a heading.
46. As a DSH user, I want waiting-for-me to win over running when both could apply, so that a Session that needs a click is labelled as such.
47. As a DSH user, I want the current Session's row to look selected, so that I can see where I am.
48. As a DSH user, I want clicking a row to open that Session, so that the list is navigation.
49. As a DSH user, I want clicking an Unsent Draft row to open that blank Session, so that I land on the composer with the persist restored.
50. As a DSH user, I want subagent Sessions hidden, so that the inbox is parent work only.
51. As a DSH user, I want Archived Sessions hidden, so that official Archive is honoured.
52. As a DSH user, I want empty Shelves not to take space at rest, and I want Active to have no standing heading, so that a first-time list is just Cards (and any Unsent Draft rows) without an "Active" label.
53. As a DSH user, I want Settled and Snoozed to be collapsible once they have rows, so that I can park them out of the way. Settled starts collapsed when it has any rows. Those two Shelves keep standing headings when they have rows. The Pinned heading appears only while a drag is in progress.
54. As a DSH user, I want to search the Taskbar by Session title, Workspace name, and Unsent Draft preview, so that a long inbox is still findable.
55. As a DSH user, I want search to query Host `session.search` after a short debounce as well as filtering visible rows, so that titles not yet in the local snapshot can appear.
56. As a DSH user, I want search results to be a flat list of matching Sessions (still three-line Cards), so that Shelves do not fight the query.
57. As a DSH user, I want to add a Workspace from the Taskbar header when the official directory flow is installed, so that I do not lose that official action.
58. As a DSH user, I want to rename a Session or Workspace from the row menu, so that official rename still exists.
59. As a DSH user, I want to Fork a started Session from the row menu, so that official fork still exists.
60. As a DSH user, I want a blank Unsent Draft row to omit rename, fork, and archive, so that we match official "no menu until the first prompt" for unused blanks — discard is the draft action.
61. As a DSH user, I want the Rail (56px vertical) to show search, plugin, add-workspace, and new-session icons stacked, not Cards and not Workspace filter, so that the collapsed column keeps the same actions as the wide header minus filter.
62. As a DSH user, I want tapping Rail search, plugin, or add-workspace to expand the sidebar first, so that I can get back to the Taskbar or complete that action.
63. As a DSH user, I want Rail add-workspace to raise the directory flow after expand (or to expand and then open the flow), so that adding a Workspace is still possible from the collapsed column.
64. As a DSH user, I want the Taskbar to follow official light/dark tokens (`--dsw-*` / `--ds-*`), so that it does not clash with Provider Usage or Settings.
65. As a DSH user, I want Unsent Draft chrome to use the official warn token rather than a private amber palette, so that the pen is visible without a second theme.
66. As a DSH user, I want locale strings in zh and en, so that the plugin matches the rest of the DSH client.
67. As a DSH user, I want verification only on lab (3082 / `DSH_HOME=~/.dsh-lab`), so that production 3080 is never the experiment.
68. As a plugin maintainer, I want this plugin not to register `root` or `sidebar`, so that inner seats including `sidebar.footer.action` keep rendering.
69. As a plugin maintainer, I want this plugin not to reimplement quota, so that `dsh-llm-providers-ui` remains the owner of Provider Usage.
70. As a plugin maintainer, I want this plugin not to edit `dsh-better-taskbar`, so that the status-grouped inbox remains a separate product.
71. As a DSH user, I want no automatic Settle, so that a Session never leaves Active unless I Settle it or Archive it.
72. As a DSH user, I want branch, linked-worktree, PR, and Runtime marks on the Card's third line only when Host probes or model selection can honestly supply them, so that the Card matches T3 without inventing SessionSummary fields.
73. As a DSH user, I want failed Live status omitted until SessionSummary actually carries an error, so that we do not invent a failed Shelf or a lying badge.
74. As a DSH user, I want official Logo and Toggle to stay in DSH chrome, so that the Taskbar does not duplicate the shell.
75. As a DSH user, I want the wide header to be one row: search, plugin, Workspace filter, add-workspace, new session, so that actions sit where T3 puts them.
76. As a DSH user, I want Workspace filter only when more than one Workspace exists, and only in the wide header, so that a single-Workspace inbox is not cluttered and the Rail never shows filter.
77. As a DSH user, I want the plugin header icon to open the official plugins / settings entry, so that this plugin does not own a second plugin list.
78. As a DSH user, I want the plugin icon hidden when that official action is not available, so that a dead control does not sit in the header.
79. As a DSH user, I want add-workspace hidden when the official directory flow is not installed, so that the header matches what the occupant can actually raise.
80. As a DSH user, I want Rail new-session to start a Session immediately, so that I do not have to expand first just to begin work.
81. As a DSH user, I want Workspace Identity derived from the Workspace name (two-letter monogram and hashed color) when no override exists, so that Cards are scannable like T3 project marks.
82. As a DSH user, I want Identity derivation to be replaceable later without a settings UI in this spec, so that a second phase can attach custom marks without rewriting Cards.
83. As a DSH user, I want Live status and relative `updatedAt` time to be mutually exclusive on line one (waiting / running / done-unread win; otherwise time), so that the first line is not two statuses at once.
84. As a DSH user, I want overlong Workspace name, title, and marks truncated with ellipsis, so that a 280px drawer still reads as the same Card.
85. As a DSH user, I want Card height to follow T3's three-line Card (~4.875rem), not a 44px one-line row, so that touch targets and density match on desktop and in the APK drawer.
86. As a DSH user, I want git branch on line three when the Workspace path is a git repository, so that I can see which branch the Session's directory is on.
87. As a DSH user, I want a worktree mark only when `cwd` is a linked git worktree (not the repository's main checkout), so that ordinary Workspaces are not labelled as worktrees.
88. As a DSH user, I want a PR mark on line three (and on Settled slim rows) only when `gh` is already logged in for that repository and returns a PR, so that private repos do not fake a badge.
89. As a DSH user, I want each of branch, worktree, PR, and Runtime to collapse independently, and the whole third line to take no space when all are empty, so that non-git Workspaces do not show grey placeholders.
90. As a DSH user, I do not want this plugin to store a GitHub token, so that PR lookup never becomes a credentials store.
91. As a DSH user, I want Runtime marks only when an AGY or Cursor ACP plugin is installed, so that a stock DSH profile is not covered in DSH Runtime logos that distinguish nothing.
92. As a DSH user, I want native harness Sessions to show DSH Runtime (not a blank) once those ACP plugins are present, so that AGY and Cursor rows are distinguishable from the product itself.
93. As a DSH user, I want Codex and Grok Sessions to show DSH Runtime, so that model vendors are not a fourth Runtime.
94. As a DSH user, I want Runtime mapped from the Session's model-selection provider (`cursor-agent` → Cursor, Antigravity's catalog id → AGY, anything else → DSH Runtime) and omitted when that projection is missing, so that the mark is never guessed.
95. As a DSH user, I want the three Runtime marks to ship inside this plugin, so that Taskbar does not import or edit `dsh-llm-providers-ui`.
96. As a DSH user, I want Snooze to remain available from the row menu and, on fine pointer, as a hover companion to Settle, so that parking work still has a time.
97. As a DSH user, I want coarse-pointer (touch) Cards to reveal Settle / Unsettle and `···` on the selected row, so that APK and phone users can act without hover.
98. As a DSH user, I want the APK overlay drawer to show this same wide Taskbar, so that mobile is not a fork.
99. As a DSH user, I want official collapsed-sidebar width to keep using Rail icons, so that APK wide / desktop below 1024px still match official chrome.
100. As a plugin maintainer, I want this plugin not to edit `dsh-mobile` or occupy `root`, so that the mobile layout plugin remains the drawer owner.
101. As a DSH user, I want no mobile-only arrange-threads sheet, so that drag and the row menu stay the only arrange gestures on every surface.
102. As a DSH user, I want header Workspace filter to be browser-local and not written to the Host ledger, so that one person's filter does not hide Sessions for every client on the Host.

## Implementation Decisions

- One deep module, Taskbar. Callers use two verbs: `project` (sessions, workspaces, ledger, drafts, query, now, git marks, runtime marks, acpPresent → ViewModel) and `apply` (ledger, command → ledger). React, RPC, git, `gh`, and localStorage are adapters.
- `project` assigns each visible Session to exactly one Shelf. Snooze (effective: `snoozedUntil > now`) outranks Settle and Pin. Settle outranks Pin. Everything else is Active. Subagent origin and Archived ids are omitted before assignment. Unsent Draft rows are not a Shelf: blank + non-empty draft (or the current blank) render in a block above the Shelves with no heading.
- `apply` commands: Pin, Unpin, Settle, Unsettle, Snooze `{ until }`, Wake, Drop `{ dest: pinned | active | settled, index }`, Gc `{ livingIds }`. Drop onto snoozed is not a command; the adapter must not emit it. Snooze while `pendingInteraction` is set is rejected. Pin while snoozed is Wake then Pin. Gc removes ledger entries whose Session id is missing or Archived.
- Ledger records, per Session id: optional pin order key, optional active order key, optional settledAt, optional snoozedUntil. Absence means Active with recency order. Within Pinned, ordered keys first then keyless by created/updated. Within Active, same. Settled ordered by settledAt descending. Snoozed ordered by snoozedUntil ascending.
- Host ledger adapter: one JSON file under `$DSH_HOME` owned by this plugin, read/write via plugin RPC, optimistic concurrency with a revision. Not `settings.yaml`, not `localStorage`. Browsers on the same Host share it. Lab and production Homes are different files (ADR 0001).
- Host git adapter: probe Workspace `path` / Session `cwd` on the Host (`git` for branch and whether `cwd` is a linked worktree; `gh` for PR only when that repo is already logged in). Results are passed into `project` as input. The browser does not run git. No GitHub token is stored. Cache per path is an adapter concern (ADR 0003).
- Runtime adapter: if an AGY or Cursor ACP plugin is present, map `ModelSelection.provider` to `dsh` | `agy` | `cursor` (`cursor-agent` → Cursor; Antigravity catalog id → AGY; otherwise DSH Runtime, including Codex/Grok). If neither ACP plugin is present, or the projection is missing, `project` receives no runtime mark. Do not inject those plugins; do not edit `dsh-llm-providers-ui` (ADR 0004).
- Workspace Identity is a pure function of Workspace title (T3-style two-letter monogram + hashed color). `project` puts it on every Card. A later override map may replace it; this spec ships the derivation only.
- ViewModel Card shape (decision, not a file contract):

```
Card {
  sessionId, workspaceTitle, sessionTitle,
  identity: { monogram, color },
  liveStatus?, relativeTime?,
  marks?: { branch?, worktree?, pr?, runtime?: 'dsh' | 'agy' | 'cursor' },
  selected, unsentDraft?, slim?, wakeAt?, settledAt?
}
```

Line one shows `liveStatus` when set, otherwise `relativeTime`. Line three is omitted when `marks` is empty. Settled slim shows Identity, title, `marks.pr`, and date from `settledAt` (else latest activity already used for relative time).
- Unsent Draft adapter: read DSH conversation chat persist `dsh.conversation.chat.<sessionId>` for a non-empty `draft` string (and treat non-empty image ids as invested if the persist shape exposes them). Do not write that store except Discard, which clears `draft` through the same persist key. Do not copy Unsent Draft onto the Host ledger.
- Session and Workspace snapshots come from the official client runtime hooks already injected into the workspaces occupant (`useSessions`, `useWorkspaces`) plus the official occupant actions (open, startSession, rename, fork, archive, createWorkspace, search, directoryFlow). Model selection is read when the occupant can do so without a new DSH core API; otherwise runtime marks collapse.
- Client mounts by `slots.inject('sidebar.workspaces', …)` with priority such that this occupant wins over official WorkspaceBrowser. It does not register `root` or `sidebar`. `wide === false` renders the Rail icon stack. `wide === true` renders the header row and Taskbar ViewModel (APK drawer included).
- Header: search field; plugin icon (official plugins action, else hidden); Workspace filter (wide only, and only if more than one Workspace; browser-local, not ledger); add-workspace (directoryFlow occupant only); new session (`startSession`). Rail omits filter; search/plugin/add-workspace call `expandSidebar` first; new session may `startSession` immediately.
- Fine pointer: Settle (and Snooze) on Card hover; pin glyph only if already Pinned; Pin via drag or `···`. Coarse pointer: Settle / Unsettle and `···` on the selected row. Menu always has the verbs.
- Drag-and-drop is an adapter: pointer geometry becomes a Drop command or a no-op. Tests of Taskbar do not drag in the DOM; they `apply` Drop.
- Live status is projected from `pendingInteraction`, `running`, and client `completed`. No failed badge until SessionSummary carries an error.
- Visual: official `--dsw-*` / `--ds-*` tokens only. Three-line Card height follows T3 (~4.875rem). Runtime marks are local assets in this plugin. T3 `Sidebar.tsx` card variant and `SidebarThreadHeader` are the visual primary source; the throwaway inbox HTML is not.
- Plugin shape matches sibling DSH plugins: Host entry + client entry, `pnpm test` then `pnpm run build` (`tsc && tsdown`). Lab profile `link:` to this checkout; production profile stays on published specifiers.
- Locale namespace owned by this plugin, zh and en.

## Testing Decisions

- The seam stays `project` and `apply`. Git probes, `gh`, ACP detection, RPC, and React are adapters. Tests inject git/runtime marks and `acpPresent`; they do not exec git or load ACP plugins.
- Tests assert observable results of `project` and `apply` only: which ids appear in which Shelf, Unsent Draft block membership, Live vs relative time on a row, Identity derived from Workspace title, presence/absence of each mark, order, command rejection, Gc, snooze expiry at `now`, exclusivity. They do not open React, RPC, or localStorage.
- Do not assert file paths, CSS class names, token names, or RPC method strings in the Taskbar tests.
- Adapter wiring (Host file, persist key, slot inject, git probe) is covered by a small number of contract tests if cheap; otherwise lab verification on 3082 (including a coarse-pointer pass and a collapsed Rail). Do not skip Taskbar tests in favour of only clicking the GUI.
- Prior art: existing `tests/project.spec.ts` and `tests/*.spec.ts` in this repo (same seam). `dsh-better-taskbar`'s TaskbarCore tests are a different product; do not import that module.

## Out of Scope

- Occupying `root` or `sidebar`; replacing or restyling Provider Usage; editing `dsh-llm-providers-ui`, ACP plugins, `dsh-mobile`, or `dsh-better-taskbar`.
- Official Session fields for pin / snooze / settle / branch / PR; DSH core changes; Host settings.yaml as the ledger.
- Storing a GitHub token; anonymous GitHub API as the PR source; faking marks when probes fail.
- Identity settings UI (derivation is replaceable; no UI in this spec).
- Automatic Settle (inactivity, PR merge).
- Dragging onto Snoozed.
- T3 right-panel tabbar, composer footer, diff panel, worktree / environment switcher.
- Multi-draft rows that are not DSH Sessions (T3 `/draft/$draftId` pre-thread identities).
- Unarchive, delete Session, Session-level error Live status.
- OS taskbar / tray.
- Production 3080 / `~/.dsh` as the verification surface.
- A second mobile Taskbar, a mobile-only arrange-threads sheet, or copying official Logo/Toggle into the occupant.

## Further Notes

- Glossary: `CONTEXT.md`. Overlay: `docs/adr/0001-host-shelf-overlay.md`. Directory-flow declarer: `docs/adr/0002-directory-flow-declarer.md`. Git marks: `docs/adr/0003-host-git-marks.md`. Runtime marks: `docs/adr/0004-runtime-marks.md`.
- T3 Active is the residual set, not "agent running". Running is Live status.
- Official `completed` is local done-unread, not Settled.
- Wake-from-snooze lands on Active. Pin does not persist across snooze. **Decision: Snooze clears pin keys; wake is always Active.**
- Discard vs Archive: Discard only applies to Unsent Draft (blank + persist). Archive applies to started Sessions.
- Tickets 01–07 implemented the previous Card (two lines, no git marks, Rail search+add only). This spec supersedes stories 2, 5, 7, 43, 44, 52, 53, 56, 61–63, and 72. Next step: `/to-tickets` for the layout delta, blockers-first, without reopening resolved Shelf/ledger tickets unless a story they claimed changed.
