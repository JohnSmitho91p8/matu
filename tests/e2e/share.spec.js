import { expect, test } from '@playwright/test'
import {
  clickLineNumber,
  copiedText,
  isMobile,
  openApp,
  setBackground,
  setStartLine,
  setTheme,
  setWatermark,
  settingsFromStorage,
  typeCode,
  watchClipboard,
} from './helpers'

const UI_LANGUAGES = ['en', 'zh-CN', 'ja', 'ko']
const toast = (page) => page.locator('.toast')
// 提示的文字（不含旁边的操作按钮）
const toastText = (page) => page.locator('.toast > span')
const copyLinkButton = (page) => page.getByTestId('copy-link')

const CODE = `// 快速幂：计算 a^b mod p
int qpow(int a, int b) {
    int res = 1;
    while (b) { if (b & 1) res *= a; a *= a; b >>= 1; }
    return res; // 👍
}`

// 复制链接，返回复制到的文字
async function copyLink(page) {
  if (isMobile(page)) await copyLinkButton(page).tap()
  else await copyLinkButton(page).click()
  await expect(toast(page)).toHaveText('Link copied')
  return copiedText(page)
}

// 在同一个浏览器里模拟「对方」：一份全新的存储，署名是他自己的
async function openAsOtherPerson(page, url) {
  const other = await page.context().newPage()
  await other.addInitScript(() => {
    if (sessionStorage.getItem('matu-test-init')) return
    localStorage.clear()
    localStorage.setItem('matu:lang', 'en')
    localStorage.setItem('matu:settings', JSON.stringify({ watermarkEnabled: true, watermarkText: '@other' }))
    sessionStorage.setItem('matu-test-init', '1')
  })
  await other.goto(url)
  await other.locator('.line span').first().waitFor()
  return other
}

test.describe('share link: copy and open', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop flow; the phone layout has its own tests below')

  test.beforeEach(async ({ page }) => {
    await watchClipboard(page)
    await openApp(page)
  })

  test('the link carries code and look, not the signature, and opens the same card for someone else', async ({ page }) => {
    await typeCode(page, CODE)
    await setTheme(page, 'GitHub Light')
    await setBackground(page, 'Mint')
    await setStartLine(page, 40)
    await clickLineNumber(page, 2)
    await clickLineNumber(page, 2) // 错误
    await clickLineNumber(page, 4)
    await setWatermark(page, '@me')

    const url = await copyLink(page)
    expect(url).toContain('#s=')
    expect(url).not.toContain('qpow')

    const other = await openAsOtherPerson(page, url)
    await expect(toastText(other)).toHaveText('Opened shared code')
    await expect(other.locator('textarea')).toHaveValue(CODE)
    expect(await other.locator('.window').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(255, 255, 255)')
    expect(await other.locator('.line').first().getAttribute('data-n')).toBe('40')
    expect(await other.locator('.line').nth(1).evaluate((e) => e.classList.contains('mark-wrong'))).toBe(true)
    expect(await other.locator('.line').nth(3).evaluate((e) => e.classList.contains('mark-focus'))).toBe(true)
    const saved = await settingsFromStorage(other)
    expect(saved).toMatchObject({ theme: 'github-light', background: 'mint', startLine: 40 })
    // 署名是对方自己的，不是发送者的
    expect(saved).toMatchObject({ watermarkEnabled: true, watermarkText: '@other' })
    await expect(other.locator('.mark')).toHaveText('@other')
    await other.close()
  })

  test('the address loses #s=, and a reload keeps the shared content', async ({ page }) => {
    await typeCode(page, CODE)
    const url = await copyLink(page)
    const other = await openAsOtherPerson(page, url)
    await expect(toastText(other)).toHaveText('Opened shared code')
    expect(await other.evaluate(() => location.hash)).toBe('')
    await other.reload()
    await other.locator('.line span').first().waitFor()
    await expect(other.locator('textarea')).toHaveValue(CODE)
    await other.close()
  })

  test('opening a link in an open page replaces the code, and Undo brings everything back', async ({ page }) => {
    const mine = 'int mine = 1;'
    const link = await (async () => {
      await typeCode(page, CODE)
      await setTheme(page, 'Catppuccin Mocha')
      return copyLink(page)
    })()
    await typeCode(page, mine)
    await setTheme(page, 'Vitesse Light')
    await clickLineNumber(page, 1)

    // 同一个标签页里换成另一个链接：网址的 # 变了
    await page.evaluate((hash) => (location.hash = hash), link.slice(link.indexOf('#')))
    await expect(toastText(page)).toHaveText('Opened shared code')
    await expect(page.locator('textarea')).toHaveValue(CODE)
    expect((await settingsFromStorage(page)).theme).toBe('catppuccin-mocha')
    expect(await page.evaluate(() => location.hash)).toBe('')

    await toast(page).getByRole('button', { name: 'Undo' }).click()
    await expect(page.locator('textarea')).toHaveValue(mine)
    await expect(toast(page)).toHaveCount(0)
    expect(await settingsFromStorage(page)).toMatchObject({
      theme: 'vitesse-light',
      lineMarks: [{ line: 0, kind: 'focus' }],
    })
  })

  test('the Undo notice stays about six seconds', async ({ page }) => {
    await typeCode(page, CODE)
    const link = await copyLink(page)
    await typeCode(page, 'x')
    await page.evaluate((hash) => (location.hash = hash), link.slice(link.indexOf('#')))
    await expect(toast(page).getByRole('button', { name: 'Undo' })).toBeVisible()
    await page.waitForTimeout(4000)
    await expect(toast(page)).toBeVisible()
    await expect(toast(page)).toHaveCount(0, { timeout: 4000 })
  })

  test('a broken link says so and leaves the code alone', async ({ page }) => {
    await typeCode(page, 'int keep = 1;')
    for (const bad of ['#s=AAAA', '#s=%%%', '#s=']) {
      await page.evaluate((hash) => (location.hash = hash), bad)
      await expect(toast(page)).toHaveText("This share link can't be opened")
      await expect(page.locator('textarea')).toHaveValue('int keep = 1;')
      expect(await page.evaluate(() => location.hash)).toBe('')
      await page.waitForTimeout(2400)
    }
  })

  test('code that is too long for a link is refused and nothing is copied', async ({ page }) => {
    let seed = 5
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    const noisy = Array.from({ length: 600 }, () =>
      `int v${Math.floor(rnd() * 1e6)} = ${Math.floor(rnd() * 1e9)} + f(${Math.floor(rnd() * 1e5)}) * ${Math.floor(rnd() * 1e7)};`,
    ).join('\n')
    await typeCode(page, noisy)
    await copyLinkButton(page).click()
    await expect(toast(page)).toHaveText('The code is too long for a link, share an image instead')
    expect(await copiedText(page)).toBeUndefined()
  })

  test('with no code there is nothing to share', async ({ page }) => {
    await typeCode(page, '   ')
    await copyLinkButton(page).click()
    await expect(toast(page)).toHaveText('There is no code to share')
    expect(await copiedText(page)).toBeUndefined()
  })

  test('Cmd/Ctrl + Shift + L copies the link', async ({ page }) => {
    await typeCode(page, CODE)
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    await page.keyboard.press('ControlOrMeta+Shift+L')
    await expect(toast(page)).toHaveText('Link copied')
    expect(await copiedText(page)).toContain('#s=')
  })

  test('the link button sits left of Download and looks like it', async ({ page }) => {
    const link = await copyLinkButton(page).boundingBox()
    const download = await page.getByRole('button', { name: 'Download' }).boundingBox()
    expect(link.x + link.width).toBeLessThan(download.x)
    expect(await copyLinkButton(page).evaluate((e) => e.className)).toBe(
      await page.getByRole('button', { name: 'Download' }).evaluate((e) => e.className),
    )
  })
})

