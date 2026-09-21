#!/usr/bin/env node
/** Physical APK E2E for the T3 Android sidebar. WebView CDP on :9222; screenshots via adb. */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
const { WebSocket } = createRequire('/home/noirbright/Workstation/dsh-mobile/apps/mobile-web/package.json')('ws')

const serial = process.env.DSH_ANDROID_SERIAL ?? 'INVS85H6HY7D5HPR'
const artifacts = resolve(import.meta.dirname, '../.artifacts')
const adb = (...args) => execFileSync('adb', ['-s', serial, ...args], { encoding: 'utf8' }).trim()
const shot = name => writeFileSync(
  resolve(artifacts, name),
  execFileSync('adb', ['-s', serial, 'exec-out', 'screencap', '-p'], { maxBuffer: 20_000_000 }),
)

const targets = await fetch('http://127.0.0.1:9222/json/list').then(r => r.json())
const page = targets.find(row => row.type === 'page')
if (page === undefined) throw new Error('no WebView page on :9222')
const socket = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false })
await new Promise((resolvePromise, reject) => { socket.once('open', resolvePromise); socket.once('error', reject) })
let rpcId = 0
const pending = new Map()
socket.on('message', raw => {
  const message = JSON.parse(raw.toString())
  const waiter = pending.get(message.id)
  if (waiter === undefined) return
  pending.delete(message.id)
  message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result)
})
const send = (method, params = {}) => new Promise((resolvePromise, reject) => {
  const id = ++rpcId
  pending.set(id, { resolve: resolvePromise, reject })
  socket.send(JSON.stringify({ id, method, params }))
})
const evaluate = expression => send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  .then(result => result.result?.value)
const delay = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms))

const openDrawer = async () => {
  const opened = await evaluate(`(() => {
    if (document.querySelector('[data-drawer-open]')) return 'open'
    const button = document.querySelector('[data-mobile-topbar] button, [aria-label="打开导航菜单"]')
    if (button instanceof HTMLButtonElement) { button.click(); return 'clicked' }
    return 'missing'
  })()`)
  if (opened === 'missing') throw new Error('no navigation button')
  await delay(700)
}

shot('apk-e2e-boot.png')
await openDrawer()
const layout = JSON.parse(await evaluate(`JSON.stringify((() => {
  const root = document.querySelector('[data-dsh-mobile-taskbar], .dsht3-mobile, .dsht3')
  const drawer = document.querySelector('[data-dsh-mobile-frame] > nav') || document.querySelector('nav[aria-label="导航抽屉"]')
  const rect = root?.getBoundingClientRect()
  const drawerRect = drawer?.getBoundingClientRect()
  return {
    hasTaskbar: root !== null,
    mobileClass: root?.classList.contains('dsht3-mobile') ?? false,
    marker: root?.hasAttribute('data-dsh-mobile-taskbar') ?? false,
    brand: document.querySelector('.dsht3-mobile-brand') !== null,
    search: document.querySelector('.dsht3-mobile-search input') !== null,
    close: document.querySelector('[data-dsh-mobile-close]') !== null,
    fab: document.querySelector('.dsht3-mobile-new') !== null,
    fabText: document.querySelector('.dsht3-mobile-new span')?.textContent ?? null,
    cards: document.querySelectorAll('.dsht3-card').length,
    drawerOpen: document.querySelector('[data-drawer-open]') !== null,
    width: rect && { w: Math.round(rect.width), h: Math.round(rect.height) },
    drawerWidth: drawerRect && Math.round(drawerRect.width),
    viewport: { w: window.innerWidth, h: window.innerHeight },
  }
})())`))
shot('apk-e2e-sidebar.png')
if (!layout.hasTaskbar || !layout.mobileClass || !layout.marker) throw new Error('layout ' + JSON.stringify(layout))
if (!layout.brand || !layout.fab || !layout.search || layout.close || layout.fabText) throw new Error('chrome ' + JSON.stringify(layout))
if (!(layout.drawerWidth >= layout.viewport.w - 40)) throw new Error('not full page ' + JSON.stringify(layout))
if (layout.cards < 1) throw new Error('no cards ' + JSON.stringify(layout))

const searching = JSON.parse(await evaluate(`JSON.stringify({
  input: document.querySelector('.dsht3-mobile-search input') !== null,
})`))
shot('apk-e2e-search.png')
if (!searching.input) throw new Error('search ' + JSON.stringify(searching))

