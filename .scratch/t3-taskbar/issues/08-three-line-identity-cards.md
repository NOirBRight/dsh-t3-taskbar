# 08: Three-line Cards with Workspace Identity

**What to build:** Pinned and Active rows become T3-height three-line Cards: Workspace Identity (monogram + hashed color from the Workspace name), Workspace name, and Live status or relative time on line one; Session title on line two; line three empty for now. Live and time are mutually exclusive. Active has no standing heading. Unsent Draft rows use the same Card structure with no draft heading. Snoozed stays slim with Identity. Settled slim shows Identity, title, and date (PR comes in 11). Overlong text ellipsizes. Pinned heading appears only during drag. Official Logo/Toggle stay in DSH chrome.

**Blocked by:** None (can start immediately). Tickets 01–07 are resolved.

**Status:** resolved

**Parent:** `.scratch/t3-taskbar/spec.md`

- [x] `project` puts `identity { monogram, color }` on every Card from Workspace title; the same title always yields the same mark
- [x] Line one shows Live status when set, otherwise relative `updatedAt` time — never both
- [x] Wide Taskbar Pinned/Active Cards are three lines at T3 Card height; line three takes no space when marks are empty
- [x] Active has no standing heading; Unsent Draft has no section heading; Pinned heading appears only while a drag is in progress
- [x] Snoozed slim shows Identity + title + wake time; Settled slim shows Identity + title + date
- [x] `project` tests cover Identity, Live XOR time, and empty marks without React or RPC
- [x] `pnpm test` and `pnpm run build` pass; lab `link:` only (production profile untouched)

Card shape this ticket expands (from the spec):

```
Card {
  sessionId, workspaceTitle, sessionTitle,
  identity: { monogram, color },
  liveStatus?, relativeTime?,
  marks?: { branch?, worktree?, pr?, runtime?: 'dsh' | 'agy' | 'cursor' },
  selected, unsentDraft?, slim?, wakeAt?, settledAt?
}
```
