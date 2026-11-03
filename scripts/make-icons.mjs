// 从 public/favicon.svg 生成应用图标（192、512，以及 512 的 maskable 版本），放进 public/icons/。
// 图标变了就重新运行：node scripts/make-icons.mjs
// 用项目已有的 Playwright（Chromium）把 SVG 画成 PNG，不需要额外依赖。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'icons')
const favicon = fs.readFileSync(path.join(root, 'public', 'favicon.svg'), 'utf8')

// maskable：系统会按圆形、圆角方形等任意形状裁切，只有中间 80% 直径的圆是安全区。
// 所以铺满整张渐变底色，再把图标里的深色代码窗口放大到刚好落在安全圆内（最远的角到中心不超过 40%）
const gradient = favicon.match(/<defs>[\s\S]*?<\/defs>/)[0]
const windowShapes = favicon.slice(favicon.indexOf('<rect x="9"'), favicon.indexOf('</svg>'))
const SIZE = 512
const SCALE = 6.4 // 窗口最远的角离中心 29.8 个单位 × 6.4 = 191 < 0.4 × 512 = 205
const CENTER = { x: 32, y: 33 } // 窗口的中心
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  ${gradient}
  <rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>
  <g transform="translate(${SIZE / 2 - CENTER.x * SCALE} ${SIZE / 2 - CENTER.y * SCALE}) scale(${SCALE})">${windowShapes}</g>
</svg>`

const jobs = [
  { file: 'icon-192.png', size: 192, svg: favicon },
  { file: 'icon-512.png', size: 512, svg: favicon },
  { file: 'icon-maskable-512.png', size: 512, svg: maskable },
]

fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const { file, size, svg } of jobs) {
    await page.setViewportSize({ width: size, height: size })
    const url = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:${size}px;height:${size}px}</style><img src="${url}">`)
    await page.locator('img').evaluate((img) => img.decode())
    await page.screenshot({ path: path.join(outDir, file), omitBackground: true })
    console.log('wrote', path.relative(root, path.join(outDir, file)))
  }
} finally {
  await browser.close()
}
