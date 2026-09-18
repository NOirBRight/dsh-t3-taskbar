const STYLE_ID = 'dsh-t3-taskbar-css'

export function ensureTaskbarStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.dsht3 { height:100%; min-height:0; width:100%; min-width:0; flex:1; display:flex; flex-direction:column; color:var(--dsw-alias-label-primary); font:var(--dsw-font-s-14); }
.dsht3-rail { padding:8px 0; display:flex; flex-direction:column; align-items:center; gap:8px; }
.dsht3-icon { cursor:pointer; width:28px; height:28px; color:var(--dsw-alias-label-secondary); background:transparent; border:none; border-radius:50%; flex:none; justify-content:center; align-items:center; padding:0; display:inline-flex; }
.dsht3-icon:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.dsht3-head { flex:none; padding:4px 8px 8px; }
.dsht3-search { height:34px; display:flex; align-items:center; padding:0 10px; border-radius:8px; background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-tertiary); }
.dsht3-search input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:var(--dsw-alias-label-primary); font:inherit; }
.dsht3-add { width:100%; height:32px; margin-top:8px; border:0; border-radius:8px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; }
.dsht3-add:hover { background:var(--dsw-specific-sidebar-nav-item-hover); color:var(--dsw-alias-label-primary); }
.dsht3-list { min-height:0; flex:1; overflow:auto; padding:4px 6px 12px; }
.dsht3-shelf { margin:2px 0 8px; }
.dsht3-shead { min-height:28px; display:flex; align-items:center; padding:4px 8px; color:var(--dsw-alias-label-tertiary); font:var(--dsw-font-xxs-12); font-weight:500; }
.dsht3-stoggle { width:100%; border:0; background:transparent; cursor:pointer; text-align:left; gap:6px; }
.dsht3-slim { flex:1; min-width:0; min-height:28px; display:flex; align-items:center; padding:4px 8px; border:0; border-radius:8px; background:transparent; color:var(--dsw-alias-label-primary); cursor:pointer; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font:inherit; }
.dsht3-unsettle { flex:none; border:0; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; font:var(--dsw-font-xxs-12); padding:4px 6px; margin:2px 0; border-radius:6px; }
.dsht3-unsettle:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.dsht3-row { display:flex; align-items:stretch; border-radius:8px; }
.dsht3-row:hover { background:var(--dsw-specific-sidebar-nav-item-hover); }
.dsht3-row.dsht3-on { background:var(--dsw-specific-sidebar-nav-item-active); }
.dsht3-card { flex:1; min-width:0; min-height:44px; display:flex; flex-direction:column; justify-content:center; gap:2px; padding:6px 8px; border:0; border-radius:8px; background:transparent; color:var(--dsw-alias-label-primary); cursor:pointer; text-align:left; }
.dsht3-pin { flex:none; border:0; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; font:var(--dsw-font-xxs-12); padding:4px 6px; margin:6px 0; border-radius:6px; }
.dsht3-pin:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.dsht3-wake { flex:none; border:0; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; font:var(--dsw-font-xxs-12); padding:4px 6px; margin:6px 0; border-radius:6px; }
.dsht3-wake:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.dsht3-slim .dsht3-card { min-height:32px; padding:4px 8px; gap:0; }
.dsht3-shead button, button.dsht3-shead { all:unset; cursor:pointer; min-height:28px; display:flex; align-items:center; padding:4px 8px; color:var(--dsw-alias-label-tertiary); font:var(--dsw-font-xxs-12); font-weight:500; width:100%; box-sizing:border-box; }
.dsht3-shead button:hover, button.dsht3-shead:hover { color:var(--dsw-alias-label-primary); }
.dsht3-line1 { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-tertiary); font:var(--dsw-font-xxs-12); }
.dsht3-line2 { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsht3-more { flex:none; width:28px; margin:6px 4px; border:0; border-radius:8px; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; }
.dsht3-more:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.dsht3-empty { padding:24px 12px; color:var(--dsw-alias-label-tertiary); }
.dsht3-draft { display:flex; align-items:center; gap:2px; }
.dsht3-discard { cursor:pointer; flex:none; border:0; background:transparent; color:var(--dsw-alias-label-tertiary); font:var(--dsw-font-xxs-12); padding:4px 8px; border-radius:6px; }
.dsht3-discard:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.dsht3-pen { color:var(--dsw-alias-state-warn-primary); display:inline-flex; vertical-align:-2px; margin-right:4px; }
.dsht3-scrim { position:fixed; inset:0; z-index:40; background:var(--dsw-alias-bg-mask-1); }
.dsht3-menu { position:fixed; z-index:41; min-width:196px; padding:6px; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-specific-menu); box-shadow:var(--dsw-shadow-lv2); }
.dsht3-menu button { width:100%; height:34px; display:flex; align-items:center; padding:0 10px; border:0; border-radius:8px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; }
.dsht3-menu button:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.dsht3-custom { display:flex; gap:4px; padding:4px 6px 6px; }
.dsht3-custom input { flex:1; min-width:0; height:30px; border:1px solid var(--dsw-alias-border-l2); border-radius:8px; background:transparent; color:var(--dsw-alias-label-primary); font:var(--dsw-font-xxs-12); padding:0 8px; }
.dsht3-menu .dsht3-custom button { width:auto; height:30px; padding:0 10px; }
.dsht3-danger { color:var(--dsw-alias-state-error-primary) !important; }
.dsht3-row[draggable="true"] { cursor:grab; }
.dsht3-dragging { opacity:0.55; }
.dsht3-shelf.dsht3-drop { box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2); border-radius:8px; }
.dsht3-verb { flex:none; align-self:center; padding:0 8px; color:var(--dsw-alias-label-secondary); font:var(--dsw-font-xxs-12); }
.dsht3-dropzone { min-height:10px; }
@media (hover:hover) and (pointer:fine) {
  .dsht3-more { opacity:0; }
  .dsht3-row:hover .dsht3-more, .dsht3-row.dsht3-on .dsht3-more { opacity:1; }
}
`
  document.head.append(style)
}