const picked = await evaluate(`(() => {
  const fab = document.querySelector('.dsht3-mobile-new')
  if (!(fab instanceof HTMLButtonElement)) return 'missing-fab'
  fab.click()
  return document.querySelector('.dsht3-choose-page') !== null ? 'picker' : 'no-picker'
})()`)
await delay(300)
shot('apk-e2e-choose-project.png')
if (picked !== 'picker') throw new Error('choose project ' + picked)
await evaluate(`document.querySelector('[aria-label="返回会话列表"], [aria-label="Back to sessions"]')?.click()`)
await delay(300)

const openedId = await evaluate(`(() => {
  const card = document.querySelector('[data-dsh-mobile-session-nav].dsht3-card')
  const id = card?.closest('[data-session-id]')?.dataset.sessionId ?? null
  if (card instanceof HTMLElement) card.click()
  return id
})()`)
await delay(800)
const afterNav = JSON.parse(await evaluate(`JSON.stringify({
  drawerOpen: document.querySelector('[data-drawer-open]') !== null,
})`))
shot('apk-e2e-after-open.png')
if (afterNav.drawerOpen) throw new Error('drawer stayed open after session tap')

await openDrawer()
const box = JSON.parse(await evaluate(`JSON.stringify((() => {
  const row = document.querySelector('.dsht3-row:not(.dsht3-draft):has(.dsht3-swipe-action)[data-session-id]')
  const r = row?.getBoundingClientRect()
  return r && { x: r.x + r.width / 2, y: r.y + r.height / 2, id: row.dataset.sessionId, w: r.width, h: r.height }
})())`))
if (!box) throw new Error('no swipeable row')
await evaluate(`(() => {
  const row = document.querySelector('.dsht3-row:not(.dsht3-draft)[data-session-id]')
  if (row === null) return
  const r = row.getBoundingClientRect()
  row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }))
})()`)
await delay(300)
const menu = await evaluate(`document.querySelector('.dsht3-menu[role="menu"]')?.getAttribute('aria-label') ?? null`)
shot('apk-e2e-longpress.png')
if (menu !== '会话操作' && menu !== 'Session actions') throw new Error('long press ' + menu)
await evaluate(`document.querySelector('.dsht3-menu button')?.click()`)
await delay(300)

const swipeRaw = await evaluate(`(async () => {
  const row = document.querySelector('.dsht3-row:not(.dsht3-draft):has(.dsht3-swipe-action)[data-session-id]')
  if (row === null) return { open: null, actions: [], error: 'no-row' }
  const r = row.getBoundingClientRect()
  const opts = { bubbles: true, cancelable: true, composed: true, pointerType: 'touch', pointerId: 7, isPrimary: true }
  const fire = (type, x) => row.dispatchEvent(new PointerEvent(type, { ...opts, clientX: x, clientY: r.y + r.height / 2 }))
  fire('pointerdown', r.x + r.width * 0.9)
  await new Promise(ok => setTimeout(ok, 80))
  fire('pointermove', r.x + r.width * 0.55)
  await new Promise(ok => setTimeout(ok, 80))
  fire('pointermove', r.x + r.width * 0.42)
  await new Promise(ok => setTimeout(ok, 80))
  fire('pointerup', r.x + r.width * 0.42)
  await new Promise(ok => setTimeout(ok, 200))
  return {
    open: document.querySelector('[data-swipe-open]')?.dataset.sessionId ?? null,
    id: row.dataset.sessionId,
    transform: row.querySelector('.dsht3-card')?.style.transform ?? '',
    actions: [...row.querySelectorAll('.dsht3-swipe-action')].map(el => el.getAttribute('aria-label')),
  }
})()`)
const swipe = typeof swipeRaw === 'string' ? JSON.parse(swipeRaw) : swipeRaw
shot('apk-e2e-swipe.png')
if (!swipe || swipe.actions.length < 1) throw new Error('swipe ' + JSON.stringify(swipe))
if (swipe.open !== swipe.id && swipe.open !== box.id && !String(swipe.transform || '').includes('translate')) {
  throw new Error('swipe ' + JSON.stringify(swipe))
}

const result = { layout, searching, nav: { opened: openedId, drawerClosed: true }, longPress: menu, swipe }
writeFileSync(resolve(artifacts, 'apk-e2e-result.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify({ apk: 'PASS', ...result }))
socket.close()
