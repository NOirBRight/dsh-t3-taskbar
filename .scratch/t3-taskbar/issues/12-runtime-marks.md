# 12: Runtime marks on line three

**What to build:** When an AGY or Cursor ACP plugin is installed, every Card’s third line includes a Runtime mark: DSH Runtime, AGY, or Cursor. Native harness Sessions show DSH Runtime so they are not mistaken for the product chrome. Codex and Grok stay DSH Runtime. Mapping is from the Session’s model-selection provider (`cursor-agent` → Cursor, Antigravity’s catalog id → AGY, anything else → DSH Runtime). Missing projection or neither ACP plugin present means no Runtime mark. The three marks ship in this plugin; do not import or edit `dsh-llm-providers-ui`.

**Blocked by:** 11 Host git and PR marks

**Status:** resolved

**Parent:** `.scratch/t3-taskbar/spec.md`

- [x] With `acpPresent` false, no Card carries `marks.runtime`
- [x] With `acpPresent` true, mapped providers become `dsh` / `agy` / `cursor`; Codex/Grok map to `dsh`; missing projection omits the mark
- [x] Line three shows the Runtime mark beside any git marks from 11; it still collapses when runtime is absent
- [x] Taskbar does not inject ACP plugins and does not edit `dsh-llm-providers-ui`
- [x] `project` tests inject `acpPresent` and provider strings (they do not load ACP plugins)
- [x] `pnpm test` and `pnpm run build` pass; lab `link:` only (production profile untouched)
