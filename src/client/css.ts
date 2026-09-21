const STYLE_ID = 'dsh-t3-taskbar-css'

export function ensureTaskbarStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) > button, div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) > nav { display:none !important; }
.dsht3 { height:100%; min-height:0; width:100%; min-width:0; flex:1; display:flex; flex-direction:column; color:var(--dsw-alias-label-primary); font:var(--dsw-font-s-14); }
.dsht3-rail { padding:4px 0; display:flex; flex-direction:column; align-items:center; gap:8px; }
.dsht3-footer-plugin { width:32px; height:32px; display:inline-flex; align-items:center; justify-content:center; gap:0; padding:0; border:0; border-radius:8px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; }
.dsht3-footer-plugin:hover, .dsht3-footer-plugin:focus-visible { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); outline:none; }
.dsht3-footer-plugin > span, div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) [data-slot="settings.trigger"] > span, div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) .dsh-mobile-remote-footer > span { display:none!important; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) div:has(> div > [data-slot="sidebar.footer.action"]):has(> div > [data-slot="sidebar.settings"]) { box-sizing:border-box; width:100%; display:grid!important; grid-template-columns:32px 32px 32px minmax(0,1fr); grid-auto-rows:auto; justify-content:start; align-items:center; gap:0; padding:0; position:relative; z-index:2; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) div:has(> div > [data-slot="sidebar.footer.action"]):has(> div > [data-slot="sidebar.settings"]) > div { display:contents!important; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) [data-provider-usage-panel] { grid-column:1 / -1; grid-row:1; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) [data-slot="sidebar.settings"] > div { grid-column:1; grid-row:2; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) .dsht3-footer-plugin { grid-column:2; grid-row:2; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) .dsh-mobile-remote-footer { grid-column:3; grid-row:2; width:32px!important; min-width:32px!important; padding:6px!important; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) div:has(> div > [data-slot="sidebar.footer.action"]):has(> div > [data-slot="sidebar.settings"])::before { content:""; position:absolute; left:0; right:0; top:-20px; height:20px; pointer-events:none; background:linear-gradient(to bottom, transparent, var(--dsw-specific-sidebar-fill)); }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) [data-provider-usage-panel] { padding-bottom:2px!important; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) [data-slot="sidebar.settings"] div:has(> button > [data-slot="settings.trigger"]) { height:32px!important; margin:0!important; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) [data-slot="sidebar.settings"] button:has(> [data-slot="settings.trigger"]) { width:32px!important; height:32px!important; padding:0 8px!important; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3):has(.dsht3-rail) div:has(> div > [data-slot="sidebar.footer.action"]):has(> div > [data-slot="sidebar.settings"]) { grid-template-columns:32px; justify-content:center; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3):has(.dsht3-rail) [data-slot="sidebar.settings"] > div { grid-column:1; grid-row:1; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3):has(.dsht3-rail) .dsht3-footer-plugin { grid-column:1; grid-row:2; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3):has(.dsht3-rail) .dsh-mobile-remote-footer { grid-column:1; grid-row:3; }
.dsht3-head { position:relative; flex:none; min-width:0; display:flex; align-items:center; gap:3px; padding:2px 2px 8px; }
.dsht3-icon { cursor:pointer; width:30px; height:30px; color:var(--dsw-alias-label-secondary); background:transparent; border:0; border-radius:8px; flex:none; justify-content:center; align-items:center; padding:0; display:inline-flex; }
.dsht3-icon:hover, .dsht3-icon:focus-visible { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); outline:none; }
.dsht3-search { flex:1; min-width:0; height:32px; display:flex; align-items:center; gap:7px; padding:0 9px; border-radius:8px; background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-tertiary); }
.dsht3-search svg { flex:none; }
.dsht3-search:focus-within { box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l2); color:var(--dsw-alias-label-secondary); }
.dsht3-search input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:var(--dsw-alias-label-primary); font:inherit; }
.dsht3-workspace-filter { flex:none; }
.dsht3-workspace-menu { position:absolute; z-index:80; top:38px; left:2px; right:2px; box-sizing:border-box; padding:8px; border:1px solid var(--dsw-alias-border-l2); border-radius:10px; background:var(--dsw-specific-menu); box-shadow:var(--dsw-shadow-lv2); }
.dsht3-workspace-search { height:32px; display:flex; align-items:center; gap:7px; padding:0 8px; margin-bottom:6px; box-sizing:border-box; border-bottom:1px solid var(--dsw-alias-state-business-primary); color:var(--dsw-alias-label-tertiary); }
.dsht3-workspace-search input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:var(--dsw-alias-label-primary); font:inherit; }
.dsht3-workspace-options { max-height:min(360px, calc(100vh - 120px)); overflow:auto; }
.dsht3-workspace-options button { width:100%; min-height:34px; display:flex; align-items:center; gap:8px; padding:5px 7px; border:0; border-radius:7px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; text-align:left; font:inherit; }
.dsht3-workspace-options button:hover, .dsht3-workspace-options button:focus-visible, .dsht3-workspace-options .dsht3-workspace-selected { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); outline:none; }
.dsht3-workspace-options button > svg, .dsht3-workspace-options button > .dsht3-ident { flex:none; }
.dsht3-workspace-options button > span:last-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsht3-list-wrap { position:relative; min-height:0; flex:1; }
.dsht3-list { height:100%; min-height:0; overflow:auto; display:flex; flex-direction:column; box-sizing:border-box; padding:2px 0 10px; scrollbar-width:none; }
.dsht3-list::-webkit-scrollbar { display:none; width:0; height:0; }
.dsht3-scroll-thumb { position:absolute; z-index:12; top:0; right:1px; width:4px; min-height:28px; border-radius:999px; background:color-mix(in srgb, var(--dsw-alias-label-tertiary) 42%, transparent); cursor:grab; touch-action:none; opacity:.72; transition:opacity 120ms ease; }
.dsht3-scroll-thumb:hover, .dsht3-scroll-thumb:active { opacity:1; cursor:grabbing; }
.dsht3-shelf, .dsht3-block { flex:none; margin:0 0 7px; }
.dsht3-settled { margin-top:auto; padding-top:8px; }
.dsht3-settled .dsht3-title { opacity:.7; transition:opacity 160ms ease; }
.dsht3-settled .dsht3-ident { opacity:.4; filter:grayscale(1); transition:opacity 160ms ease, filter 160ms ease; }
.dsht3-settled .dsht3-row:is(:hover,:focus-within) .dsht3-title,
.dsht3-settled .dsht3-row:is(:hover,:focus-within) .dsht3-ident { opacity:1; filter:none; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) :is([data-provider-usage-panel] .pu-title, [data-provider-usage-panel] .pu-stage, [data-provider-usage-panel] .pu-head button, button:has(> [data-slot="settings.trigger"]), .dsht3-footer-plugin, .dsh-mobile-remote-footer) { opacity:.65; transition:opacity 160ms ease; }
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) :is([data-provider-usage-panel]:hover, [data-provider-usage-panel]:focus-within) :is(.pu-title,.pu-stage,.pu-head button),
div:has(> div > [data-slot="sidebar.workspaces"] > .dsht3) :is(button:has(> [data-slot="settings.trigger"]), .dsht3-footer-plugin, .dsh-mobile-remote-footer):is(:hover,:focus-visible) { opacity:1; }
.dsht3-shead, button.dsht3-shead { min-height:28px; display:flex; align-items:center; gap:5px; padding:4px 8px; border:0; background:transparent; color:var(--dsw-alias-label-tertiary); font:var(--dsw-font-xxs-12); font-weight:500; width:100%; box-sizing:border-box; }
button.dsht3-shead { cursor:pointer; text-align:left; }
button.dsht3-shead:hover { color:var(--dsw-alias-label-primary); }
.dsht3-rule { flex:1; height:1px; background:var(--dsw-alias-border-l2); opacity:.65; }
.dsht3-chevron { display:inline-flex; transition:transform 120ms ease; }
.dsht3-chevron:not(.dsht3-chevron-open) { transform:rotate(-90deg); }
.dsht3-settled .dsht3-chevron { transform:none; }
.dsht3-settled .dsht3-chevron-open { transform:rotate(180deg); }
.dsht3-settled .dsht3-chevron svg { width:12px; height:12px; }
.dsht3-row { position:relative; display:flex; align-items:stretch; border-radius:8px; }
.dsht3-row:hover { background:var(--dsw-specific-sidebar-nav-item-hover); }
.dsht3-row.dsht3-on { background:var(--dsw-specific-sidebar-nav-item-active); }
.dsht3-row:not(.dsht3-slim) { margin-bottom:8px; }
.dsht3-block { padding-bottom:3px; border-bottom:1px solid var(--dsw-alias-border-l2); }
.dsht3-row.dsht3-draft, .dsht3-row.dsht3-has-draft { background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, transparent); }
.dsht3-row.dsht3-draft:hover, .dsht3-row.dsht3-has-draft:hover { background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 13%, transparent); }
.dsht3-row.dsht3-draft.dsht3-on, .dsht3-row.dsht3-has-draft.dsht3-on { background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 17%, var(--dsw-specific-sidebar-nav-item-active)); }
.dsht3-card { flex:1; min-width:0; min-height:78px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:flex-start; gap:3px; padding:8px; border:0; border-radius:8px; background:transparent; color:var(--dsw-alias-label-primary); cursor:pointer; text-align:left; }
.dsht3-slim .dsht3-card { min-height:34px; padding-top:4px; padding-bottom:4px; gap:0; }
.dsht3-line1 { display:flex; align-items:center; gap:6px; min-width:0; overflow:visible; color:var(--dsw-alias-label-tertiary); font:var(--dsw-font-xxs-12); }
.dsht3-line2, .dsht3-line3 { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0; }
.dsht3-line2 { line-height:20px; }
.dsht3-line3 { display:flex; align-items:center; gap:8px; min-height:16px; color:var(--dsw-alias-label-tertiary); font:var(--dsw-font-xxs-12); }
.dsht3-git, .dsht3-mark { min-width:0; display:inline-flex; align-items:center; gap:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsht3-git svg, .dsht3-mark svg { flex:none; width:12px; height:12px; }
.dsht3-runtime { margin-left:auto; flex:none; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; color:var(--dsw-alias-label-secondary); }
.dsht3-runtime svg { display:block; width:12px; height:12px; }
.dsht3-ws, .dsht3-title { min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dsht3-status-slot { position:relative; flex:none; min-width:32px; min-height:22px; display:flex; align-items:center; justify-content:flex-end; }
.dsht3-meta { flex:none; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; transition:opacity 120ms ease; }
.dsht3-card-actions { position:absolute; inset:0 0 0 auto; display:flex; align-items:stretch; opacity:0; pointer-events:none; transition:opacity 120ms ease; }
.dsht3-tooltip { position:relative; display:inline-flex; }
.dsht3-tooltip > [role="tooltip"] { position:absolute; z-index:60; right:calc(100% + 6px); top:50%; transform:translateY(-50%); width:max-content; max-width:220px; padding:4px 7px; border-radius:5px; background:var(--dsw-alias-bg-inverse, #202124); color:var(--dsw-alias-label-inverse, #fff); font:var(--dsw-font-xxs-12); opacity:0; visibility:hidden; pointer-events:none; transition:opacity 120ms ease; }
.dsht3-tooltip:hover > [role="tooltip"], .dsht3-tooltip:focus-within > [role="tooltip"] { opacity:1; visibility:visible; }
.dsht3-card-actions button { width:24px; height:22px; display:inline-flex; align-items:center; justify-content:center; padding:0; border:0; border-radius:6px; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; }
.dsht3-card-actions button:hover, .dsht3-card-actions button:focus-visible { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); outline:none; }
.dsht3-card-actions button:disabled { opacity:.35; cursor:not-allowed; }
.dsht3-card-actions svg { width:14px; height:14px; }
.dsht3-card-actions .dsht3-draft-close svg, .dsht3-more.dsht3-draft-close svg { width:12px; height:12px; }
.dsht3-live { display:inline-flex; align-items:center; gap:3px; }
.dsht3-live-running { color:var(--dsw-alias-state-success-primary, var(--dsw-alias-state-business-primary)); }
.dsht3-live-waiting-for-me, .dsht3-live-done-unread { color:var(--dsw-alias-state-warn-primary); }
.dsht3-live svg { width:12px; height:12px; }
.dsht3-spin { display:inline-flex; animation:dsht3-spin 1s linear infinite; }
@keyframes dsht3-spin { to { transform:rotate(360deg); } }
.dsht3-ident { flex:none; width:16px; height:16px; border-radius:4px; display:inline-flex; align-items:center; justify-content:center; overflow:hidden; font:var(--dsw-font-xxs-12); font-weight:700; font-size:8px; line-height:1; letter-spacing:-.04em; color:var(--dsw-alias-state-business-primary); background:color-mix(in srgb, currentColor 14%, transparent); }
.dsht3-ident[data-color="gray"] { color:var(--dsw-alias-label-tertiary); }
.dsht3-ident[data-color="red"] { color:var(--dsw-alias-state-error-primary); }
.dsht3-ident[data-color="orange"] { color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, var(--dsw-alias-state-warn-primary)); }
.dsht3-ident[data-color="amber"] { color:var(--dsw-alias-state-warn-primary); }
.dsht3-ident[data-color="yellow"] { color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 55%, var(--dsw-alias-state-business-primary)); }
.dsht3-ident[data-color="lime"] { color:color-mix(in srgb, var(--dsw-alias-state-success-primary, var(--dsw-alias-state-business-primary)) 70%, var(--dsw-alias-state-warn-primary)); }
.dsht3-ident[data-color="green"] { color:var(--dsw-alias-state-success-primary, var(--dsw-alias-state-business-primary)); }
.dsht3-ident[data-color="emerald"] { color:color-mix(in srgb, var(--dsw-alias-state-success-primary, var(--dsw-alias-state-business-primary)) 75%, var(--dsw-alias-state-business-primary)); }
.dsht3-ident[data-color="teal"] { color:color-mix(in srgb, var(--dsw-alias-state-success-primary, var(--dsw-alias-state-business-primary)) 45%, var(--dsw-alias-state-business-primary)); }
.dsht3-ident[data-color="cyan"] { color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 60%, var(--dsw-alias-state-success-primary, var(--dsw-alias-state-business-primary))); }
.dsht3-ident[data-color="sky"] { color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 80%, var(--dsw-alias-label-primary)); }
.dsht3-ident[data-color="blue"] { color:var(--dsw-alias-state-business-primary); }
.dsht3-ident[data-color="indigo"] { color:color-mix(in srgb, var(--dsw-alias-state-business-primary) 55%, var(--dsw-alias-state-error-primary)); }
.dsht3-ident[data-color="violet"] { color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 40%, var(--dsw-alias-state-business-primary)); }
.dsht3-ident[data-color="purple"] { color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 65%, var(--dsw-alias-label-secondary)); }
.dsht3-ident[data-color="fuchsia"] { color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 80%, var(--dsw-alias-state-business-primary)); }
.dsht3-ident[data-color="pink"] { color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 70%, var(--dsw-alias-label-primary)); }
.dsht3-ident[data-color="rose"] { color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 85%, var(--dsw-alias-state-warn-primary)); }
.dsht3-more-wrap { position:absolute; right:4px; top:4px; }
.dsht3-more { width:28px; height:28px; display:inline-flex; opacity:0; pointer-events:none; align-items:center; justify-content:center; padding:0; border:0; border-radius:8px; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; }
.dsht3-more:hover, .dsht3-more:focus-visible { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); outline:none; }
.dsht3-row:focus-within .dsht3-more { opacity:1; pointer-events:auto; }
.dsht3-row:focus-within .dsht3-card-actions { opacity:1; pointer-events:auto; position:relative; }
.dsht3-row:focus-within .dsht3-status-slot > .dsht3-meta { opacity:0; position:absolute; pointer-events:none; }
.dsht3-workspace-filter > button[aria-expanded="true"] { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary); }
.dsht3-empty { padding:24px 12px; color:var(--dsw-alias-label-tertiary); }
.dsht3-pen { color:var(--dsw-alias-state-warn-primary); display:inline-flex; vertical-align:-2px; margin-right:4px; }
.dsht3-show-more { width:100%; height:30px; border:0; border-radius:7px; background:transparent; color:var(--dsw-alias-label-tertiary); cursor:pointer; font:var(--dsw-font-xxs-12); }
.dsht3-show-more:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.dsht3-menu { position:fixed; z-index:1001; width:220px; padding:6px; border:1px solid var(--dsw-alias-border-l2); border-radius:12px; background:var(--dsw-specific-menu); box-shadow:var(--dsw-shadow-lv2); }
.dsht3-menu-head { padding:6px 10px 7px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-tertiary); font:var(--dsw-font-xxs-12); }
.dsht3-menu button { width:100%; height:34px; display:flex; align-items:center; gap:9px; padding:0 9px; border:0; border-radius:8px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; text-align:left; font:inherit; }
.dsht3-menu button:hover, .dsht3-menu button:focus-visible { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); outline:none; }
.dsht3-menu button:disabled { opacity:.45; cursor:default; }
.dsht3-menu-icon { width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; flex:none; }
.dsht3-menu-icon svg { max-width:16px; max-height:16px; }
.dsht3-menu-move-up { display:inline-flex; transform:rotate(180deg); }
.dsht3-menu-trailing { margin-left:auto; display:inline-flex; }
.dsht3-menu hr { height:1px; margin:5px 6px; border:0; background:var(--dsw-alias-border-l2); }
.dsht3-custom { display:flex; gap:4px; padding:5px 4px 3px; }
.dsht3-custom input { flex:1; min-width:0; height:30px; border:1px solid var(--dsw-alias-border-l2); border-radius:8px; background:transparent; color:var(--dsw-alias-label-primary); font:var(--dsw-font-xxs-12); padding:0 7px; }
.dsht3-menu .dsht3-custom button { width:auto; height:30px; padding:0 9px; }
.dsht3-danger { color:var(--dsw-alias-state-error-primary) !important; }
.dsht3-dialog-backdrop { position:fixed; inset:0; z-index:1100; display:grid; place-items:center; padding:24px; background:var(--dsw-alias-bg-mask-1); }
.dsht3-dialog { width:min(360px, calc(100vw - 48px)); padding:20px; border:1px solid var(--dsw-alias-border-l2); border-radius:14px; background:var(--dsw-specific-menu); box-shadow:var(--dsw-shadow-lv3, var(--dsw-shadow-lv2)); box-sizing:border-box; }
.dsht3-dialog h2 { margin:0 0 8px; color:var(--dsw-alias-label-primary); font:var(--dsw-font-l-18); }
.dsht3-dialog p { margin:0 0 16px; color:var(--dsw-alias-label-secondary); font:var(--dsw-font-s-14); line-height:1.5; }
.dsht3-dialog > input { width:100%; height:36px; padding:0 10px; box-sizing:border-box; border:1px solid var(--dsw-alias-border-l2); border-radius:8px; background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-primary); font:inherit; outline:none; }
.dsht3-dialog > input:focus { border-color:var(--dsw-alias-state-business-primary); }
.dsht3-dialog-actions { margin-top:18px; display:flex; justify-content:flex-end; gap:8px; }
.dsht3-dialog-actions button { height:34px; padding:0 14px; border:0; border-radius:8px; background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); cursor:pointer; }
.dsht3-dialog-actions .dsht3-dialog-primary { background:var(--dsw-alias-state-business-primary); color:white; }
.dsht3-dialog-actions .dsht3-dialog-danger { background:var(--dsw-alias-state-error-primary); color:white; }
.dsht3-row, .dsht3-shelf, .dsht3-show-more, .dsht3-dropzone { will-change:transform; transition:transform 280ms cubic-bezier(.22, 1, .36, 1); }
@media (prefers-reduced-motion:reduce) {
  .dsht3-row, .dsht3-shelf, .dsht3-show-more, .dsht3-dropzone { transition:none; }
}
.dsht3-row[data-drag-id] .dsht3-card { cursor:grab; user-select:none; }
.dsht3-row[data-drag-id] .dsht3-card:active { cursor:grabbing; }
.dsht3-dragging { opacity:0; pointer-events:none; }
.dsht3-shelf-head .dsht3-rule { transition:background 120ms ease, opacity 120ms ease; }
.dsht3-shelf-head.dsht3-cross-target { color:var(--dsw-alias-state-business-primary); }
.dsht3-shelf-head.dsht3-cross-target .dsht3-rule { background:var(--dsw-alias-state-business-primary); opacity:1; }
.dsht3-drag-overlay { position:fixed; z-index:1200; pointer-events:none; box-sizing:border-box; border-radius:9px; background:var(--dsw-specific-sidebar-nav-item-active); box-shadow:var(--dsw-shadow-lv2); transform:none; animation:dsht3-drag-lift 100ms ease-out; will-change:top,left; }
.dsht3-drag-overlay .dsht3-card { cursor:grabbing; }
.dsht3-drag-overlay .dsht3-line1 { min-height:22px; }
@keyframes dsht3-drag-lift { from { opacity:.5; } to { opacity:1; } }
.dsht3-verb { flex:none; align-self:center; padding:0 8px; color:var(--dsw-alias-label-secondary); font:var(--dsw-font-xxs-12); }
.dsht3-dropzone { min-height:8px; }
.dsht3-settings { display:flex; flex-direction:column; gap:14px; max-width:560px; }
.dsht3-settings h2, .dsht3-settings p { margin:0; }
.dsht3-settings p { color:var(--dsw-alias-label-secondary); }
.dsht3-settings label { display:flex; align-items:center; gap:10px; min-height:32px; }
.dsht3-settings input[type="checkbox"] { width:16px; height:16px; }
.dsht3-settings-days { justify-content:space-between; padding-left:26px; }
.dsht3-settings input[type="number"] { width:72px; padding:5px 7px; border:1px solid var(--dsw-alias-border-l2); border-radius:6px; background:var(--dsw-alias-bg-layer-1); color:inherit; }
.dsht3-settings button { align-self:flex-start; min-height:32px; padding:5px 10px; border:1px solid var(--dsw-alias-border-l2); border-radius:7px; background:transparent; color:inherit; cursor:pointer; }
.dsht3-settings output { color:var(--dsw-alias-label-secondary); }
.dsht3-mobile { background:var(--dsw-specific-sidebar-fill); }
div:has(> div > [data-slot="sidebar.workspaces"] > [data-dsh-mobile-taskbar]) [class*="logoRow"],
div:has(> div > [data-slot="sidebar.workspaces"] > [data-dsh-mobile-taskbar]) [class*="newSession"] { display:none !important; }
.dsht3-mobile-head { flex:none; min-height:56px; box-sizing:border-box; display:flex; align-items:center; gap:4px; padding:4px 8px 8px; color:var(--dsw-alias-label-primary); }
.dsht3-mobile-title { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:0 8px; font-weight:600; }
.dsht3-mobile-error { flex:none; margin:0 12px 6px; padding:7px 10px; border-radius:9px; background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent); color:var(--dsw-alias-state-error-primary); font-size:12px; }
.dsht3-mobile-icon { width:44px; height:44px; flex:none; display:inline-flex; align-items:center; justify-content:center; padding:0; border:0; border-radius:14px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; }
.dsht3-mobile-icon:hover, .dsht3-mobile-icon:focus-visible { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); outline:none; }
.dsht3-mobile-close svg, .dsht3-mobile-back svg { transform:rotate(180deg); }
.dsht3-mobile .dsht3-head { height:0; padding:0; gap:0; overflow:visible; }
.dsht3-mobile .dsht3-head > .dsht3-search, .dsht3-mobile .dsht3-head > .dsht3-icon { display:none; }
.dsht3-mobile .dsht3-workspace-filter { position:fixed; z-index:900; right:calc(16px + env(safe-area-inset-right)); bottom:calc(84px + env(safe-area-inset-bottom)); }
.dsht3-mobile .dsht3-workspace-filter > .dsht3-icon { width:48px; height:48px; border-radius:16px; background:var(--dsw-alias-interactive-bg-hover); box-shadow:var(--dsw-shadow-lv2); }
.dsht3-mobile .dsht3-workspace-menu { top:auto; left:auto; right:0; bottom:54px; width:min(300px, calc(100vw - 32px)); }
.dsht3-mobile .dsht3-workspace-add { width:100%; min-height:44px; display:flex; align-items:center; gap:8px; padding:5px 7px; border:0; border-radius:7px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; text-align:left; font:inherit; }
.dsht3-mobile .dsht3-workspace-add:hover, .dsht3-mobile .dsht3-workspace-add:focus-visible { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); outline:none; }
.dsht3-mobile .dsht3-list-wrap { margin:0 4px; border-radius:24px 24px 0 0; background:var(--dsw-alias-bg-base); overflow:hidden; }
.dsht3-mobile .dsht3-list { padding:8px 8px calc(148px + env(safe-area-inset-bottom)); }
.dsht3-mobile .dsht3-row { border-radius:12px; overflow:hidden; }
.dsht3-mobile .dsht3-card { position:relative; z-index:1; min-height:72px; padding:10px; border-radius:12px; background:var(--dsw-specific-sidebar-fill); transition:transform 180ms ease; }
.dsht3-mobile .dsht3-row.dsht3-on .dsht3-card { background:var(--dsw-specific-sidebar-nav-item-active); }
.dsht3-mobile .dsht3-swipe-actions { position:absolute; z-index:0; inset:0 0 0 auto; display:flex; align-items:stretch; pointer-events:none; }
.dsht3-mobile .dsht3-row[data-swipe-open] .dsht3-swipe-actions { pointer-events:auto; }
.dsht3-mobile .dsht3-swipe-action { min-width:72px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; padding:4px 6px; border:0; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-interactive-bg-hover); cursor:pointer; font:var(--dsw-font-xxs-12); }
.dsht3-mobile .dsht3-swipe-action svg { width:16px; height:16px; }
.dsht3-mobile .dsht3-swipe-primary { background:var(--dsw-alias-state-business-primary); color:var(--dsw-alias-label-inverse, #fff); }
.dsht3-mobile .dsht3-swipe-action:focus-visible { outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:-2px; }
.dsht3-mobile .dsht3-card[data-dsh-mobile-session-nav] { touch-action:pan-y; }
.dsht3-mobile .dsht3-slim .dsht3-card { min-height:44px; padding-top:8px; padding-bottom:8px; }
.dsht3-mobile .dsht3-shead, .dsht3-mobile .dsht3-show-more { min-height:44px; }
.dsht3-mobile .dsht3-more { width:44px; height:44px; }
.dsht3-mobile .dsht3-mobile-new { position:fixed; z-index:900; right:calc(16px + env(safe-area-inset-right)); bottom:calc(16px + env(safe-area-inset-bottom)); min-width:56px; height:56px; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:0 18px; border:0; border-radius:18px; background:var(--dsw-alias-state-business-primary); color:var(--dsw-alias-label-inverse, #fff); box-shadow:var(--dsw-shadow-lv2); cursor:pointer; font:inherit; font-weight:600; }
.dsht3-mobile .dsht3-mobile-new:hover, .dsht3-mobile .dsht3-mobile-new:focus-visible { filter:brightness(1.08); outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:2px; }
.dsht3-mobile .dsht3-footer-plugin { width:44px; height:44px; }
div:has(> div > [data-slot="sidebar.workspaces"] > [data-dsh-mobile-taskbar]) div:has(> div > [data-slot="sidebar.footer.action"]):has(> div > [data-slot="sidebar.settings"]) { grid-template-columns:44px 44px 44px minmax(0,1fr); min-height:52px; padding:0 8px; }
div:has(> div > [data-slot="sidebar.workspaces"] > [data-dsh-mobile-taskbar]) [data-slot="sidebar.settings"] div:has(> button > [data-slot="settings.trigger"]), div:has(> div > [data-slot="sidebar.workspaces"] > [data-dsh-mobile-taskbar]) [data-slot="sidebar.settings"] button:has(> [data-slot="settings.trigger"]) { width:44px!important; height:44px!important; min-height:44px!important; padding:0!important; }
div:has(> div > [data-slot="sidebar.workspaces"] > [data-dsh-mobile-taskbar]) .dsh-mobile-remote-footer { width:44px!important; min-width:44px!important; height:44px!important; padding:10px!important; }

@media (hover:hover) and (pointer:fine) {
  .dsht3-row:hover .dsht3-more { opacity:1; pointer-events:auto; }
  .dsht3-row:hover .dsht3-card-actions { opacity:1; pointer-events:auto; position:relative; }
  .dsht3-row:hover .dsht3-status-slot > .dsht3-meta { opacity:0; position:absolute; pointer-events:none; }
}
@media (hover:none) and (pointer:coarse) {
  .dsht3-more-wrap, .dsht3-card-actions { display:none; }
  .dsht3-row:focus-within .dsht3-status-slot > .dsht3-meta { opacity:1; position:static; pointer-events:auto; }
  .dsht3-row { -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent; user-select:none; touch-action:pan-y; }
}
@media (prefers-reduced-motion:reduce) { .dsht3-spin { animation:none; } }
`
  document.head.append(style)
}
