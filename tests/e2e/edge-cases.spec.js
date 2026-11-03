import { expect, test } from '@playwright/test'
import {
  cardNaturalSize,
  editorValue,
  exportPng,
  isMobile,
  openApp,
  pasteCode,
  pngSize,
  pngStats,
  setTheme,
  typeCode,
} from './helpers'

const scaleFor = (page) => (isMobile(page) ? 3 : 2)

test.describe('unusual input', () => {
  test('tabs and Windows line endings are normalised when pasting', async ({ page }) => {
    await openApp(page)
    await pasteCode(page, '\r\n\r\nif (x) {\r\n\treturn 1;\r\n}\r\n\r\n')
    expect(await editorValue(page)).toBe('if (x) {\n    return 1;\n}')
    await expect(page.locator('.line')).toHaveCount(3)
  })

  test('emoji display and export without breaking the layout', async ({ page }) => {
    await openApp(page)
    await typeCode(page, '// 🎉 Done 👍 通过 ✅\nint x = 1;')
    await expect(page.locator('.line').first()).toContainText('🎉')
    // 每行仍然是一行
    const heights = await page.locator('.line').evaluateAll((els) => els.map((e) => e.offsetHeight))
    expect(new Set(heights).size).toBe(1)
    const png = await exportPng(page)
    const card = await cardNaturalSize(page)
    expect(pngSize(png).width).toBe(card.width * scaleFor(page))
    expect((await pngStats(page, png)).colorCount).toBeGreaterThan(30)
  })

  test('other scripts (Cyrillic, Arabic, Hebrew, Thai, Greek) display and export', async ({ page }) => {
    await openApp(page)
    await typeCode(page, '// Привет, мир\n// مرحبا بالعالم\n// שלום עולם\n// สวัสดี\n// Γειά σου κόσμε\nint x = 1;')
    await expect(page.locator('.line')).toHaveCount(6)
    await expect(page.locator('.line').nth(1)).toContainText('مرحبا')
    const png = await exportPng(page)
    expect((await pngStats(page, png)).colorCount).toBeGreaterThan(30)
  })

  test('a very wide line is shown on one line and the whole card shrinks to fit', async ({ page }) => {
    await openApp(page)
    await typeCode(page, 'int total = ' + Array.from({ length: 120 }, (_, i) => `value${i}`).join(' + ') + ';')
    const info = await page.evaluate(() => {
      const c = document.querySelector('.card')
      const r = c.getBoundingClientRect()
      return {
        natural: c.offsetWidth,
        shown: r.width,
        rowHeights: [...document.querySelectorAll('.line')].map((l) => l.offsetHeight),
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth,
      }
    })
    expect(info.natural).toBeGreaterThan(info.innerWidth)
    expect(info.shown).toBeLessThanOrEqual(info.innerWidth)
    expect(info.rowHeights).toEqual([24])
    expect(info.scrollWidth).toBeLessThanOrEqual(info.innerWidth)
    const png = await exportPng(page)
    expect(pngSize(png).width).toBe(info.natural * scaleFor(page))
  })

  test('a few hundred lines still render and export', async ({ page }) => {
    test.setTimeout(180_000)
    await openApp(page)
    const code = Array.from({ length: 300 }, (_, i) => `    int v${i} = ${i} * 2; // line ${i}`).join('\n')
    await typeCode(page, code)
    await expect(page.locator('.line')).toHaveCount(300)
    const png = await exportPng(page)
    const { width, height } = pngSize(png)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(300 * 20)
    expect((await pngStats(page, png)).colorCount).toBeGreaterThan(30)
  })
})

test.describe('storage problems', () => {
  test('works normally when localStorage is unavailable, it just does not remember', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await openApp(page, { noStorage: true })
    await expect(page.locator('.line')).toHaveCount(19)
    await setTheme(page, 'GitHub Light')
    await expect(page.locator('.window')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await typeCode(page, 'int a;')
    await page.reload()
    await page.locator('.line span').first().waitFor()
    // 没有保存：回到默认
    await expect(page.locator('.line')).toHaveCount(19)
    expect(errors).toEqual([])
    // 仍然能导出
    const png = await exportPng(page)
    expect(pngSize(png).width).toBeGreaterThan(0)
  })

  test('corrupted saved data does not break the page', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await openApp(page, { storage: { 'matu:settings': '{broken json' } })
    await expect(page.locator('.line')).toHaveCount(19)
    expect(errors).toEqual([])
  })
})
