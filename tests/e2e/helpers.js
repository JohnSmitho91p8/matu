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
// 电脑：工具栏上有主题、背景，其余设置在「设置」按钮弹出的面板里；
// 手机：底部栏有主题、背景、设置三项，各自从底部弹出面板。

async function withSheet(page, itemTestId, action) {
  await page.getByTestId(itemTestId).click()
  const sheet = page.locator('.sheet')
  await expect(sheet).toBeVisible()
  const result = await action(sheet)
  await page.locator('.sheet-root .backdrop').click({ position: { x: 10, y: 10 } })
  await expect(sheet).toBeHidden()
  return result
}

// 打开设置面板，执行操作，再关掉
export async function withSettings(page, action) {
  if (isMobile(page)) return withSheet(page, 'item-settings', (sheet) => action(sheet.getByTestId('settings')))
  await page.getByTestId('settings-button').click()
  const panel = page.locator('.settings-panel')
  await expect(panel).toBeVisible()
  const result = await action(panel.getByTestId('settings'))
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  return result
}

export async function setTheme(page, name) {
  if (isMobile(page)) return withSheet(page, 'item-theme', (s) => s.getByRole('button', { name }).click())
  await page.getByTestId('theme').getByRole('button', { name }).click()
}

export async function setBackground(page, name) {
  if (isMobile(page)) return withSheet(page, 'item-background', (s) => s.getByRole('button', { name }).click())
  await page.getByTestId('background').getByRole('button', { name }).click()
}

export const setPadding = (page, size) =>
  withSettings(page, (form) => form.getByTestId('padding').getByRole('button', { name: size }).click())

export const setFontSize = (page, size) =>
  withSettings(page, (form) => form.getByTestId('font-size').getByRole('button', { name: size }).click())

export const toggleLineNumbers = (page) =>
  withSettings(page, (form) => form.getByTestId('line-numbers').getByRole('switch').click())

export const setWatermark = (page, text) =>
  withSettings(page, async (form) => {
    const row = form.getByTestId('watermark')
    const toggle = row.getByRole('switch')
    if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click()
    await row.getByRole('textbox').fill(text)
  })

// name: 'Auto' 或语言名，如 'Python'
export const setCodeLanguage = (page, name) =>
  withSettings(page, (form) => form.getByTestId('language').locator('select').selectOption({ label: name }))

// 设置里的语言项当前的取值：'auto' 或语言 id
export const codeLanguageSetting = (page) =>
  withSettings(page, (form) => form.getByTestId('language').locator('select').inputValue())

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
    // 图片很大时，用 base64 字符串传回来，比传一个几百万项的数组快得多
    const base64 = await img.evaluate(async (el) => {
      const blob = await (await fetch(el.src)).blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.readAsDataURL(blob)
      })
    })
    await page.locator('.preview .close').tap()
    return Buffer.from(base64, 'base64')
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
  return page.evaluate(async (base64) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob())
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
  }, buf.toString('base64'))
}

// 卡片在页面上的原始尺寸（不受缩小显示影响）
export const cardNaturalSize = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('.card')
    return { width: c.offsetWidth, height: c.offsetHeight }
  })
