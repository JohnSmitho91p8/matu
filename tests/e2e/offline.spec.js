import { expect, test } from '@playwright/test'
import { copiedText, exportPng, openApp, typeCode, watchClipboard } from './helpers'

// 离线：打开过一次、Service Worker 就绪之后，断网也能打开页面、打开分享链接并导出（中文不缺字）。
// 只在 Chromium 电脑尺寸上跑：Service Worker 的行为各浏览器一致，这里只验证我们的缓存配置
test.describe('works offline after the first visit', () => {
  test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile, 'Chromium desktop only')
  test.setTimeout(120_000)

  // 含生僻字：它们在默认示例用不到的字体分片里，离线时必须也能取到
  const CJK_LINES = ['// 龘鬱纛爨 快速幂：计算', '// べき乗を計算 鑫', '// 빠른 거듭제곱 계산']
  const cjkCode = CJK_LINES.join('\n')
  const latinCode = cjkCode.replace(/[^\x00-\x7f]/g, 'MM')

  const inkOf = (page, png) =>
    page.evaluate(async (base64) => {
      const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob())
      const c = document.createElement('canvas')
      c.width = bmp.width
      c.height = bmp.height
      const ctx = c.getContext('2d')
      ctx.drawImage(bmp, 0, 0)
      const { data } = ctx.getImageData(0, 0, c.width, c.height)
      let ink = 0
      for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0 && data[i] > 70) ink++
      return ink
    }, png.toString('base64'))

  test('reload, a shared link with Chinese text, and export all work with the network off', async ({ page, context }) => {
    await watchClipboard(page)
    await openApp(page, { storage: { 'matu:settings': JSON.stringify({ background: 'none' }) } })
    await typeCode(page, cjkCode)
    await page.getByTestId('copy-link').click()
    await expect(page.locator('.toast > span')).toHaveText('Link copied')
    const link = await copiedText(page)

    // Service Worker 装好并激活：此时全部文件已经预缓存完
    const cached = await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      const names = await caches.keys()
      const entries = await Promise.all(names.map(async (n) => (await (await caches.open(n)).keys()).length))
      return { names, entries }
    })
    expect(cached.names.some((n) => n.includes('precache'))).toBe(true)
    expect(Math.max(...cached.entries)).toBeGreaterThan(60)

    await context.setOffline(true)
    // 确认真的断网了：没有预缓存的地址取不到
    expect(await page.evaluate(() => fetch(`./not-cached-${Date.now()}.txt`).then(() => 'online', () => 'offline'))).toBe('offline')

    // 刷新：页面仍能打开，上次的内容还在
    await page.reload()
    await page.locator('.line span').first().waitFor()
    await expect(page.locator('textarea')).toHaveValue(cjkCode)

    // 新开一页打开分享链接（一次真正的页面请求）
    const other = await context.newPage()
    await other.goto(link)
    await other.locator('.line span').first().waitFor()
    await expect(other.locator('.toast > span')).toHaveText('Opened shared code')
    await expect(other.locator('textarea')).toHaveValue(cjkCode)

    // 离线导出：中文、日文、韩文都画出来了（与同样排版的西文比墨迹量）
    await other.evaluate(() => document.fonts.ready)
    const cjkInk = await inkOf(other, await exportPng(other))
    await typeCode(other, latinCode)
    const latinInk = await inkOf(other, await exportPng(other))
    console.log(`OFFLINE INK cjk ${cjkInk} | latin reference ${latinInk}`)
    expect(cjkInk).toBeGreaterThan(latinInk * 0.6)
    await other.close()
  })
})
