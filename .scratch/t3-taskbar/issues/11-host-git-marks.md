# 11: Host git and PR marks

**What to build:** Line three and Settled slim rows show honest git facts: branch when the Workspace path is a repository, a worktree mark only when `cwd` is a linked worktree, and a PR mark only when `gh` is already logged in for that repo and returns a PR. Each mark collapses on its own; the third line takes no space when all are empty. Probes run on the Host and feed `project` as input. The plugin does not store a GitHub token and does not fake marks when probes fail.

**Blocked by:** 08 Three-line Cards with Workspace Identity

**Status:** resolved

**Parent:** `.scratch/t3-taskbar/spec.md`

- [x] `project` accepts git marks as input and copies `branch` / `worktree` / `pr` onto Card `marks`; missing keys stay absent
- [x] Host probe uses `git` for branch and linked-worktree; `gh` only when that repository is already logged in
- [x] Wide Cards show those marks on line three; Settled slim shows PR when present
- [x] A non-git Workspace has no third line and no grey placeholders
- [x] Main checkout is not labelled as a worktree
- [x] No GitHub token is written by this plugin
- [x] `project` tests inject marks (they do not exec git); `pnpm test` and `pnpm run build` pass; lab `link:` only (production profile untouched)
