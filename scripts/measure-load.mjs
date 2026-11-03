// 首次打开时下载了多少内容、多久能看到带颜色的代码。需要先 npm run build，然后运行：node scripts/measure-load.mjs
import { spawn } from 'node:child_process'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'

const PORT = 4191
const base = `http://127.0.0.1:${PORT}/matu/`
const server = spawn('npx', ['vite', 'preview', '--host', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
for (let i = 0; i < 50; i++) {
  if (await fetch(base).then((r) => r.ok).catch(() => false)) break
  await new Promise((r) => setTimeout(r, 200))
}

const browser = await chromium.launch()
const rows = []
for (const label of ['first visit (cold)']) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' })
  const page = await context.newPage()
  const sizes = { js: [0, 0, 0], css: [0, 0, 0], font: [0, 0, 0], other: [0, 0, 0] }
  const files = []
  page.on('response', async (res) => {
    try {
      const body = await res.body()
      const url = new URL(res.url())
      const kind = /\.js$/.test(url.pathname) ? 'js' : /\.css$/.test(url.pathname) ? 'css' : /\.woff2?$/.test(url.pathname) ? 'font' : 'other'
      const gz = kind === 'font' ? body.length : gzipSync(body).length
      sizes[kind][0]++
      sizes[kind][1] += body.length
      sizes[kind][2] += gz
      if (kind === 'js') files.push([url.pathname.split('/').pop(), body.length, gz])
    } catch {}
  })
  const t0 = Date.now()
  await page.goto(base)
  await page.waitForFunction(() => document.querySelectorAll('.line span[style*="color"]').length > 0, null, { timeout: 30000 })
  const colored = Date.now() - t0
  // 带颜色的代码出现时，已经下载了多少（首次打开真正要等的部分）
  const atColored = Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, [...v]]))
  await page.waitForTimeout(1500) // 之后空闲时还会预先下载其余主题和导出用的代码
  for (const [kind, [n, raw, gz]] of Object.entries(atColored)) rows.push({ when: 'until the code is coloured', kind, files: n, 'raw KB': Math.round(raw / 1024), 'gzip KB': Math.round(gz / 1024) })
  for (const [kind, [n, raw, gz]] of Object.entries(sizes)) rows.push({ when: '1.5 s later (idle preloading)', kind, files: n, 'raw KB': Math.round(raw / 1024), 'gzip KB': Math.round(gz / 1024) })
  console.log(`${label}: highlighted code visible after ${colored} ms`)
  console.table(files.sort((a, b) => b[1] - a[1]).map(([f, r, g]) => ({ file: f, 'raw KB': Math.round(r / 1024), 'gzip KB': Math.round(g / 1024) })))
}
console.table(rows)
await browser.close()
server.kill()
