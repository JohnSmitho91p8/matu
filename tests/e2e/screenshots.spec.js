import { expect, test } from '@playwright/test'
import { exportPng, openApp, setBackground, setTheme, setWatermark, typeCode } from './helpers'

// 固定的示例代码，含中、日、韩注释：字体或样式被意外改动时，导出的图会变，这里的对比就会失败
const CODE = `// Fast power: a^b mod p
// 快速幂：计算 a^b mod p
// べき乗：a^b mod p を計算
// 빠른 거듭제곱: a^b mod p 계산
long long qpow(long long a, long long b, long long p) {
    long long res = 1;
    while (b) {
        if (b & 1) res = res * a % p;
        a = a * a % p;
        b >>= 1;
    }
    return res;  // 1024
}`

// 只在电脑尺寸上对比（手机上排版相同，只是倍率不同）；每个浏览器引擎各有一套基准图
test.describe('export screenshots', () => {
  test.skip(({ isMobile }) => isMobile, 'compared on desktop sizes only')
  test.beforeEach(async ({ page }) => {
    await openApp(page)
    await typeCode(page, CODE)
  })

  const THEMES = [
    ['Vitesse Dark', 'vitesse-dark'],
    ['Catppuccin Mocha', 'catppuccin-mocha'],
    ['GitHub Light', 'github-light'],
    ['Vitesse Light', 'vitesse-light'],
  ]

  for (const [name, id] of THEMES) {
    test(`theme ${name}`, async ({ page }) => {
      await setTheme(page, name)
      await page.waitForTimeout(400) // 等主题过渡动画结束
      const png = await exportPng(page)
      expect(png).toMatchSnapshot(`theme-${id}.png`, { maxDiffPixelRatio: 0.002, threshold: 0.05 })
    })
  }

  test('line highlight, signature and no background', async ({ page }) => {
    await page.evaluate(() => {
      const layer = document.querySelector('.layer')
      void layer
    })
    // 点第 6、7 行的行号
    for (const n of [6, 7]) {
      const pos = await page.evaluate((n) => {
        const line = document.querySelectorAll('.line')[n - 1].getBoundingClientRect()
        const layer = document.querySelector('.layer').getBoundingClientRect()
        return { x: layer.left + 28, y: line.top + line.height / 2 }
      }, n)
      await page.mouse.click(pos.x, pos.y)
    }
    await setWatermark(page, '@matu')
    await setBackground(page, 'No background')
    await page.mouse.move(0, 0)
    await page.waitForTimeout(400)
    const png = await exportPng(page)
    expect(png).toMatchSnapshot('highlight-signature-no-background.png', { maxDiffPixelRatio: 0.002, threshold: 0.05 })
  })
})
