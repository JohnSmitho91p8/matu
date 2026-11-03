import { expect } from '@playwright/test'

// 手机布局：屏幕宽度不超过 640px
export const isMobile = (page) => page.viewportSize().width <= 640

// 固定用英文界面，并且每次都从干净的存储开始
export async function openApp(page, { storage = {}, noStorage = false } = {}) {
  if (noStorage) {
    // 模拟无痕模式、被禁用存储：任何访问 localStorage 都会抛出异常
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('The operation is insecure.', 'SecurityError')
        },
      })
    })
  } else {
    await page.addInitScript((extra) => {
      if (!sessionStorage.getItem('matu-test-init')) {
        localStorage.clear()
        localStorage.setItem('matu:lang', 'en')
        for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v)
        sessionStorage.setItem('matu-test-init', '1')
      }
    }, storage)
  }
  await page.goto('./')
  await page.locator('.line span').first().waitFor()
  await waitForHighlight(page)
  await page.evaluate(() => document.fonts.ready)
}

// 高亮是异步的（先显示纯文字，Shiki 加载好、防抖结束后再上色）：等颜色出现；代码里没有可上色的内容时不会卡住
export async function waitForHighlight(page) {
  await page
    .waitForFunction(() => document.querySelectorAll('.line span[style*="color"]').length > 0, null, { timeout: 5000 })
    .catch(() => {})
  await page.waitForTimeout(100)
}

export const settingsFromStorage = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('matu:settings') || '{}'))

// ---- 工具栏操作：电脑和手机的界面不同，这里统一成一套接口 ----
// （工具栏改版时只需要改这个文件）

async function withSheet(page, itemName, action) {
  await page.locator('.mtoolbar .item', { hasText: itemName }).click()
  const sheet = page.locator('.sheet')
  await expect(sheet).toBeVisible()
  await action(sheet)
  await page.locator('.sheet-root .backdrop').click({ position: { x: 10, y: 10 } })
  await expect(sheet).toBeHidden()
}

export async function setTheme(page, name) {
  if (isMobile(page)) return withSheet(page, 'Theme', (s) => s.getByRole('button', { name }).click())
  await page.locator('[data-testid=theme]').getByRole('button', { name }).click()
}

export async function setBackground(page, name) {
  if (isMobile(page)) return withSheet(page, 'Background', (s) => s.getByRole('button', { name }).click())
  await page.locator('[data-testid=background]').getByRole('button', { name }).click()
}

export async function setPadding(page, size) {
  if (isMobile(page)) return withSheet(page, 'Padding', (s) => s.getByRole('button', { name: size }).click())
  await page.locator('[data-testid=padding]').getByRole('button', { name: size }).click()
}

export async function setFontSize(page, size) {
  if (isMobile(page)) return withSheet(page, 'Font size', (s) => s.getByRole('button', { name: size }).click())
  await page.locator('[data-testid=font-size]').getByRole('button', { name: size }).click()
}

export async function toggleLineNumbers(page) {
  if (isMobile(page)) return withSheet(page, 'Line numbers', (s) => s.getByRole('switch').click())
  await page.locator('[data-testid=line-numbers]').getByRole('switch').click()
}

export async function setWatermark(page, text) {
  if (isMobile(page)) {
    return withSheet(page, 'Signature', async (s) => {
      const toggle = s.getByRole('switch')
      if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click()
      await s.getByRole('textbox').fill(text)
    })
  }
  await page.locator('[data-testid=watermark]').getByRole('button').click()
  const panel = page.locator('.watermark-panel')
  const toggle = panel.getByRole('switch')
  if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click()
  await panel.getByRole('textbox').fill(text)
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
}

// name: 'Auto' 或语言名，如 'Python'
export async function setCodeLanguage(page, name) {
  if (isMobile(page)) {
    const re = name === 'Auto' ? /^Auto/ : new RegExp(`^${name.replace(/[+]/g, '\\$&')}$`)
    return withSheet(page, 'Language', (s) => s.getByRole('button', { name: re }).click())
  }
  await page.locator('[data-testid=language]').getByRole('button').click()
  await page.getByRole('option', { name, exact: true }).click()
}

export const codeLanguageLabel = (page) =>
  isMobile(page)
    ? Promise.resolve(null)
    : page.locator('[data-testid=language] button').innerText()

// ---- 代码输入 ----

// 直接设置编辑框内容（等同于用户输入，不经过粘贴处理）
export async function typeCode(page, code) {
  const ta = page.locator('textarea')
  await ta.fill(code)
  await page.waitForTimeout(150)
  await waitForHighlight(page)
}

// 模拟粘贴：经过和真实粘贴一样的处理（去首尾空行、制表符转空格等）
export async function pasteCode(page, code, { replaceAll = true } = {}) {
  await page.evaluate(
    ({ code, replaceAll }) => {
      const el = document.querySelector('textarea')
      el.focus()
      if (replaceAll) el.select()
      const dt = new DataTransfer()
      dt.setData('text/plain', code)
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
    },
    { code, replaceAll },
  )
  await page.waitForTimeout(250)
}

export const editorValue = (page) => page.locator('textarea').inputValue()

// ---- 导出 ----

// 点「下载」（手机上是预览层里的图片），返回 PNG 的二进制内容
export async function exportPng(page) {
  if (isMobile(page)) {
    await page.getByRole('button', { name: 'Download' }).tap()
    const img = page.locator('.preview img')
    await expect(img).toBeVisible({ timeout: 30_000 })
    const bytes = await img.evaluate(async (el) => {
      const res = await fetch(el.src)
      return Array.from(new Uint8Array(await res.arrayBuffer()))
    })
    await page.locator('.preview .close').tap()
    return Buffer.from(bytes)
  }
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  const stream = await download.createReadStream()
  const chunks = []
  for await (const c of stream) chunks.push(c)
  return Buffer.concat(chunks)
}

export function pngSize(buf) {
  // PNG 文件头：8 字节签名 + IHDR（宽、高各 4 字节）
  expect(buf.subarray(1, 4).toString()).toBe('PNG')
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

// 判断图片是否非空：解码后看有没有多种颜色（用页面里的 canvas 解码）
export async function pngStats(page, buf) {
  return page.evaluate(async (bytes) => {
    const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }))
    const c = document.createElement('canvas')
    c.width = bmp.width
    c.height = bmp.height
    const ctx = c.getContext('2d')
    ctx.drawImage(bmp, 0, 0)
    const { data } = ctx.getImageData(0, 0, bmp.width, bmp.height)
    const colors = new Set()
    let transparent = 0
    const step = Math.max(4, Math.floor(data.length / 4 / 20000)) * 4
    for (let i = 0; i < data.length; i += step) {
      colors.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])
      if (data[i + 3] === 0) transparent++
    }
    const corner = (x, y) => data[(y * bmp.width + x) * 4 + 3]
    return {
      colorCount: colors.size,
      transparentSamples: transparent,
      cornerAlpha: [corner(1, 1), corner(bmp.width - 2, 1), corner(1, bmp.height - 2), corner(bmp.width - 2, bmp.height - 2)],
    }
  }, [...buf])
}

// 卡片在页面上的原始尺寸（不受缩小显示影响）
export const cardNaturalSize = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('.card')
    return { width: c.offsetWidth, height: c.offsetHeight }
  })
