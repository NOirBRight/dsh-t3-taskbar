# No public API to open the official settings panel

The Taskbar header plugin icon must open the official plugins / settings entry (stories 77–78). Official `sidebar.settings` owns open state. `settings.section` and onboarding receive `close` / `openSection`, but a `sidebar.workspaces` occupant has no public RPC, slot prop, or Host action that opens that panel.

Until that seam exists upstream, this plugin does not occupy `root` or `sidebar`. It shows the icon only while `sidebar.settings` is occupied, and clicks the official shell trigger: the `button[aria-haspopup="dialog"]` that wraps `[data-slot="settings.trigger"]`. If that node is missing, the icon is hidden so a dead control does not sit in the header. The plugin does not own a second plugin list.

**Considered**: occupying `sidebar` to own the trigger (out of spec); registering `settings.plugins.tab` (a settings page, not an open action); clicking the first `aria-haspopup="dialog"` button on the page (can open the wrong chrome).
