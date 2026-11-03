import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { PNG } from 'pngjs'

// Chromium 和 WebKit 各自导出的基准图应该几乎一样：字体、字号、行距、阴影、圆角、颜色、水印位置都一致。
// 两边抗锯齿和阴影的渲染有细微差异，所以只要求「整体非常接近」
const root = path.resolve(__dirname, '../e2e/__screenshots__')
const platforms = fs.existsSync(root) ? fs.readdirSync(root) : []

function compare(a, b) {
  let sum = 0
  let far = 0
  for (let i = 0; i < a.data.length; i += 4) {
    let d = 0
    for (let c = 0; c < 4; c++) d = Math.max(d, Math.abs(a.data[i + c] - b.data[i + c]))
    sum += d
    if (d > 64) far++
  }
  const pixels = a.width * a.height
  return { mean: sum / pixels, farRatio: far / pixels }
}

describe('Chromium and WebKit export the same picture', () => {
  for (const platform of platforms) {
    const chromiumDir = path.join(root, platform, 'chromium-desktop')
    const webkitDir = path.join(root, platform, 'webkit-desktop')
    if (!fs.existsSync(chromiumDir) || !fs.existsSync(webkitDir)) continue
    for (const file of fs.readdirSync(chromiumDir).filter((f) => f.endsWith('.png'))) {
      it(`${platform} / ${file}`, () => {
        const a = PNG.sync.read(fs.readFileSync(path.join(chromiumDir, file)))
        const b = PNG.sync.read(fs.readFileSync(path.join(webkitDir, file)))
        // 尺寸完全一致：说明字体、字号、行距、边距都一样
        expect([b.width, b.height]).toEqual([a.width, a.height])
        const { mean, farRatio } = compare(a, b)
        expect(mean).toBeLessThan(12)
        expect(farRatio).toBeLessThan(0.05)
      })
    }
  }
})
