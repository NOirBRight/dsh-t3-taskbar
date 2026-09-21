"""Non-destructive 3082 regression: python3 scripts/verify-lab.py.
Locks down the alpha.2 regression: sessions.open was removed; uiWorkspace navigation
and retainedBy.mainView must drive both the transcript and the selected Card.
Requires the existing local Playwright and Chrome; never prints the launch token.
"""
import asyncio
import json
import re
import subprocess
import tempfile
from pathlib import Path
from playwright.async_api import TimeoutError as PlaywrightTimeoutError, async_playwright

BASE = 'http://127.0.0.1:3082'
ARTIFACTS = Path('.scratch/t3-taskbar')
ACCEPTANCE = Path('.artifacts')

async def wait_for_lab():
    for _ in range(80):
        try:
            _, writer = await asyncio.open_connection('127.0.0.1', 3082)
            writer.close()
            await writer.wait_closed()
            return
        except OSError:
            await asyncio.sleep(.25)
    raise AssertionError('Lab listener did not start')

async def pointer_drag(page, source, target):
    await target.scroll_into_view_if_needed()
    await source.scroll_into_view_if_needed()
    source_box = await source.bounding_box()
    assert source_box
    await page.mouse.move(source_box['x'] + 40, source_box['y'] + 20)
    await page.mouse.down()
    await page.mouse.move(source_box['x'] + 52, source_box['y'] + 32, steps=4)
    assert await page.locator('.dsht3-dragging').count() == 1, {'source': source_box}
    assert await source.evaluate("e=>getComputedStyle(e).opacity==='0'"), 'Source placeholder must not leave a ghost card'
    drop_target = target.locator(':scope > .dsht3-shelf-head') if await target.evaluate("e=>e.tagName==='SECTION'") else target
    await drop_target.scroll_into_view_if_needed()
    target_box = await drop_target.bounding_box()
    assert target_box
    list_box = await page.locator('.dsht3-list').bounding_box()
    target_y = max(list_box['y'] + 4, min(list_box['y'] + list_box['height'] - 4, target_box['y'] + min(18, target_box['height'] / 2)))
    await page.mouse.move(target_box['x'] + 40, target_y, steps=8)
    assert await page.locator('.dsht3-drag-overlay').count() == 1, {'source': source_box, 'target': target_box}
    assert await page.locator('.dsht3-drop-indicator').count() == 0, 'No insertion line'
    target_dest = await target.get_attribute('data-drop-dest')
    assert await page.locator(f'section[data-drop-dest="{target_dest}"] > .dsht3-cross-target').count() == 1, 'Current destination partition must highlight'
    assert await page.locator('.dsht3-drop').count() == 0
    if await target.get_attribute('data-drag-id') and await source.get_attribute('data-drop-dest') == await target.get_attribute('data-drop-dest'):
        await page.wait_for_function("()=>[...document.querySelectorAll('.dsht3-row[data-drag-id]:not(.dsht3-dragging)')].some(e=>{const s=getComputedStyle(e);return s.transform!=='none'&&Math.abs(new DOMMatrix(s.transform).m42)>20})")
    assert await source.evaluate("e=>getComputedStyle(e).transitionDuration==='0.28s'"), 'Rows must animate rather than jump'
    source_dest, target_dest = await source.get_attribute('data-drop-dest'), await target.get_attribute('data-drop-dest')
    if {source_dest, target_dest} == {'active', 'pinned'}:
        direction = 1 if source_dest == 'active' else -1
        await page.wait_for_function("direction=>{const s=getComputedStyle(document.querySelector('.dsht3-active'));return new DOMMatrix(s.transform).m42*direction>50}", arg=direction)
        assert await page.locator('.dsht3-active').evaluate("e=>getComputedStyle(e).transitionDuration==='0.28s'"), 'Whole shelf and rows must share the transition'
    overlay = await page.locator('.dsht3-drag-overlay').bounding_box()
    assert overlay['y'] >= list_box['y'] - 1 and overlay['y'] + overlay['height'] <= list_box['y'] + list_box['height'] + 1, {'overlay': overlay, 'list': list_box}
    pinned_label = await page.locator('.dsht3-pinned > .dsht3-shelf-head').bounding_box()
    assert overlay['y'] >= max(list_box['y'], pinned_label['y'] + pinned_label['height']) - 1, 'Dragged card must remain below Pinned label'
    preview_name = 'sort-preview.png' if await source.get_attribute('data-drop-dest') == await target.get_attribute('data-drop-dest') else 'cross-shelf-preview.png'
    await page.locator('.dsht3').screenshot(path=str(ACCEPTANCE / preview_name))
    await page.mouse.up()

