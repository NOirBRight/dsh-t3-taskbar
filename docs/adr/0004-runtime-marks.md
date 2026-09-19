# Runtime marks are optional and mapped, not an ACP inject

The Card’s Runtime mark exists to tell DSH Runtime, AGY, and Cursor apart. We draw it only when an AGY or Cursor ACP plugin is present; we do not inject those plugins, and we do not edit `dsh-llm-providers-ui`. The value is `ModelSelection.provider` mapped to those three Runtimes (Grok/Codex remain DSH Runtime). Missing projection means no mark, not a guessed logo.

**Considered**: importing icons from `dsh-llm-providers-ui` (that package owns Provider Usage, not Card marks); injecting ACP plugins so the catalog is always loaded (the stock profile would then be covered in DSH Runtime logos that distinguish nothing); guessing a Runtime when the occupant snapshot has no provider (a lying badge).

Detection is a cheap registry-name scan (`acp-antigravity` / `acp-cursor`) on the cordis plugin list. Absence, or a missing `modelSelection` provider on the Session snapshot, collapses the mark. Mapping is pure inside `project`: `cursor-agent` → `cursor`, Antigravity catalog id `antigravity` (and `antigravity:*` / `google-antigravity`) → `agy`, everything else including Codex/Grok → `dsh`.
