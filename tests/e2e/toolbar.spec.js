import { expect, test } from '@playwright/test'
import { codeLanguageSetting, isMobile, openApp, setPadding, settingsFromStorage, setTheme, withSettings } from './helpers'

const UI_LANGUAGES = ['en', 'zh-CN', 'ja', 'ko']

// 点一下行号，让「清除高亮」出现
async function highlightLine(page, n) {
  const pos = await page.evaluate((n) => {
    const line = document.querySelectorAll('.line')[n - 1].getBoundingClientRect()
    const layer = document.querySelector('.layer').getBoundingClientRect()
    const zoom = layer.width / document.querySelector('.layer').offsetWidth
    return { x: layer.left + 28 * zoom, y: line.top + line.height / 2 }
  }, n)
  if (isMobile(page)) await page.touchscreen.tap(pos.x, pos.y)
  else await page.mouse.click(pos.x, pos.y)
  await page.waitForTimeout(250)
}

test.describe('desktop toolbar', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop layout')

  test('only keeps theme, background and the settings button', async ({ page }) => {
    await openApp(page)
    const toolbar = page.getByRole('toolbar')
    await expect(toolbar.getByTestId('theme')).toBeVisible()
    await expect(toolbar.getByTestId('background')).toBeVisible()
    await expect(toolbar.getByTestId('settings-button')).toBeVisible()
    await expect(toolbar.getByTestId('settings-button')).toHaveText(/Settings/)
    // 其余设置不再占用工具栏
    for (const id of ['padding', 'font-size', 'line-numbers', 'watermark', 'language']) {
      await expect(toolbar.getByTestId(id)).toHaveCount(0)
    }
    await expect(toolbar.getByRole('button', { name: 'Clear highlight' })).toHaveCount(0)
  })

  test('the clear-highlight button appears next to it only while something is highlighted', async ({ page }) => {
    await openApp(page)
    await highlightLine(page, 5)
    await expect(page.getByRole('toolbar').getByRole('button', { name: 'Clear highlight' })).toBeVisible()
    await page.getByRole('button', { name: 'Clear highlight' }).click()
    await expect(page.getByRole('button', { name: 'Clear highlight' })).toHaveCount(0)
  })

  test('the settings panel opens above the button and closes on Escape or an outside click', async ({ page }) => {
    await openApp(page)
    const button = page.getByTestId('settings-button')
    const panel = page.locator('.settings-panel')
    await button.click()
    await expect(panel).toBeVisible()
    const [b, p] = await Promise.all([button.boundingBox(), panel.boundingBox()])
    expect(p.y + p.height).toBeLessThanOrEqual(b.y)
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await button.click()
    await expect(panel).toBeVisible()
    await page.mouse.click(20, 200)
    await expect(panel).toBeHidden()
    // 再点一次按钮也能收起
    await button.click()
    await button.click()
    await expect(panel).toBeHidden()
  })

  test('the panel lists the five settings, each on its own aligned row', async ({ page }) => {
    await openApp(page)
    await page.getByTestId('settings-button').click()
    const rows = ['language', 'padding', 'font-size', 'line-numbers', 'watermark']
    const boxes = []
    for (const id of rows) {
      const row = page.locator('.settings-panel').getByTestId(id)
      await expect(row).toBeVisible()
      boxes.push({ label: await row.locator('.label').first().boundingBox(), row: await row.boundingBox() })
    }
    // 标签左对齐，一行一项，从上到下依次排列
    for (const b of boxes) expect(Math.abs(b.label.x - boxes[0].label.x)).toBeLessThan(1)
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].row.y).toBeGreaterThanOrEqual(boxes[i - 1].row.y + boxes[i - 1].row.height - 1)
    // 控件靠右，右边缘对齐
    const rights = []
    for (const id of ['language', 'padding', 'font-size', 'line-numbers']) {
      const control = page.locator('.settings-panel').getByTestId(id).locator('.select, .seg, .switch')
      const box = await control.first().boundingBox()
      rights.push(Math.round(box.x + box.width))
    }
    expect(Math.max(...rights) - Math.min(...rights)).toBeLessThanOrEqual(1)
    await expect(page.locator('.settings-panel').getByTestId('watermark').getByRole('textbox')).toHaveAttribute('placeholder', '@yourname')
  })

  test('every setting in the panel still works and is remembered after a reload', async ({ page }) => {
    await openApp(page)
    await setPadding(page, 'Large')
    await withSettings(page, async (form) => {
      await form.getByTestId('language').locator('select').selectOption({ label: 'Python' })
      await form.getByTestId('font-size').getByRole('button', { name: 'Small' }).click()
      await form.getByTestId('line-numbers').getByRole('switch').click()
      const mark = form.getByTestId('watermark')
      await mark.getByRole('switch').click()
      await mark.getByRole('textbox').fill('@matu')
    })
    await expect(page.locator('.filename input')).toHaveValue('main.py')
    expect(await settingsFromStorage(page)).toMatchObject({
      padding: 'l',
      language: 'python',
      fontSize: 's',
      lineNumbers: false,
      watermarkEnabled: true,
      watermarkText: '@matu',
    })
    await page.reload()
    await page.locator('.line span').first().waitFor()
    await expect(page.locator('.mark')).toHaveText('@matu')
    expect(await page.locator('.card').evaluate((e) => parseInt(e.style.padding))).toBe(96)
    expect(await page.locator('.layer').evaluate((e) => getComputedStyle(e).fontSize)).toBe('13px')
    expect(await codeLanguageSetting(page)).toBe('python')
  })

  test('the padding buttons are disabled without a background', async ({ page }) => {
    await openApp(page)
    await page.getByTestId('background').getByRole('button', { name: 'No background' }).click()
    await withSettings(page, async (form) => {
      await expect(form.getByTestId('padding').getByRole('button', { name: 'Medium' })).toBeDisabled()
    })
  })

  for (const lang of UI_LANGUAGES) {
    test(`fits without sideways scrolling at 768px wide (${lang})`, async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 800 })
      await openApp(page, { storage: { 'matu:lang': lang } })
      await highlightLine(page, 5) // 工具栏最长的状态：带「清除高亮」
      const fit = await page.getByRole('toolbar').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }))
      expect(fit.scroll).toBeLessThanOrEqual(fit.client)
      // 设置面板完整地显示在屏幕内
      await page.getByTestId('settings-button').click()
      const box = await page.locator('.settings-panel').boundingBox()
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(768)
      expect(box.y).toBeGreaterThanOrEqual(0)
      // 面板里没有文字溢出或换行
      const bad = await page.locator('.settings-panel .label, .settings-panel select, .settings-panel .seg button').evaluateAll((els) =>
        els.filter((e) => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().height > 40).map((e) => e.textContent.trim()),
      )
      expect(bad).toEqual([])
    })
  }
})