async def main():
    await wait_for_lab()
    logs = subprocess.check_output(['journalctl', '--user', '-u', 'dsh-lab.service', '-n', '30', '--no-pager'], text=True)
    tokens = re.findall(r'3082/\?token=([^\s]+)', logs)
    assert tokens, 'Lab launch token unavailable'
    url = BASE + '/?token=' + tokens[-1]
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
        page = await browser.new_page(viewport={'width': 1280, 'height': 900})
        page.set_default_timeout(6000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error).split('\n')[0]))
        for attempt in range(3):
            await page.goto(url, wait_until='domcontentloaded')
            try:
                await page.wait_for_selector('.dsht3-row', timeout=15000)
                break
            except PlaywrightTimeoutError:
                if attempt == 2:
                    raise
        cards = page.locator('.dsht3-row:not(.dsht3-draft) .dsht3-card')
        ids = []
        for index in (0, 1):
            card = cards.nth(index)
            row = card.locator('..')
            ids.append(await row.get_attribute('data-session-id'))
            await card.click()
            await page.wait_for_function('(id) => document.querySelector(`[data-session-id="${id}"] .dsht3-card`)?.getAttribute("aria-current") === "true"', arg=ids[-1])
        assert ids[0] != ids[1], 'Selection test needs two different sessions'
        assert await page.locator('[data-slot="main.conversation"]').count() > 0
        assert await page.locator('.dsht3-pinned > .dsht3-shelf-head, .dsht3-active > .dsht3-shelf-head').evaluate_all('es=>es.every(e=>e.getBoundingClientRect().height===0)'), 'Drag-only partition labels must not reserve space at rest'
        toolbar = page.locator('.dsht3-head')
        labels = await toolbar.locator('button,select').evaluate_all('es=>es.map(e=>e.getAttribute("aria-label"))')
        assert labels in (['Filter by workspace', 'Add workspace', 'New session'], ['Add workspace', 'New session']), labels
        workspace_filter = toolbar.get_by_role('button', name='Filter by workspace')
        if await workspace_filter.count():
            await workspace_filter.click()
            workspace_menu = page.get_by_role('dialog', name='Filter by workspace')
            await workspace_menu.wait_for()
            workspace_search = workspace_menu.get_by_role('textbox', name='Search workspaces')
            assert await workspace_search.evaluate('e=>document.activeElement===e')
            options = workspace_menu.get_by_role('option')
            assert await options.count() >= 2
            assert await options.nth(1).locator('.dsht3-ident').count() == 1
            await page.screenshot(path=str(ACCEPTANCE / 'workspace-filter.png'))
            await workspace_search.fill((await options.nth(1).locator('span').last.inner_text())[:3])
            assert await workspace_menu.get_by_role('option').count() >= 2  # All workspaces + matches
            await page.keyboard.press('Escape')
            await workspace_menu.wait_for(state='detached')
        footer = [('settings', page.locator('[data-slot="sidebar.settings"] button').first),
                  ('plugin', page.locator('.dsht3-footer-plugin').first),
                  ('remote', page.locator('.dsh-mobile-remote-footer').first)]
        positions = [(name, await control.bounding_box()) for name, control in footer]
        assert all(box for _, box in positions), positions
        assert [name for name, _ in sorted(positions, key=lambda item: item[1]['x'])] == ['settings', 'plugin', 'remote'], positions
        assert await footer[1][1].locator('svg > path').count() == 4, 'Plugin must use the official DSH pinwheel glyph'
        provider_layout = await page.locator('[data-provider-usage-panel]').evaluate('''e => ({
          width:e.getBoundingClientRect().width,
          footerWidth:e.parentElement.parentElement.getBoundingClientRect().width,
        })''')
        assert provider_layout['width'] >= provider_layout['footerWidth'] - 20, provider_layout
        footer_geometry = await page.locator('[data-provider-usage-panel]').evaluate('''provider => {
          const settings=document.querySelector('[data-slot="sidebar.settings"] button'), root=provider.closest('[class*="_root"]');
          const p=provider.getBoundingClientRect(), s=settings.getBoundingClientRect(), fade=getComputedStyle(provider.parentElement.parentElement.parentElement,'::before');
          const value=provider.querySelector('.pu-cell span').getBoundingClientRect();
          const stage=provider.querySelector('.pu-stage');
          return {gap:s.top-p.bottom,usageBottomGap:p.bottom-value.bottom,usageOverflow:stage.scrollHeight-stage.clientHeight,bottomGap:root.getBoundingClientRect().bottom-s.bottom,fade:fade.backgroundImage,fadeHeight:fade.height};
        }''')
        assert footer_geometry['gap'] <= 1 and footer_geometry['usageBottomGap'] <= 10 and footer_geometry['usageOverflow'] <= 0 and footer_geometry['bottomGap'] <= 8, footer_geometry
        assert footer_geometry['fade'] != 'none' and footer_geometry['fadeHeight'] == '20px', footer_geometry
        assert await page.locator('.dsht3-list').evaluate("e=>getComputedStyle(e).scrollbarWidth==='none' && getComputedStyle(e,'::-webkit-scrollbar').display==='none'")
        scroll_thumb = page.locator('.dsht3-scroll-thumb')
        if not await scroll_thumb.count():
            history = page.locator('.dsht3-settled .dsht3-stoggle')
            if await history.count() and await history.get_attribute('aria-expanded') == 'false':
                await history.click()
            more = page.locator('.dsht3-settled .dsht3-show-more')
            if await more.count():
                await more.click()
            await scroll_thumb.wait_for()
        assert await scroll_thumb.count() == 1 and await scroll_thumb.get_attribute('role') == 'scrollbar'
        thumb_box = await scroll_thumb.bounding_box()
        await page.mouse.move(thumb_box['x'] + 2, thumb_box['y'] + 4)
        await page.mouse.down()
        await page.mouse.move(thumb_box['x'] + 2, thumb_box['y'] + 34, steps=5)
        await page.mouse.up()
        assert await page.locator('.dsht3-list').evaluate('e=>e.scrollTop>0')
        await page.locator('.dsht3-list').evaluate('e=>e.scrollTop=0')
        runtime_marks = page.locator('.dsht3-runtime')
        if await runtime_marks.count():
            assert await runtime_marks.locator('img').count() == 0, 'Runtime marks must be unified SVGs'
            assert await runtime_marks.first.locator('svg').evaluate("e=>e.getBoundingClientRect().width===12 && e.getBoundingClientRect().height===12")
        await footer[1][1].click()
        await page.get_by_text('Add and manage plugins', exact=True).wait_for()
        assert await page.get_by_role('dialog').count() == 0, 'Plugins must not open Settings'
        await toolbar.get_by_role('button', name='Add workspace').click()
        directory = page.get_by_role('dialog')
        await directory.get_by_text('Select Workspace Directory', exact=True).wait_for()
        await directory.get_by_role('button', name='Cancel', exact=True).click()
        drafts = page.locator('.dsht3-block .dsht3-draft')
        created_draft = await drafts.count() == 0
        if created_draft:
            await toolbar.get_by_role('button', name='New session').click()
            editor = page.locator('[contenteditable="true"][role="textbox"]')
            await editor.fill('Taskbar unsent draft check')
            await drafts.first.wait_for()
        draft = drafts.first
        draft_id = await draft.get_attribute('data-session-id')
        assert await draft.evaluate("e=>getComputedStyle(e.closest('.dsht3-block')).borderBottomStyle!=='none'")
        await draft.hover()
        await page.wait_for_timeout(200)
        close = draft.get_by_role('button', name='Discard draft')
        assert await close.evaluate("e=>getComputedStyle(e).opacity==='1'")
        await page.screenshot(path=str(ACCEPTANCE / 'unsent-draft.png'))
        if created_draft:
            await close.click()
            await page.locator(f'.dsht3-draft[data-session-id="{draft_id}"]').wait_for(state='detached')
            assert (await page.locator('[contenteditable="true"][role="textbox"]').inner_text()).strip() == ''
        started_card = page.locator('.dsht3-row:has(.dsht3-card-actions) .dsht3-card').first
        await started_card.click()
        editor = page.locator('[contenteditable="true"][role="textbox"]')
        if (await editor.inner_text()).strip() == '':
            active_id = await started_card.locator('xpath=ancestor::*[@data-session-id][1]').get_attribute('data-session-id')
            await editor.fill('Taskbar active draft check')
            active_draft = page.locator(f'.dsht3-has-draft[data-session-id="{active_id}"]')
            await active_draft.wait_for()
            await active_draft.hover()
            await page.wait_for_timeout(200)
            assert not await active_draft.get_by_role('button', name='Settle', exact=True).is_disabled()
            active_discard = active_draft.get_by_role('button', name='Discard draft', exact=True)
            assert await active_discard.locator('svg').evaluate("e=>getComputedStyle(e).width==='12px'")
            await page.screenshot(path=str(ACCEPTANCE / 'active-draft.png'))
            await active_discard.click()
            await active_draft.wait_for(state='detached')
            assert (await editor.inner_text()).strip() == ''
        settled_section = page.locator('.dsht3-settled')
        if await settled_section.count():
            toggle = settled_section.locator('.dsht3-stoggle')
            if await toggle.count() and await toggle.get_attribute('aria-expanded') == 'false':
                await toggle.click()
            settled_row = settled_section.locator('.dsht3-row').first
            if await settled_row.count():
                settled_time = (await settled_row.locator('.dsht3-status-slot > .dsht3-meta').inner_text()).strip()
                assert re.fullmatch(r'(now|\d+(?:min|h|d|mo|y))', settled_time), settled_time
                assert await settled_row.evaluate('''e => { const c=e.querySelector('.dsht3-card').getBoundingClientRect(), s=e.querySelector('.dsht3-status-slot').getBoundingClientRect(); return Math.abs(c.right-s.right) <= 9 }''')
        await cards.first.click()
        actions = page.locator('.dsht3-card-actions').first
        row = actions.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," dsht3-row ")][1]')
        await row.hover()
        await page.wait_for_timeout(200)
        action_labels = await actions.locator('button').evaluate_all('es=>es.map(e=>e.getAttribute("aria-label"))')
        expected_actions = ['Unpin'] if await row.locator('xpath=parent::section[contains(@class,"dsht3-pinned")]').count() else []
        assert action_labels == expected_actions + ['Snooze', 'Settle', 'More actions'], action_labels
        geometry = await row.evaluate('''e => {
            const actions=e.querySelector('.dsht3-card-actions'), meta=e.querySelector('.dsht3-status-slot > .dsht3-meta'), c=e.querySelector('.dsht3-card');
            const a=actions.getBoundingClientRect(), m=meta.getBoundingClientRect();
            return {actionsOnTime:Math.abs((a.y+a.height/2)-(m.y+m.height/2))<8,
              actionsVisible:getComputedStyle(actions).opacity==='1', rightPadding:parseFloat(getComputedStyle(c).paddingRight),
              gap:parseFloat(getComputedStyle(e).marginBottom)};
        }''')
        assert geometry['actionsOnTime'] and geometry['actionsVisible'], geometry
        assert geometry['rightPadding'] <= 10 and geometry['gap'] >= 8, geometry
        await actions.get_by_role('button', name='Snooze').hover()
        await page.wait_for_timeout(150)
        tooltip = actions.get_by_role('tooltip').filter(has_text=re.compile('^Snooze$'))
        tooltip_box = await tooltip.bounding_box()
        assert await tooltip.evaluate("e=>getComputedStyle(e).visibility==='visible'"), 'Hover tooltip must be visible'
        assert tooltip_box and tooltip_box['x'] >= 0 and tooltip_box['y'] >= 0, tooltip_box
        selected_before = await page.locator('.dsht3-card[aria-current="true"]').locator('xpath=ancestor::*[@data-session-id][1]').get_attribute('data-session-id')
        await actions.get_by_role('button', name='More actions').focus()
        await page.keyboard.press('Enter')
        menu = page.get_by_role('menu', name='Session actions')
        selected_after = await page.locator('.dsht3-card[aria-current="true"]').locator('xpath=ancestor::*[@data-session-id][1]').get_attribute('data-session-id')
        assert selected_after == selected_before, 'Keyboard action must not activate the parent Card'
        box = await menu.bounding_box()
        assert box and box['x'] >= 0 and box['y'] >= 0 and box['y']+box['height'] <= 900, box
        await page.keyboard.press('Escape')
        await menu.wait_for(state='detached')
        assert await page.evaluate("()=>document.activeElement?.getAttribute('aria-label')==='More actions'")
        active_rows = page.locator('section[data-drop-dest="active"] > .dsht3-row[data-drag-id]:not(.dsht3-slim)')
        if await active_rows.count() >= 2:
            original = await active_rows.evaluate_all('es=>es.slice(0,2).map(e=>e.dataset.sessionId)')
            await pointer_drag(page, page.locator(f'.dsht3-row[data-session-id="{original[1]}"]'), page.locator(f'.dsht3-row[data-session-id="{original[0]}"]'))
            await page.wait_for_function("ids=>{const s=document.querySelector(`section[data-drop-dest=active] > [data-session-id='${ids[1]}']`),t=document.querySelector(`section[data-drop-dest=active] > [data-session-id='${ids[0]}']`);return s&&t&&Boolean(s.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING)}", arg=original)
            await pointer_drag(page, page.locator(f'.dsht3-row[data-session-id="{original[0]}"]'), page.locator(f'.dsht3-row[data-session-id="{original[1]}"]'))
            await page.wait_for_function("ids=>{const s=document.querySelector(`section[data-drop-dest=active] > [data-session-id='${ids[0]}']`),t=document.querySelector(`section[data-drop-dest=active] > [data-session-id='${ids[1]}']`);return s&&t&&Boolean(s.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING)}", arg=original)
            source = page.locator(f'.dsht3-row[data-session-id="{original[0]}"]')
            pinned_drop = page.locator('section.dsht3-pinned[data-drop-dest="pinned"]')
            await pointer_drag(page, source, pinned_drop)
            pinned_row = page.locator(f'section.dsht3-pinned > [data-session-id="{original[0]}"]')
            await pinned_row.wait_for()
            await pinned_row.hover()
            await page.wait_for_timeout(200)
            assert await pinned_row.get_by_role('button', name='Unpin', exact=True).is_visible()
            await page.screenshot(path=str(ACCEPTANCE / 'pinned-unpin.png'))
            await pinned_row.locator('.dsht3-card').click()
            await page.wait_for_function("id=>document.querySelector(`[data-session-id='${id}'] .dsht3-card`)?.getAttribute('aria-current')==='true'", arg=original[0])
            selected_before_unpin = await page.locator('.dsht3-card[aria-current="true"]').first.locator('..').get_attribute('data-session-id')
            await pinned_row.get_by_role('button', name='Unpin', exact=True).click()
            await page.locator(f'section[data-drop-dest="active"] > [data-session-id="{original[0]}"]').wait_for()
            assert await page.locator('.dsht3-card[aria-current="true"]').first.locator('..').get_attribute('data-session-id') == selected_before_unpin
            await pointer_drag(page, page.locator(f'.dsht3-row[data-session-id="{original[0]}"]'), pinned_drop)
            await pinned_row.wait_for()
            await pointer_drag(page, pinned_row, page.locator(f'section[data-drop-dest="active"] > [data-session-id="{original[1]}"]'))
            await page.locator(f'section[data-drop-dest="active"] > [data-session-id="{original[0]}"]').wait_for()
        # Escape must cancel without persisting the preview order.
        cancel_source = active_rows.first
        await cancel_source.scroll_into_view_if_needed()
        cancel_order = await active_rows.evaluate_all('es=>es.map(e=>e.dataset.sessionId)')
        cancel_box = await cancel_source.bounding_box()
        await page.mouse.move(cancel_box['x'] + 40, cancel_box['y'] + 20)
        await page.mouse.down()
        await page.mouse.move(cancel_box['x'] + 50, cancel_box['y'] + 34, steps=4)
        await page.locator('.dsht3-drag-overlay').wait_for()
        await page.keyboard.press('Escape')
        await page.locator('.dsht3-drag-overlay').wait_for(state='detached')
        await page.mouse.up()
        assert await active_rows.evaluate_all('es=>es.map(e=>e.dataset.sessionId)') == cancel_order
        shelf_order = await page.evaluate("()=>Object.fromEntries(['pinned','active'].map(dest=>[dest,[...document.querySelectorAll(`section[data-drop-dest='${dest}'] > [data-session-id]`)].map(e=>e.dataset.sessionId)]))")
        await page.reload(wait_until='domcontentloaded')
        await page.wait_for_function("expected=>['pinned','active'].every(dest=>JSON.stringify([...document.querySelectorAll(`section[data-drop-dest='${dest}'] > [data-session-id]`)].map(e=>e.dataset.sessionId))===JSON.stringify(expected[dest]))", arg=shelf_order)
        await page.mouse.move(700, 400)
        remote = page.locator('.dsh-mobile-remote-footer').first
        await remote.click()
        await page.locator('.dsh-mobile-remote-popover[role="dialog"]').wait_for()
        await page.keyboard.press('Escape')
        await page.evaluate('''() => {
          document.documentElement.dataset.dshSurface='mobile';
          document.documentElement.setAttribute('data-mobile-device-menu','ready');
          window.__taskbarDeviceMenu=0;
          document.addEventListener('dsh-mobile:open-device-menu', event => { window.__taskbarDeviceMenu += 1; event.preventDefault() }, { once:true });
        }''')
        await remote.click()
        assert await page.evaluate('window.__taskbarDeviceMenu') == 1
        assert await page.locator('.dsh-mobile-remote-popover').count() == 0, 'Mobile Remote must delegate to the App Shell'
        await page.evaluate("document.documentElement.dataset.dshSurface='web';document.documentElement.removeAttribute('data-mobile-device-menu')")
        await page.locator('[data-slot="sidebar.settings"] button').first.click()
        await page.get_by_text('Taskbar', exact=True).click()
        settings = page.locator('.dsht3-settings')
        assert await settings.locator('input').count() == 3
        await settings.get_by_role('button', name='Preview').click()
        await settings.locator('output').wait_for()
        await page.screenshot(path=str(ACCEPTANCE / 'autosettle-settings.png'))
        await page.keyboard.press('Escape')
        await page.screenshot(path=str(ARTIFACTS / 'revised-3082.png'))
        assert not errors, errors
        print(json.dumps({'desktop':'PASS', 'sessionSwitches':2, 'toolbar':labels, 'footer':['Settings','Plugin','Remote'], 'hoverActions':action_labels, 'geometry':geometry, 'remote':'web popover + mobile delegation'}))

        # Exercise the real Host probe, not injected browser marks. No session data is changed.
        with tempfile.TemporaryDirectory(prefix='taskbar-git-', dir=Path.home()/'.dsh-lab/tmp') as temp:
            repo, linked = Path(temp)/'repo', Path(temp)/'linked'
            def git(*args):
                subprocess.run(['git', *map(str, args)], check=True, capture_output=True)
            git('init', '-b', 'main', repo)
            git('-C', repo, '-c', 'user.name=Taskbar check', '-c', 'user.email=check@example.invalid', 'commit', '--allow-empty', '-m', 'check')
            git('-C', repo, 'worktree', 'add', '-b', 'linked-check', linked)
            result = await page.evaluate('''async paths => {
                const response = await fetch('/t3-taskbar/git/probe', {method:'POST',headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({type:'client-request',rpcId:crypto.randomUUID(),method:'git/probe',payload:{paths}})});
                return response.json();
            }''', [str(repo), str(linked), str(Path.home()/'Workstation')])
            assert result['result']['ok'], result
            marks = result['result']['value']
            assert marks[str(repo)]['branch'] == 'main', marks
            assert 'worktree' not in marks[str(repo)], marks
            assert marks[str(linked)] == {'branch':'linked-check','worktree':'true'}, marks
            assert str(Path.home()/'Workstation') not in marks, marks
            print(json.dumps({'git':'PASS', 'mainBranch':True, 'linkedWorktree':True, 'nonRepositoryHidden':True}))

        mobile = await browser.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        mobile.set_default_timeout(6000)
        await mobile.goto(url, wait_until='domcontentloaded')
        await mobile.get_by_role('button', name='Open sidebar', exact=True).click()
        await mobile.wait_for_selector('.dsht3-row', timeout=15000)
        row = mobile.locator('.dsht3-row:not(.dsht3-draft):has(.dsht3-card-actions)').first
        await row.scroll_into_view_if_needed()
        assert await row.locator('.dsht3-card-actions').evaluate("e=>getComputedStyle(e).display==='none'"), 'Touch must use long press, not hover actions'
        before = await mobile.locator('.dsht3-card[aria-current="true"]').evaluate_all('es=>es.map(e=>e.parentElement.dataset.sessionId)')
        box = await row.bounding_box()
        cdp = await mobile.context.new_cdp_session(mobile)
        point = {'x':box['x']+box['width']/2, 'y':box['y']+box['height']/2}
        await cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[point]})
        await mobile.wait_for_timeout(650)
        await cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        await mobile.get_by_role('menu', name='Session actions').wait_for()
        assert await mobile.locator('.dsht3-card[aria-current="true"]').evaluate_all('es=>es.map(e=>e.parentElement.dataset.sessionId)') == before, 'Long press must not open conversation'
        await mobile.screenshot(path=str(ARTIFACTS / 'revised-3082-mobile.png'))
        await mobile.keyboard.press('Escape')
        target_id = await row.get_attribute('data-session-id')
        await row.tap()
        await mobile.wait_for_function('(id)=>document.querySelector(`[data-session-id="${id}"] .dsht3-card`)?.getAttribute("aria-current")==="true"', arg=target_id)
        await cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[point]})
        await cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{**point,'y':point['y']+40}]})
        await mobile.wait_for_timeout(650)
        await cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        assert await mobile.get_by_role('menu', name='Session actions').count() == 0, 'Scrolling cancels long press'
        print(json.dumps({'mobile':'PASS', 'longPress':'menu without navigation', 'tap':'selects session'}))
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
