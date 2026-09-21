"""3082-only non-mutating check of full/slim drag previews; every drag is cancelled."""
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
    logs = subprocess.check_output(['journalctl', '--user', '-u', 'dsh-lab.service', '-n', '40', '--no-pager'], text=True)
    token = re.findall(r'3082/\?token=([^\s]+)', logs)[-1]
    failures = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 1280, 'height': 900})
        # Authenticate without putting the credential in navigation error output.
        await page.request.get('http://127.0.0.1:3082/', params={'token': token})
        await page.goto('http://127.0.0.1:3082/')
        await page.locator('.dsht3').wait_for()
        toggle = page.locator('.dsht3-settled .dsht3-stoggle')
        if await toggle.get_attribute('aria-expanded') == 'false':
            await toggle.click()
        for source_dest, target_dest in [('settled', 'active'), ('active', 'settled'), ('settled', 'settled')]:
            source = page.locator(f'section[data-drop-dest="{source_dest}"] > .dsht3-row[data-drag-id]').first
            assert await source.count(), f'Need a {source_dest} row for this non-mutating check'
            await source.scroll_into_view_if_needed()
            box = await source.bounding_box()
            await page.mouse.move(box['x'] + 40, box['y'] + min(16, box['height'] / 2))
            await page.mouse.down()
            await page.mouse.move(box['x'] + 48, box['y'] + 20, steps=4)
            try:
                header = page.locator(f'section[data-drop-dest="{target_dest}"] > .dsht3-shelf-head')
                await header.scroll_into_view_if_needed()
                box = await header.bounding_box()
                await page.mouse.move(box['x'] + 40, box['y'] + box['height'] / 2, steps=10)
                await page.wait_for_timeout(350)
                state = await page.evaluate('''dest=>{
                    const overlay=document.querySelector('.dsht3-drag-overlay');
                    const card=overlay.querySelector('.dsht3-card');
                    const title=overlay.querySelector('.dsht3-title, .dsht3-line2');
                    const slim=overlay.classList.contains('dsht3-slim');
                    const bounds=overlay.getBoundingClientRect(), text=title.getBoundingClientRect();
                    return {height:bounds.height, expected:card.getBoundingClientRect().height, variantCorrect:slim===(dest==='settled'),
                        overflow:card.scrollHeight>card.clientHeight+1 || text.bottom>bounds.bottom+1,
                        highlighted:!!document.querySelector(`section[data-drop-dest="${dest}"] > .dsht3-cross-target`)};
                }''', target_dest)
                print(source_dest + ' -> ' + target_dest, state)
                if not state['highlighted'] or not state['variantCorrect'] or state['overflow'] or abs(state['height'] - state['expected']) > 1:
                    failures.append((source_dest, target_dest, state))
                if source_dest == 'active' and target_dest == 'settled':
                    assert await page.evaluate('''()=>{
                        const top=document.querySelector('.dsht3-settled > .dsht3-shelf-head').getBoundingClientRect().top;
                        return [...document.querySelectorAll('.dsht3-active > .dsht3-row:not(.dsht3-dragging)')].every(e=>e.getBoundingClientRect().bottom<=top+1);
                    }'''), 'Settled header must not overlap non-draggable Active rows'
                    assert await page.locator('.dsht3-settled').evaluate('''s=>{
                        const more=s.querySelector('.dsht3-show-more');
                        const rows=[...s.querySelectorAll('.dsht3-row:not(.dsht3-dragging)')];
                        return !more || rows.every(e=>e.getBoundingClientRect().bottom<=more.getBoundingClientRect().top+1);
                    }'''), 'Show more must follow the translated history rows'
                if source_dest != target_dest:
                    gap = await page.locator(f'section[data-drop-dest="{target_dest}"] > .dsht3-row[data-drag-id]').first.evaluate("e=>new DOMMatrix(getComputedStyle(e).transform).m42")
                    assert abs(gap - state['height'] - (0 if target_dest == 'settled' else 8)) < 1, {'gap': gap, 'overlay': state['height']}
                await page.screenshot(path=f'.artifacts/drag-geometry-{source_dest}-to-{target_dest}.png')
                if source_dest == 'active' and target_dest == 'settled':
                    # Recompute collision geometry when history collapses/expands mid-drag.
                    for _ in range(2):
                        was_open = await toggle.get_attribute('aria-expanded')
                        await toggle.evaluate('e=>e.click()')
                        if await toggle.get_attribute('aria-expanded') == was_open:
                            await toggle.evaluate('e=>e.click()')  # Drag suppresses its first synthetic click.
                        assert await toggle.get_attribute('aria-expanded') != was_open
                        await header.scroll_into_view_if_needed()
                        box = await header.bounding_box()
                        await page.mouse.move(box['x'] + 40, box['y'] + box['height'] / 2, steps=8)
                        await page.wait_for_timeout(350)
                        assert await header.evaluate("e=>e.classList.contains('dsht3-cross-target')")
                        if await toggle.get_attribute('aria-expanded') == 'false':
                            box = await header.bounding_box()
                            pointer_y = box['y'] - 60
                            await page.mouse.move(box['x'] + 40, pointer_y, steps=8)
                            await page.wait_for_timeout(350)
                            floating = await page.locator('.dsht3-drag-overlay').bounding_box()
                            assert floating['y'] <= pointer_y <= floating['y'] + floating['height'], {'pointerY': pointer_y, 'overlay': floating}
                            assert await page.locator('.dsht3-active > .dsht3-cross-target').count() == 1, 'Whitespace above Settled belongs to Active, not the nearest shelf'
                            assert not await page.locator('.dsht3-drag-overlay').evaluate("e=>e.classList.contains('dsht3-slim')"), 'Returning into Active restores the full card'
                            await page.screenshot(path='.artifacts/drag-follows-pointer.png')
                    # The shelf's leading spacing must not blank every target.
                    box = await header.bounding_box()
                    await page.mouse.move(box['x'] + 40, box['y'] - 4, steps=4)
                    assert await page.locator('.dsht3-cross-target').count() == 1
            finally:
                await page.keyboard.press('Escape')
                await page.mouse.up()
                await page.locator('.dsht3-drag-overlay').wait_for(state='detached')
        await browser.close()
    assert not failures, failures
    print('PASS: destination highlight, full/slim height and no overflowing card content')

if __name__ == '__main__':
    asyncio.run(main())
