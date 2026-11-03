import { expect, test } from '@playwright/test'
import {
  cardNaturalSize,
  exportPng,
  isMobile,
  openApp,
  pngSize,
  pngStats,
  setBackground,
  setWatermark,
  typeCode,
} from './helpers'

// 电脑 2 倍，手机 3 倍
const scaleFor = (page) => (isMobile(page) ? 3 : 2)

test.describe('exporting', () => {
  test.beforeEach(async ({ page }) => openApp(page))

  test('downloads a non-empty PNG at the right resolution', async ({ page }) => {
    const png = await exportPng(page)
    const { width, height } = pngSize(png)
    const card = await cardNaturalSize(page)
    expect(width).toBe(card.width * scaleFor(page))
    expect(height).toBe(card.height * scaleFor(page))
    const stats = await pngStats(page, png)
    expect(stats.colorCount).toBeGreaterThan(50)
    expect(stats.cornerAlpha).toEqual([255, 255, 255, 255])
  })

  test('the exported size does not depend on how much the card is scaled down on screen', async ({ page }) => {
    await typeCode(page, 'int main() { return ' + '1 + '.repeat(80) + '1; }')
    await expect.poll(() => page.locator('.card').evaluate((e) => e.getBoundingClientRect().width < e.offsetWidth)).toBe(true)
    const png = await exportPng(page)
    const card = await cardNaturalSize(page)
    expect(pngSize(png).width).toBe(card.width * scaleFor(page))
  })

  test('without a background the image is just the window: no padding, no shadow, only the small rounded corners are transparent', async ({ page }) => {
    await setBackground(page, 'No background')
    const png = await exportPng(page)
    const card = await cardNaturalSize(page)
    const window = await page.locator('.window').evaluate((e) => ({
      width: e.offsetWidth,
      height: e.offsetHeight,
      radius: getComputedStyle(e).borderTopLeftRadius,
      shadow: getComputedStyle(e).boxShadow,
    }))
    // 卡片和窗口一样大；图片尺寸就是窗口尺寸
    expect(card).toEqual({ width: window.width, height: window.height })
    expect(window.radius).toBe('4px')
    expect(window.shadow).toBe('none')
    expect(pngSize(png)).toEqual({ width: card.width * scaleFor(page), height: card.height * scaleFor(page) })
    const stats = await pngStats(page, png)
    expect(stats.edgeAlpha).toEqual([255, 255, 255, 255])
    expect(stats.cornerAlpha).toEqual([0, 0, 0, 0])
  })

  test('other backgrounds keep their padding, shadow and rounded corners', async ({ page }) => {
    const window = await page.locator('.window').evaluate((e) => ({
      radius: getComputedStyle(e).borderTopLeftRadius,
      shadow: getComputedStyle(e).boxShadow,
    }))
    expect(window.radius).toBe('12px')
    expect(window.shadow).not.toBe('none')
    const png = await exportPng(page)
    const card = await cardNaturalSize(page)
    expect(pngSize(png).width).toBe(card.width * scaleFor(page))
    expect(card.width).toBeGreaterThan(await page.locator('.window').evaluate((e) => e.offsetWidth))
  })

  test('highlighted lines and the signature are part of the image', async ({ page }) => {
    await setWatermark(page, '@matu')
    const plain = await exportPng(page)
    const withMark = await exportPng(page)
    expect(withMark.length).toBeGreaterThan(0)
    expect(pngSize(withMark)).toEqual(pngSize(plain))
  })

  test('the downloaded file is named after the card title', async ({ page }) => {
    test.skip(isMobile(page), 'phones open a preview instead of downloading')
    const input = page.locator('.filename input')
    await input.fill('solution.cpp')
    await input.press('Enter')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('solution.cpp.png')
  })
})

test.describe('copy image (desktop)', () => {
  test.skip(({ isMobile }) => isMobile, 'copying is a desktop action')

  test('writes a PNG to the clipboard and shows a confirmation', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions can only be granted in Chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openApp(page)
    await page.getByRole('button', { name: 'Copy image' }).click()
    await expect(page.locator('.toast')).toHaveText('Copied. You can paste it anywhere.')
    const info = await page.evaluate(async () => {
      const items = await navigator.clipboard.read()
      const blob = await items[0].getType('image/png')
      return { types: items[0].types, size: blob.size }
    })
    expect(info.types).toContain('image/png')
    expect(info.size).toBeGreaterThan(10_000)
  })

  test('falls back to downloading when the clipboard refuses', async ({ page }) => {
    await openApp(page)
    await page.evaluate(() => {
      navigator.clipboard.write = () => Promise.reject(new Error('denied'))
    })
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      page.getByRole('button', { name: 'Copy image' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('main.cpp.png')
    await expect(page.locator('.toast')).toHaveText('Copy failed, downloading the image instead')
  })
})

test.describe('share (phone)', () => {
  test.skip(({ isMobile }) => !isMobile, 'sharing is the phone action')

  test('opens the system share sheet with the PNG', async ({ page }) => {
    await openApp(page)
    await page.evaluate(() => {
      window.__shared = null
      Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
      Object.defineProperty(navigator, 'share', {
        value: async (data) => {
          window.__shared = data.files.map((f) => ({ name: f.name, type: f.type, size: f.size }))
        },
        configurable: true,
      })
    })
    await page.getByRole('button', { name: 'Share' }).tap()
    await expect.poll(() => page.evaluate(() => window.__shared), { timeout: 30_000 }).toMatchObject([
      { name: 'main.cpp.png', type: 'image/png' },
    ])
    await expect(page.locator('.preview')).toHaveCount(0)
  })

  test('shows a preview to long-press when the system cannot share', async ({ page }) => {
    await openApp(page)
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    })
    await page.getByRole('button', { name: 'Share' }).tap()
    await expect(page.locator('.preview img')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.preview .tip')).toHaveText('Press and hold the image to save or forward')
    await page.locator('.preview .close').tap()
    await expect(page.locator('.preview')).toHaveCount(0)
  })

  test('does nothing visible when the user cancels sharing', async ({ page }) => {
    await openApp(page)
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
      Object.defineProperty(navigator, 'share', {
        value: async () => {
          const e = new Error('cancelled')
          e.name = 'AbortError'
          throw e
        },
        configurable: true,
      })
    })
    await page.getByRole('button', { name: 'Share' }).tap()
    await page.waitForTimeout(2500)
    await expect(page.locator('.preview')).toHaveCount(0)
    await expect(page.locator('.toast')).toHaveCount(0)
  })
})
