# Card git marks come from Host probes, not SessionSummary

Official `SessionSummary` has no branch, worktree, or PR. We probe the Workspace path on the Host (`git` always; `gh` only when that repo is already logged in) and pass the facts into `project` as input — the same plane as the Shelf ledger. The browser does not run git. The plugin does not store a GitHub token. Each mark collapses on its own; a linked worktree glyph appears only when `cwd` is not the repo's main checkout.
