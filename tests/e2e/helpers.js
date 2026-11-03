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

// 起始行号：输入后按回车整理（关闭行号时输入框是禁用的）
export const setStartLine = (page, value) =>
  withSettings(page, async (form) => {
    const input = form.getByTestId('start-line').getByRole('textbox')
    await input.fill(String(value))
    await input.press('Enter')
  })

// 点第 n 行的行号（手机上是轻点）；modifiers 如 ['Shift'] 只在电脑上有效
export async function clickLineNumber(page, n, modifiers = []) {
  const pos = await page.evaluate((n) => {
    const line = document.querySelectorAll('.line')[n - 1].getBoundingClientRect()
    const layer = document.querySelector('.layer').getBoundingClientRect()
    const zoom = layer.width / document.querySelector('.layer').offsetWidth
    return { x: layer.left + 28 * zoom, y: line.top + line.height / 2 }
  }, n)
  if (isMobile(page)) await page.touchscreen.tap(pos.x, pos.y)
  else {
    for (const key of modifiers) await page.keyboard.down(key)
    await page.mouse.click(pos.x, pos.y)
    for (const key of modifiers) await page.keyboard.up(key)
  }
  await page.waitForTimeout(250)
}

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
    const a = (x, y) => data[(y * bmp.width + x) * 4 + 3]
    const mx = Math.floor(bmp.width / 2)
    const my = Math.floor(bmp.height / 2)
    return {
      // 四条边中点的透明度：图片紧贴窗口时都是不透明的
      edgeAlpha: [a(mx, 0), a(mx, bmp.height - 1), a(0, my), a(bmp.width - 1, my)],
      colorCount: colors.size,
      transparentSamples: transparent,
      cornerAlpha: [corner(1, 1), corner(bmp.width - 2, 1), corner(1, bmp.height - 2), corner(bmp.width - 2, bmp.height - 2)],
    }
  }, buf.toString('base64'))
}

// 第 n 行（从 1 开始）在导出图里的位置：图片像素，原点在卡片左上角。
// 没有背景时图片就是代码窗口本身；scale 是图片宽度与卡片排版宽度之比
export const lineBoxInImage = (page, n, pngWidth) =>
  page.evaluate(
    ({ n, pngWidth }) => {
      const card = document.querySelector('.card')
      const c = card.getBoundingClientRect()
      const zoom = c.width / card.offsetWidth
      const scale = pngWidth / card.offsetWidth
      const l = document.querySelectorAll('.line')[n - 1].getBoundingClientRect()
      return {
        scale,
        top: Math.round(((l.top - c.top) / zoom) * scale),
        bottom: Math.round(((l.bottom - c.top) / zoom) * scale),
        codeLeft: ((l.left - c.left) / zoom) * scale,
      }
    },
    { n, pngWidth },
  )

// 读图片中某个像素的颜色 [r, g, b, a]
export const pixelAt = (page, buf, x, y) =>
  page.evaluate(
    async ({ base64, x, y }) => {
      const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob())
      const c = document.createElement('canvas')
      c.width = bmp.width
      c.height = bmp.height
      const ctx = c.getContext('2d')
      ctx.drawImage(bmp, 0, 0)
      return Array.from(ctx.getImageData(x, y, 1, 1).data)
    },
    { base64: buf.toString('base64'), x, y },
  )

// 图片里 y0 到 y1 这几行中有墨迹（与该行最左侧底色不同）的列，合并间距小于 gap 的相邻列，返回 [[起, 止], ...]
export const inkRuns = (page, buf, y0, y1, gap) =>
  page.evaluate(
    async ({ base64, y0, y1, gap }) => {
      const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob())
      const c = document.createElement('canvas')
      c.width = bmp.width
      c.height = bmp.height
      const ctx = c.getContext('2d')
      ctx.drawImage(bmp, 0, 0)
      const { data } = ctx.getImageData(0, y0, bmp.width, y1 - y0)
      const w = bmp.width
      const h = y1 - y0
      const bg = [data[4 * 8], data[4 * 8 + 1], data[4 * 8 + 2]]
      const runs = []
      for (let x = 0; x < w; x++) {
        let ink = false
        for (let y = 0; y < h && !ink; y++) {
          const i = (y * w + x) * 4
          ink = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 90
        }
        if (!ink) continue
        const last = runs[runs.length - 1]
        if (last && x - last[1] < gap) last[1] = x
        else runs.push([x, x])
      }
      return runs
    },
    { base64: buf.toString('base64'), y0, y1, gap },
  )

// 卡片在页面上的原始尺寸（不受缩小显示影响）
export const cardNaturalSize = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('.card')
    return { width: c.offsetWidth, height: c.offsetHeight }
  })

// 计时类断言：GitHub 的机器比开发机慢得多，持续集成里（CI 环境变量）只记录数据、不判定失败；本地照常判定
export function expectBelow(value, limit, what) {
  if (process.env.CI) {
    console.log(`TIMING (not enforced on CI) ${what}: ${Math.round(value)} ms, local limit ${limit} ms`)
    return
  }
  expect(value, what).toBeLessThan(limit)
}