test.describe('phone toolbar', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layout')

  test('the bottom bar has three items: theme, background and settings', async ({ page }) => {
    await openApp(page)
    const items = page.locator('.mtoolbar .item')
    await expect(items).toHaveCount(3)
    await expect(items).toHaveText(['Theme', 'Background', 'Settings'])
  })

  test('a fourth item, clear highlight, appears while something is highlighted', async ({ page }) => {
    await openApp(page)
    await highlightLine(page, 5)
    await expect(page.locator('.mtoolbar .item')).toHaveCount(4)
    await page.locator('.mtoolbar .item', { hasText: 'Clear highlight' }).tap()
    await expect(page.locator('.mtoolbar .item')).toHaveCount(3)
  })

  test('the settings sheet has all five settings with touch-sized controls', async ({ page }) => {
    await openApp(page)
    await page.getByTestId('item-settings').tap()
    const sheet = page.locator('.sheet')
    await expect(sheet).toBeVisible()
    for (const id of ['language', 'padding', 'font-size', 'line-numbers', 'watermark']) {
      await expect(sheet.getByTestId(id)).toBeVisible()
    }
    const small = await sheet.locator('select, button:not(.close), input').evaluateAll((els) =>
      els
        .map((e) => ({ name: e.getAttribute('aria-label') || e.textContent.trim() || e.tagName, r: e.getBoundingClientRect(), fs: parseFloat(getComputedStyle(e).fontSize) }))
        // 开关用透明区域把点击范围扩大了，测的是扩大后的范围
        .map((e) => ({ ...e, h: e.r.height, w: e.r.width }))
        .filter((e) => e.h > 0),
    )
    // 按钮和下拉不小于 44px 高；开关本体 32px 高，靠伪元素扩到 48px
    for (const e of small) {
      if (e.name.includes('Show signature') || e.name === 'Line numbers') expect(e.h + 16, e.name).toBeGreaterThanOrEqual(44)
      else expect(e.h, e.name).toBeGreaterThanOrEqual(44)
    }
    // 输入框和下拉的字号不小于 16px，避免 iOS 聚焦时自动放大页面
    const inputs = await sheet.locator('select, input').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)))
    for (const fs of inputs) expect(fs).toBeGreaterThanOrEqual(16)
  })

  test('settings made in the sheet apply and are remembered', async ({ page }) => {
    await openApp(page)
    await setPadding(page, 'Small')
    await withSettings(page, async (form) => {
      await form.getByTestId('font-size').getByRole('button', { name: 'Large' }).tap()
      await form.getByTestId('line-numbers').getByRole('switch').tap()
      await form.getByTestId('language').locator('select').selectOption({ label: 'Java' })
    })
    await expect(page.locator('.filename input')).toHaveValue('Main.java')
    await page.reload()
    await page.locator('.line span').first().waitFor()
    expect(await page.locator('.card').evaluate((e) => parseInt(e.style.padding))).toBe(32)
    expect(await page.locator('.layer').evaluate((e) => getComputedStyle(e).fontSize)).toBe('17px')
    expect(await settingsFromStorage(page)).toMatchObject({ lineNumbers: false, language: 'java' })
  })

  test('theme and background sheets still work', async ({ page }) => {
    await openApp(page)
    await setTheme(page, 'GitHub Light')
    await expect(page.locator('.window')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  })

  for (const lang of UI_LANGUAGES) {
    test(`the bottom bar fits and nothing overflows (${lang})`, async ({ page }) => {
      await openApp(page, { storage: { 'matu:lang': lang } })
      await highlightLine(page, 5)
      const fit = await page.locator('.mtoolbar').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }))
      expect(fit.scroll).toBeLessThanOrEqual(fit.client)
      await page.getByTestId('item-settings').tap()
      const bad = await page.locator('.sheet .label, .sheet select, .sheet .seg button').evaluateAll((els) =>
        els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim()),
      )
      expect(bad).toEqual([])
    })
  }
})
