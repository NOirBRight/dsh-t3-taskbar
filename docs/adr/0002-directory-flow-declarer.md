# One declarer can raise the official directory flow

`sidebar.workspaces.directoryFlow` has exactly one declarer. SlotCore throws if a second parent lists that child. Official WorkspaceBrowser declares it when it occupies `sidebar.workspaces`. This plugin must occupy that same seat (priority `-1`) and still `renderSlot` the official picker.

There is no public API for a later occupant to adopt or render a child someone else declared. Until that seam exists upstream, the Taskbar client activates on `slots`+`locale` only so its `slots.inject` waiter runs before ui-workspace, declares the hole itself, and drops the same key from later `register` calls so official WorkspaceBrowser can still sit at priority 0 as fallback without throwing. If the private register wrap cannot attach, or the hole is already declared, occupancy continues without `children` and add-workspace cannot mount the flow.

**Considered**: redeclare and let official throw (kills WorkspacePicker when the throw is synchronous); `uiWorkspace.pickDirectory()` (native picker, not the installed in-app flow); occupying `root`/`sidebar` (out of spec).
