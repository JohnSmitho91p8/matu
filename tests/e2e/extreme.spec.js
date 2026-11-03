import { expect, test } from '@playwright/test'
import { MAX_PIXELS_DESKTOP, MAX_PIXELS_IOS, chooseScale } from '../../src/lib/exporter'
import { cardNaturalSize, expectBelow, exportPng, isMobile, openApp, pngSize, pngStats, typeCode } from './helpers'

// 点「导出」按钮：电脑上是「Download」，手机上是顶栏的「Share」
const exportButton = (page) => page.getByRole('button', { name: isMobile(page) ? 'Share' : 'Download' })

// 导出按钮被点后，页面上应该出现的东西：电脑上是下载的文件，手机上是预览层
async function expectNothingExported(page) {
  await page.waitForTimeout(800)
  await expect(page.locator('.preview')).toHaveCount(0)
}

test.describe('nothing to export', () => {
  for (const [name, code] of [['empty', ''], ['only spaces and blank lines', '   \n\n \t \n']]) {
    test(`shows a message instead of an empty image (${name})`, async ({ page }) => {
      let downloads = 0
      page.on('download', () => downloads++)
      await openApp(page)
      await typeCode(page, code)

      await exportButton(page).click()
      await expect(page.locator('.toast')).toHaveText('There is no code to export')
      await expectNothingExported(page)

      if (isMobile(page)) {
        // 手机上顶栏的下载图标同样不会生成空图
        await page.locator('.toast').waitFor({ state: 'detached', timeout: 5000 })
        await page.getByRole('button', { name: 'Download' }).click()
        await expect(page.locator('.toast')).toHaveText('There is no code to export')
        await expectNothingExported(page)
      } else {
        await page.locator('.toast').waitFor({ state: 'detached', timeout: 5000 })
        await page.getByRole('button', { name: 'Copy image' }).click()
        await expect(page.locator('.toast')).toHaveText('There is no code to export')
      }
      expect(downloads).toBe(0)
    })
  }

  test('the message is translated', async ({ page }) => {
    await openApp(page, { storage: { 'matu:lang': 'ja' } })
    await typeCode(page, '')
    await page.locator(isMobile(page) ? '.btn-primary' : '.btn-outline').click()
    await expect(page.locator('.toast')).toHaveText('書き出すコードがありません')
  })
})

test.describe('very long lines', () => {
  const expectedScale = (page, card) =>
    chooseScale(card.width, card.height, isMobile(page) ? 3 : 2, { maxPixels: isMobile(page) ? MAX_PIXELS_IOS : MAX_PIXELS_DESKTOP })

  test('a 2000-character line is shown on one line and still exports, at a lower scale if needed', async ({ page }) => {
    await openApp(page)
    await typeCode(page, 'int x = ' + 'a'.repeat(2000) + ';')
    const row = await page.locator('.line').first().evaluate((e) => e.offsetHeight)
    expect(row).toBe(24)
    const card = await cardNaturalSize(page)
    expect(card.width).toBeGreaterThan(15_000)
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }))
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)

    const png = await exportPng(page)
    const scale = expectedScale(page, card)
    expect(scale).toBe(1) // 2 倍会超过单边上限
    expect(pngSize(png)).toEqual({ width: card.width * scale, height: card.height * scale })
    expect((await pngStats(page, png)).colorCount).toBeGreaterThan(5)
  })

  test('a line too long for any canvas gives a friendly message and no image', async ({ page }) => {
    await openApp(page)
    await typeCode(page, 'int x = ' + 'a'.repeat(5000) + ';')
    await exportButton(page).click()
    await expect(page.locator('.toast')).toHaveText('The code is too long to make an image')
    await expectNothingExported(page)
    // 页面依然可用
    await typeCode(page, 'int x = 1;')
    await expect(page.locator('.line')).toHaveCount(1)
  })
})

test.describe('very many lines', () => {
  test.setTimeout(240_000)
  const code = Array.from({ length: 1200 }, (_, i) => `    int value${i} = ${i} * 2; // line ${i}`).join('\n')

  test('1200 lines: typing stays smooth, and export either works at a lower scale or says it is too long', async ({ page }) => {
    await openApp(page)
    await typeCode(page, code)
    await expect(page.locator('.line')).toHaveCount(1200)

    // 输入流畅度：打字时每一帧之间的最长间隔
    await page.evaluate(() => {
      window.__gaps = []
      let last = performance.now()
      const loop = (now) => {
        window.__gaps.push(now - last)
        last = now
        window.__raf = requestAnimationFrame(loop)
      }
      window.__raf = requestAnimationFrame(loop)
      const el = document.querySelector('textarea')
      el.focus()
      el.setSelectionRange(10, 10)
    })
    await page.keyboard.type('hello world', { delay: 40 })
    const whileTyping = await page.evaluate(() => Math.max(...window.__gaps))
    // 停下来之后，高亮会在一次计算里补完，那一帧会长一些（只发生一次）
    await page.waitForTimeout(800)
    const overall = await page.evaluate(() => {
      cancelAnimationFrame(window.__raf)
      return Math.max(...window.__gaps)
    })
    console.log(
      `TYPING ${test.info().project.name} | 1200 lines | slowest frame while typing: ${Math.round(whileTyping)} ms, including the final highlight: ${Math.round(overall)} ms`,
    )
    expectBelow(whileTyping, 120, '1200 lines: slowest frame while typing')
    expectBelow(overall, 400, '1200 lines: slowest frame including the final highlight')

    const card = await cardNaturalSize(page)
    const iOS = isMobile(page)
    const scale = chooseScale(card.width, card.height, iOS ? 3 : 2, { maxPixels: iOS ? MAX_PIXELS_IOS : MAX_PIXELS_DESKTOP })
    if (scale === null) {
      // 手机上（iOS 的画布上限最小）放不下：提示代码太长
      await exportButton(page).click()
      await expect(page.locator('.toast')).toHaveText('The code is too long to make an image')
    } else {
      const png = await exportPng(page)
      expect(pngSize(png)).toEqual({ width: card.width * scale, height: card.height * scale })
      expect((await pngStats(page, png)).colorCount).toBeGreaterThan(20)
    }
  })
})

test.describe('unusual input and environment', () => {
  test('the Tab key inserts four spaces', async ({ page }) => {
    test.skip(isMobile(page), 'phones have no Tab key')
    await openApp(page)
    await typeCode(page, 'if (x) {\n')
    await page.locator('textarea').press('End')
    await page.keyboard.press('Control+End')
    await page.keyboard.press('Tab')
    expect(await page.locator('textarea').inputValue()).toBe('if (x) {\n    ')
  })

  test('slow or failing fonts do not block exporting forever', async ({ page }) => {
    test.setTimeout(90_000)
    // 字体文件永远不返回
    await page.route('**/*.woff2', () => {})
    await page.addInitScript(() => {
      localStorage.clear()
      localStorage.setItem('matu:lang', 'en')
    })
    // 字体一直在加载，页面的 load 事件不会触发，所以只等到 DOM 就绪
    await page.goto('./', { waitUntil: 'domcontentloaded' })
    await page.locator('.line span').first().waitFor()
    const started = Date.now()
    const png = await exportPng(page)
    const took = Date.now() - started
    console.log(`FONT TIMEOUT ${test.info().project.name} | export finished after ${took} ms with fonts that never load`)
    expect(pngSize(png).width).toBeGreaterThan(0)
    expect((await pngStats(page, png)).colorCount).toBeGreaterThan(20)
    expectBelow(took, 8000, 'export with fonts that never load')
  })
})
