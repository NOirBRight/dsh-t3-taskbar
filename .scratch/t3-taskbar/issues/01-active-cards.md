# 01: Active Cards occupy the workspaces seat

**What to build:** On lab (3082), the wide sidebar list is this plugin's Taskbar: started Sessions appear as Cards on Active (Workspace name and Live status on line one, title on line two). Clicking a Card opens that Session. Subagent Sessions, Archived Sessions, and unused blank Sessions stay out of the list; the current blank remains. The Rail shows search and add-workspace icons that expand the sidebar, not Cards. Provider Usage and Settings stay in the official footer. With no overlay yet, every visible Session is Active.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Parent:** `.scratch/t3-taskbar/spec.md`

- [ ] Injecting this plugin does not register `root` or `sidebar`; Provider Usage tiles still render in the footer on 3082
- [ ] Wide Taskbar shows Cards on a single Active Shelf; Workspace is the Card's first line, never a list heading
- [ ] Live status on line one reflects waiting-for-me, running, or done-unread and does not create another Shelf
- [ ] Waiting-for-me wins over running when both could apply
- [ ] Clicking a Card opens that Session; the current Session's Card looks selected
- [ ] Subagent origin, Archived ids, and non-current empty blanks are absent; the current blank is still listed
- [ ] Rail (`wide === false`) shows the two official-style icons and expand, not Cards
- [ ] `project` tests cover membership, Live status, and hide rules without React or RPC
- [ ] `pnpm test` and `pnpm run build` pass; lab profile `link:`s this checkout (production profile untouched)