test.describe('share link on the phone', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layout')

  test('the link icon button works and the top bar still fits in every language', async ({ page }) => {
    await watchClipboard(page)
    await openApp(page)
    await typeCode(page, CODE)
    await expect(copyLinkButton(page)).toBeVisible()
    const url = await copyLink(page)
    expect(url).toContain('#s=')
  })

  test('when the clipboard fails, the system share sheet gets just the address', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          write: async () => Promise.reject(new DOMException('denied', 'NotAllowedError')),
          writeText: async () => Promise.reject(new DOMException('denied', 'NotAllowedError')),
        },
      })
      navigator.share = async (data) => {
        window.__shared = data
      }
    })
    await openApp(page)
    await typeCode(page, CODE)
    await copyLinkButton(page).tap()
    await expect.poll(() => page.evaluate(() => window.__shared?.url ?? '')).toContain('#s=')
    expect(await page.evaluate(() => Object.keys(window.__shared))).toEqual(['url'])
  })

  for (const lang of UI_LANGUAGES) {
    test(`the top bar does not overflow (${lang})`, async ({ page }) => {
      await openApp(page, { storage: { 'matu:lang': lang } })
      const box = (loc) => loc.boundingBox()
      const bar = await page.locator('.topbar').evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }))
      expect(bar.scroll).toBeLessThanOrEqual(bar.client)
      const viewport = page.viewportSize().width
      const logo = await box(page.locator('.logo'))
      const items = await page.locator('.topbar .actions > *').evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect()
          return { left: r.left, right: r.right, width: r.width, height: r.height }
        }),
      )
      expect(items.length).toBe(4) // 语言、复制链接、下载、分享
      for (const it of items) {
        expect(it.right).toBeLessThanOrEqual(viewport)
        expect(it.height).toBeGreaterThanOrEqual(44 - 1)
      }
      expect(items[0].left).toBeGreaterThan(logo.x + logo.width)
      // 相邻的项不重叠
      for (let i = 1; i < items.length; i++) expect(items[i].left).toBeGreaterThanOrEqual(items[i - 1].right - 0.5)
    })
  }
})
