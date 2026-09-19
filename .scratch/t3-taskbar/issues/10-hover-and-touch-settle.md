# 10: Hover and touch Settle on Cards

**What to build:** Fine-pointer Cards reveal Settle (and Snooze) on hover; the pin glyph appears only when the Session is already Pinned. Pin stays on drag and the `···` menu. Coarse-pointer (touch / APK) Cards reveal Settle / Unsettle and `···` on the selected row. The APK overlay drawer uses this same wide Taskbar; this ticket does not edit dsh-mobile or occupy `root`. No mobile-only arrange-threads sheet.

**Blocked by:** 08 Three-line Cards with Workspace Identity

**Status:** resolved

**Parent:** `.scratch/t3-taskbar/spec.md`

- [x] Fine pointer: unpinned Card hover shows Settle (Snooze allowed); pin glyph only if already Pinned
- [x] Pin and Unpin remain available from the row menu; drag onto Pinned still Pins
- [x] Coarse pointer: Settle / Unsettle and `···` appear on the selected Card, not on unselected rows
- [x] Settled rows reveal Unsettle the same way (hover on fine, selected on coarse)
- [x] Occupant still does not register `root` or `sidebar`
- [ ] `pnpm test` and `pnpm run build` pass; lab `link:` only, including a coarse-pointer pass on 3082 if available (production profile untouched)
