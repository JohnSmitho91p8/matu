// 录制 README 里的演示动图：粘贴 → 标红 → 标绿 → 复制图片。
// 用法：node scripts/record-demo.mjs [--no-build] [--frames <目录>]（后者把每一帧另存为 PNG，方便检查）
// 会先构建（加 --no-build 跳过），再用 Playwright 打开本地预览的页面自动操作，逐帧截图后用纯 JS 编码成 GIF，
// 英文界面存为 docs/demo.gif，中文界面存为 docs/demo.zh-CN.gif。功能或界面变了，重新运行就能重新录制。
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import GIFEncoder from 'gifenc'
import { PNG } from 'pngjs'
import { preview } from 'vite'

const { GIFEncoder: createEncoder, quantize, applyPalette } = GIFEncoder

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WIDTH = 800
const HEIGHT = 640
const MAX_BYTES = 3 * 1024 * 1024
const framesDir = process.argv.includes('--frames') ? process.argv[process.argv.indexOf('--frames') + 1] : null

// 一段 8 行的 C++：第 5 行有错（循环少加了 10），第 6 行是改正后的写法，第 4 行是中文注释
const CODE = `#include <iostream>
int main() {
    int sum = 0;
    // 求 1 到 10 的和
    for (int i = 1; i < 10; i++) sum += i;
    for (int i = 1; i <= 10; i++) sum += i;
    std::cout << sum << "\\n";
}`

const TARGETS = [
  { lang: 'en', file: 'docs/demo.gif', copied: 'Copied. You can paste it anywhere.' },
  { lang: 'zh-CN', file: 'docs/demo.zh-CN.gif', copied: '已复制，可以直接粘贴' },
]

if (!process.argv.includes('--no-build')) execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' })

const server = await preview({ root, preview: { port: 4189, strictPort: true, host: '127.0.0.1' } })
const baseUrl = 'http://127.0.0.1:4189/matu/'
const browser = await chromium.launch()

try {
  for (const target of TARGETS) await record(target)
} finally {
  await browser.close()
  await server.close()
}

async function record({ lang, file, copied }) {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    locale: lang === 'en' ? 'en-US' : 'zh-CN',
    serviceWorkers: 'block',
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  await context.addInitScript(
    ({ lang }) => {
      localStorage.setItem('matu:lang', lang)
      // 空卡片开始：没有代码，外观用默认设置
      localStorage.setItem('matu:settings', JSON.stringify({ code: '' }))
    },
    { lang },
  )
  const page = await context.newPage()
  await page.goto(baseUrl)
  await page.locator('textarea').waitFor()
  await page.evaluate(() => document.fonts.ready)

  // 每一帧：{ png, delay }。只在画面变化的时刻截图，停留的时间用帧的持续时间表示
  const frames = []
  const shot = async (delay, settle = 350) => {
    await page.waitForTimeout(settle) // 等过渡动画结束
    frames.push({ png: PNG.sync.read(await page.screenshot()), delay })
  }
  const clickLine = async (n) => {
    const pos = await page.evaluate((n) => {
      const line = document.querySelectorAll('.line')[n - 1].getBoundingClientRect()
      const layer = document.querySelector('.layer').getBoundingClientRect()
      return { x: layer.left + 28, y: line.top + line.height / 2 }
    }, n)
    await page.mouse.click(pos.x, pos.y)
  }

  await page.mouse.move(WIDTH / 2, 20)
  await shot(900) // 1. 空卡片

  // 2. 粘贴代码（与真实粘贴走同一条处理路径）
  await page.evaluate((code) => {
    const el = document.querySelector('textarea')
    el.focus()
    const dt = new DataTransfer()
    dt.setData('text/plain', code)
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  }, CODE)
  await page.waitForFunction(() => document.querySelectorAll('.line span[style*="color"]').length > 0)
  await page.mouse.move(WIDTH / 2, 20)
  await shot(1300, 500)

  // 3. 点第 5 行的行号：先聚焦，再点一次变成错误（红）
  await clickLine(5)
  await shot(350)
  await clickLine(5)
  await shot(1000)

  // 4. 点第 6 行的行号：聚焦 → 错误 → 正确（绿）
  await clickLine(6)
  await shot(250)
  await clickLine(6)
  await shot(250)
  await clickLine(6)
  await page.mouse.move(WIDTH / 2, 20)
  await shot(1000)

  // 5. 点「复制图片」，出现「已复制」提示
  await page.locator('.btn-primary').click()
  await page.locator('.toast', { hasText: copied }).waitFor()
  await page.mouse.move(WIDTH / 2, 20)
  await shot(1800, 250)

  // 6. 提示消失后停留约 1 秒，再循环
  await page.locator('.toast').waitFor({ state: 'detached' })
  await shot(1000, 100)
  await context.close()

  writeGif(file, frames)
}

function writeGif(file, frames) {
  if (framesDir) {
    fs.mkdirSync(framesDir, { recursive: true })
    frames.forEach((f, i) => fs.writeFileSync(path.join(framesDir, `${path.basename(file, '.gif')}-${i}.png`), PNG.sync.write(f.png)))
  }
  const encoder = createEncoder()
  for (const { png, delay } of frames) {
    const rgba = new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.length)
    // 渐变背景颜色多，256 色会有色带：用 rgb565 量化并保留更多细节
    const palette = quantize(rgba, 256, { format: 'rgb565' })
    const index = applyPalette(rgba, palette, 'rgb565')
    encoder.writeFrame(index, png.width, png.height, { palette, delay })
  }
  encoder.finish()
  const bytes = encoder.bytes()
  const out = path.join(root, file)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, bytes)
  const total = frames.reduce((s, f) => s + f.delay, 0)
  const mb = (bytes.length / 1024 / 1024).toFixed(2)
  console.log(`${file}: ${frames.length} frames, ${(total / 1000).toFixed(1)} s, ${mb} MB`)
  if (bytes.length > MAX_BYTES) throw new Error(`${file} is ${mb} MB, over the 3 MB limit`)
}
