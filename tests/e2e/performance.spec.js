import { expect, test } from '@playwright/test'
import { isMobile, openApp, typeCode } from './helpers'

const lines = (n) => Array.from({ length: n }, (_, i) => `    int value${i} = ${i} * 2 + compute(${i}); // line ${i}`).join('\n')

// 点「下载」（手机上是下载图标，直到预览出现）到拿到图片的耗时
async function timeToImage(page) {
  const t0 = Date.now()
  if (isMobile(page)) {
    await page.getByRole('button', { name: 'Download' }).tap()
    await page.locator('.preview img').waitFor({ timeout: 120_000 })
    const ms = Date.now() - t0
    await page.locator('.preview .close').tap()
    return ms
  }
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120_000 }),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  await download.path()
  return Date.now() - t0
}

// 小改动后停下来，再点导出：模拟「编辑 → 停下 → 点击」
async function editThenIdle(page, idleMs) {
  await page.evaluate(() => {
    const el = document.querySelector('textarea')
    el.focus()
    el.setSelectionRange(0, 0)
    document.execCommand('insertText', false, ' ')
  })
  await page.waitForTimeout(idleMs)
}

// 目标（见 4.3）：停下来 1 秒后点复制，默认示例 200ms 内；200 行停下来 3 秒后 300ms 内。
// 这里测的是点「下载」到拿到图片的耗时，比实际复制多一点点（要把文件交给测试程序），所以留了余量
test.describe('export speed', () => {
  test.slow()
  const scenarios = [
    { name: 'default example, stopped typing 1 s ago', code: null, idle: 1000, limit: 400 },
    { name: '200 lines, stopped typing 3 s ago', code: lines(200), idle: 3000, limit: 600 },
    { name: '300 lines, stopped typing 3 s ago', code: lines(300), idle: 3000, limit: 800 },
    // 没有提前生成好（点得太快）时，要现场生成：比上面慢，但也不能太久
    { name: 'default example, clicked right after editing', code: null, idle: 0, limit: 2500 },
    { name: '200 lines, clicked right after editing', code: lines(200), idle: 0, limit: 4000 },
  ]

  for (const s of scenarios) {
    test(`${s.name}: click to image`, async ({ page }, info) => {
      await openApp(page)
      if (s.code) await typeCode(page, s.code)
      const runs = []
      for (let i = 0; i < 3; i++) {
        await editThenIdle(page, s.idle)
        runs.push(await timeToImage(page))
      }
      console.log(`PERF ${info.project.name} | ${s.name} | ${runs.join(' / ')} ms`)
      info.annotations.push({ type: 'perf', description: runs.join(' / ') + ' ms' })
      // 第一次可能还没生成完，看后两次
      expect(Math.max(...runs.slice(1))).toBeLessThan(s.limit)
    })
  }
})

// 一边打字一边观察：后台预先生成图片不应该让打字卡顿
test.describe('typing while the image is prepared in the background', () => {
  test.slow()

  for (const [name, count] of [['default example', 19], ['200 lines', 200]]) {
    test(name, async ({ page }, info) => {
      await openApp(page)
      if (count === 200) await typeCode(page, lines(200))
      await page.evaluate(() => {
        window.__gaps = []
        let last = performance.now()
        const loop = (now) => {
          window.__gaps.push(now - last)
          last = now
          window.__raf = requestAnimationFrame(loop)
        }
        window.__raf = requestAnimationFrame(loop)
        const el = document.querySelector('textarea')
        el.focus()
        el.setSelectionRange(5, 5)
      })
      // 打一小段、停一会儿（超过预先生成的等待时间）、再打一小段：每次停下来后台都会开始生成，
      // 下一段输入正好落在生成过程中
      for (let round = 0; round < 3; round++) {
        await page.keyboard.type('abc', { delay: 30 })
        await page.waitForTimeout(count === 200 ? 1250 : 700)
      }
      const worst = await page.evaluate(() => {
        cancelAnimationFrame(window.__raf)
        return Math.max(...window.__gaps)
      })
      console.log(`TYPING ${info.project.name} | ${name}, typing while the image is being prepared | slowest frame: ${Math.round(worst)} ms`)
      expect(worst).toBeLessThan(count === 200 ? 600 : 200)
    })
  }
})

// 太长的代码不会提前生成（会让输入卡住），点击时现场生成：慢一些，但要能出图，输入也不受影响
test.describe('long code is exported on demand', () => {
  test.slow()

  test('1200 lines: click to image', async ({ page }, info) => {
    test.skip(isMobile(page), 'too large for a phone canvas, covered in extreme.spec.js')
    await openApp(page)
    await typeCode(page, lines(1200))
    await page.waitForTimeout(1500)
    const ms = await timeToImage(page)
    console.log(`PERF ${info.project.name} | 1200 lines, on demand | ${ms} ms`)
    expect(ms).toBeLessThan(30_000)
  })
})
