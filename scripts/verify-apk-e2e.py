#!/usr/bin/env python3
"""Physical APK E2E for the T3 Android sidebar on 3082. Requires WebView CDP on :9222."""
import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright

ARTIFACTS = Path(__file__).resolve().parents[1] / '.artifacts'
CDP = 'http://127.0.0.1:9222'


async def evaluate(page, expression):
    return await page.evaluate(expression)


async def wait_shell(page):
    for _ in range(80):
        state = await evaluate(page, '''() => ({
          title: document.querySelector('[data-mobile-session-title]')?.textContent ?? null,
          frame: document.querySelector('[data-dsh-mobile-frame]') !== null,
          drawer: document.querySelector('[data-drawer-open]') !== null,
          taskbar: document.querySelector('[data-dsh-mobile-taskbar], .dsht3, .dsht3-mobile') !== null,
        })''')
        if state['frame'] or state['taskbar'] or state['title']:
            return state
        await page.wait_for_timeout(500)
    raise SystemExit('shell did not appear: ' + json.dumps(state))


async def open_drawer(page):
    opened = await evaluate(page, '''() => {
      const open = document.querySelector('[data-drawer-open]') !== null
      if (open) return true
      const button = document.querySelector('[data-mobile-topbar] button, [aria-label="打开导航菜单"]')
      if (button instanceof HTMLButtonElement) { button.click(); return 'clicked' }
      return false
    }''')
    if opened is False:
        raise SystemExit('no navigation button')
    await page.wait_for_timeout(700)


async def main():
    ARTIFACTS.mkdir(exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.connect_over_cdp(CDP)
        page = browser.contexts[0].pages[0]
        page.set_default_timeout(15000)
        boot = await wait_shell(page)
        await page.screenshot(path=str(ARTIFACTS / 'apk-e2e-boot.png'))
        await open_drawer(page)
        layout = await evaluate(page, '''() => {
          const root = document.querySelector('[data-dsh-mobile-taskbar], .dsht3-mobile, .dsht3')
          const drawer = document.querySelector('nav')
          const rect = root?.getBoundingClientRect()
          const drawerRect = drawer?.getBoundingClientRect()
          return {
            hasTaskbar: root !== null,
            mobileClass: root?.classList.contains('dsht3-mobile') ?? false,
            marker: root?.hasAttribute('data-dsh-mobile-taskbar') ?? false,
            title: document.querySelector('.dsht3-mobile-title')?.textContent ?? null,
            search: document.querySelector('[aria-label="搜索会话"], [aria-label="Search sessions"]') !== null,
            close: document.querySelector('[data-dsh-mobile-close]') !== null,
            fab: document.querySelector('.dsht3-mobile-new') !== null,
            cards: document.querySelectorAll('.dsht3-card').length,
            drawerOpen: document.querySelector('[data-drawer-open]') !== null,
            width: rect && { w: Math.round(rect.width), h: Math.round(rect.height) },
            drawerWidth: drawerRect && Math.round(drawerRect.width),
            viewport: { w: window.innerWidth, h: window.innerHeight },
          }
        }''')
        await page.screenshot(path=str(ARTIFACTS / 'apk-e2e-sidebar.png'))
        assert layout['hasTaskbar'], layout
        assert layout['mobileClass'] and layout['marker'], layout
        assert layout['close'] and layout['fab'] and layout['search'], layout
        assert layout['drawerWidth'] is not None and layout['drawerWidth'] >= layout['viewport']['w'] - 8, layout
        assert layout['cards'] >= 1, layout

        search = await evaluate(page, '''() => {
          const button = document.querySelector('.dsht3-mobile-icon[aria-label="搜索会话"], .dsht3-mobile-icon[aria-label="Search sessions"]')
          if (!(button instanceof HTMLButtonElement)) return 'missing'
          button.click()
          return 'clicked'
        }''')
        await page.wait_for_timeout(400)
        searching = await evaluate(page, '''() => ({
          input: document.querySelector('.dsht3-mobile-search input') !== null,
          closeSearch: document.querySelector('[aria-label="退出搜索"], [aria-label="Close search"]') !== null,
        })''')
        await page.screenshot(path=str(ARTIFACTS / 'apk-e2e-search.png'))
        assert search == 'clicked' and searching['input'] and searching['closeSearch'], (search, searching)
        await evaluate(page, '''() => {
          document.querySelector('[aria-label="退出搜索"], [aria-label="Close search"]')?.click()
        }''')
        await page.wait_for_timeout(300)

        nav = await evaluate(page, '''() => {
          const card = document.querySelector('[data-dsh-mobile-session-nav].dsht3-card')
          const id = card?.closest('[data-session-id]')?.dataset.sessionId ?? null
          if (card instanceof HTMLElement) card.click()
          return id
        }''')
        await page.wait_for_timeout(800)
        afterNav = await evaluate(page, '''() => ({
          drawerOpen: document.querySelector('[data-drawer-open]') !== null,
          selected: document.querySelector('.dsht3-card[aria-current="true"]')?.closest('[data-session-id]')?.dataset.sessionId ?? null,
        })''')
        await page.screenshot(path=str(ARTIFACTS / 'apk-e2e-after-open.png'))
        assert afterNav['drawerOpen'] is False, afterNav

        await open_drawer(page)
        box = await evaluate(page, '''() => {
          const row = document.querySelector('.dsht3-row:not(.dsht3-draft)[data-session-id]')
          const r = row?.getBoundingClientRect()
          return r && { x: r.x + r.width / 2, y: r.y + r.height / 2, id: row.dataset.sessionId, w: r.width, h: r.height }
        }''')
        assert box, 'no swipeable row'
        await page.touchscreen.tap(box['x'], box['y'])
        await page.wait_for_timeout(80)
        # Long-press via CDP touch: hold without move.
        cdp = await page.context.new_cdp_session(page)
        point = {'x': box['x'], 'y': box['y']}
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [point]})
        await page.wait_for_timeout(650)
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        menu = await evaluate(page, '''() => document.querySelector('[role="menu"]')?.getAttribute('aria-label') ?? null''')
        await page.screenshot(path=str(ARTIFACTS / 'apk-e2e-longpress.png'))
        assert menu in ('会话操作', 'Session actions'), menu
        await page.keyboard.press('Escape')
        await page.wait_for_timeout(200)

        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [point]})
        await page.wait_for_timeout(40)
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': point['x'] - box['w'] * 0.45, 'y': point['y']}]})
        await page.wait_for_timeout(80)
        await cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        await page.wait_for_timeout(300)
        swipe = await evaluate(page, '''() => ({
          open: document.querySelector('[data-swipe-open]')?.dataset.sessionId ?? null,
          actions: [...document.querySelectorAll('.dsht3-swipe-action')].map(el => el.getAttribute('aria-label')),
        })''')
        await page.screenshot(path=str(ARTIFACTS / 'apk-e2e-swipe.png'))
        assert swipe['open'] == box['id'] and len(swipe['actions']) >= 1, swipe

        result = {
            'boot': boot,
            'layout': layout,
            'searching': searching,
            'nav': {'opened': nav, 'drawerClosed': afterNav['drawerOpen'] is False},
            'longPress': menu,
            'swipe': swipe,
        }
        (ARTIFACTS / 'apk-e2e-result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
        print(json.dumps({'apk': 'PASS', **result}, ensure_ascii=False))


if __name__ == '__main__':
    asyncio.run(main())
