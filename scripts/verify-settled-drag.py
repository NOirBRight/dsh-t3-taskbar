"""3082-only check: move one existing active/pinned session to Settled."""
import asyncio
import re
import subprocess
import socket
from playwright.async_api import async_playwright

async def main():
    for _ in range(60):
        try:
            with socket.create_connection(('127.0.0.1', 3082), timeout=1):
                break
        except OSError:
            await asyncio.sleep(1)
    logs = subprocess.check_output(['journalctl', '--user', '-u', 'dsh-lab.service', '-n', '30', '--no-pager'], text=True)
    token = re.findall(r'3082/\?token=([^\s]+)', logs)[-1]
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 1280, 'height': 900})
        await page.goto('http://127.0.0.1:3082/?token=' + token)
        await page.locator('.dsht3').wait_for()
        source = page.locator('.dsht3-active > .dsht3-row[data-drag-id], .dsht3-pinned > .dsht3-row[data-drag-id]').first
        if not await source.count():
            toggle = page.locator('.dsht3-settled .dsht3-stoggle')
            await toggle.wait_for()
            if await toggle.get_attribute('aria-expanded') == 'true':
                await toggle.click()
            await page.wait_for_function("()=>getComputedStyle(document.querySelector('.dsht3-settled .dsht3-chevron')).transform==='none'")
            await toggle.click()
            await page.wait_for_function("()=>new DOMMatrix(getComputedStyle(document.querySelector('.dsht3-settled .dsht3-chevron')).transform).m11 < -.99")
            await page.screenshot(path='.artifacts/settled-drag.png')
            print('PASS: down/up chevrons. SKIP actual drop: no active/pinned session; existing history left unchanged.')
            await browser.close()
            return
        session_id = await source.get_attribute('data-session-id')
        toggle = page.locator('.dsht3-settled .dsht3-stoggle')
        if await toggle.count() and await toggle.get_attribute('aria-expanded') == 'true':
            await toggle.click()
        await source.scroll_into_view_if_needed()
        box = await source.bounding_box()
        await page.mouse.move(box['x'] + 40, box['y'] + 20)
        await page.mouse.down()
        await page.mouse.move(box['x'] + 50, box['y'] + 30, steps=4)
        header = page.locator('.dsht3-settled > .dsht3-shelf-head')
        await header.scroll_into_view_if_needed()
        box = await header.bounding_box()
        await page.mouse.move(box['x'] + 40, box['y'] + box['height'] / 2, steps=12)
        await page.locator('.dsht3-settled > .dsht3-cross-target').wait_for()
        await page.mouse.up()
        await page.wait_for_function('id=>!document.querySelector(`.dsht3-active > [data-session-id="${id}"], .dsht3-pinned > [data-session-id="${id}"]`)', arg=session_id)
        await page.reload()
        await toggle.wait_for()
        if await toggle.get_attribute('aria-expanded') == 'false':
            assert await toggle.locator('.dsht3-chevron').evaluate("e=>getComputedStyle(e).transform==='none'")
            await toggle.click()
        await page.locator(f'.dsht3-settled [data-session-id="{session_id}"]').wait_for()
        await page.wait_for_function("()=>new DOMMatrix(getComputedStyle(document.querySelector('.dsht3-settled .dsht3-chevron')).transform).m11 < -.99")
        await page.screenshot(path='.artifacts/settled-drag.png')
        print('PASS: collapsed Settled accepts drop; persisted after reload; down/up chevrons')
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
