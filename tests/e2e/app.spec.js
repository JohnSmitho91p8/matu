import { expect, test } from '@playwright/test'
import {
  clickLineNumber,
  exportPng,
  inkRuns,
  lineBoxInImage,
  pixelAt,
  isMobile,
  openApp,
  pasteCode,
  pngSize,
  setBackground,
  setCodeLanguage,
  setFontSize,
  setPadding,
  setTheme,
  setStartLine,
  setWatermark,
  settingsFromStorage,
  withSettings,
  toggleLineNumbers,
  typeCode,
} from './helpers'

test.describe('first load', () => {
  test('renders the default example', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await openApp(page)
    await expect(page).toHaveTitle('Matu · Turn code into images')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('.logo')).toHaveText('Matu')
    await expect(page.locator('.line')).toHaveCount(19)
    await expect(page.locator('.filename input')).toHaveValue('main.cpp')
    // 高亮生效：不止一种颜色
    await expect
      .poll(() => page.locator('.line span').evaluateAll((els) => new Set(els.map((e) => e.style.color)).size))
      .toBeGreaterThan(5)
    await expect(page.locator('.line').nth(3)).toContainText('Fast power: compute a^b mod p')
    expect(errors).toEqual([])
  })

  test('the page never scrolls sideways and the card is not covered by the toolbar', async ({ page }) => {
    await openApp(page)
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const gap = await page.evaluate(() => {
      const card = document.querySelector('.fit').getBoundingClientRect()
      const bar = (document.querySelector('.toolbar') || document.querySelector('.mtoolbar')).getBoundingClientRect()
      return bar.top - card.bottom
    })
    expect(gap).toBeGreaterThan(0)
  })

  test('uses the phone layout only on small screens', async ({ page }) => {
    await openApp(page)
    await expect(page.locator('.mtoolbar')).toHaveCount(isMobile(page) ? 1 : 0)
    await expect(page.locator('.toolbar')).toHaveCount(isMobile(page) ? 0 : 1)
  })
})

test.describe('appearance settings', () => {
  test.beforeEach(async ({ page }) => openApp(page))

  test('switches between the four themes', async ({ page }) => {
    const expected = {
      'Vitesse Dark': 'rgb(18, 18, 18)',
      'Catppuccin Mocha': 'rgb(30, 30, 46)',
      'GitHub Light': 'rgb(255, 255, 255)',
      'Vitesse Light': 'rgb(255, 255, 255)',
    }
    for (const [name, bg] of Object.entries(expected)) {
      await setTheme(page, name)
      // 颜色有 200ms 的过渡动画，用会重试的断言
      await expect(page.locator('.window')).toHaveCSS('background-color', bg)
    }
    expect((await settingsFromStorage(page)).theme).toBe('vitesse-light')
  })

  test('switches between the five backgrounds and no background', async ({ page }) => {
    const bg = () => page.locator('.card').evaluate((e) => e.style.background)
    for (const name of ['Sunset', 'Ocean', 'Mint', 'Dusk', 'Graphite']) {
      await setBackground(page, name)
      expect(await bg()).toContain('linear-gradient')
    }
    await setBackground(page, 'No background')
    expect(await bg()).toContain('none')
    expect(await page.locator('.card').evaluate((e) => e.style.padding)).toBe('0px')
  })

  test('changes padding and font size', async ({ page }) => {
    const padding = () => page.locator('.card').evaluate((e) => parseInt(e.style.padding))
    for (const [name, px] of [['Small', 32], ['Large', 96], ['Medium', 64]]) {
      await setPadding(page, name)
      expect(await padding()).toBe(px)
    }
    const fontSize = () => page.locator('.layer').evaluate((e) => getComputedStyle(e).fontSize)
    for (const [name, px] of [['Small', '13px'], ['Large', '17px'], ['Medium', '15px']]) {
      await setFontSize(page, name)
      expect(await fontSize()).toBe(px)
    }
  })

  test('toggles line numbers and keeps equal left and right padding when off', async ({ page }) => {
    const numbers = () => page.locator('.line').first().evaluate((e) => getComputedStyle(e, '::before').display)
    expect(await numbers()).toBe('block')
    await toggleLineNumbers(page)
    expect(await numbers()).toBe('none')
    const gap = await page.evaluate(() => {
      const w = document.querySelector('.window').getBoundingClientRect()
      const l = document.querySelector('.line').getBoundingClientRect()
      return Math.round((l.left - w.left) / (w.width / document.querySelector('.window').offsetWidth))
    })
    expect(gap).toBe(20)
    await toggleLineNumbers(page)
    expect(await numbers()).toBe('block')
  })

  test('shows the signature only when it is on and has text', async ({ page }) => {
    await expect(page.locator('.mark')).toHaveCount(0)
    await setWatermark(page, '@matu_fan')
    await expect(page.locator('.mark')).toHaveText('@matu_fan')
    const s = await settingsFromStorage(page)
    expect(s).toMatchObject({ watermarkEnabled: true, watermarkText: '@matu_fan' })
  })

  test('remembers settings after a reload', async ({ page }) => {
    await setTheme(page, 'GitHub Light')
    await setBackground(page, 'Mint')
    await setPadding(page, 'Large')
    await setFontSize(page, 'Small')
    await typeCode(page, 'int answer = 42;')
    await page.reload()
    await page.locator('.line span').first().waitFor()
    await expect(page.locator('textarea')).toHaveValue('int answer = 42;')
    expect(await page.locator('.window').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(255, 255, 255)')
    expect(await page.locator('.card').evaluate((e) => parseInt(e.style.padding))).toBe(96)
    expect(await page.locator('.layer').evaluate((e) => getComputedStyle(e).fontSize)).toBe('13px')
  })
})

test.describe('code language', () => {
  test.beforeEach(async ({ page }) => openApp(page))

  test('detects the language and file name when code is pasted', async ({ page }) => {
    const python = 'import sys\n\ndef main():\n    print(sys.argv)\n\nif __name__ == "__main__":\n    main()'
    await pasteCode(page, python)
    await expect(page.locator('.filename input')).toHaveValue('main.py')
    await pasteCode(page, 'public class Main {\n  public static void main(String[] a) {\n    System.out.println(1);\n  }\n}')
    await expect(page.locator('.filename input')).toHaveValue('Main.java')
  })

  test('typing does not change the language, and a manual choice is locked', async ({ page }) => {
    await setCodeLanguage(page, 'Python')
    await expect(page.locator('.filename input')).toHaveValue('main.py')
    await pasteCode(page, '#include <iostream>\nusing namespace std;\nint main() { cout << 1; }')
    await expect(page.locator('.filename input')).toHaveValue('main.py')
    await setCodeLanguage(page, 'Auto')
    await expect(page.locator('.filename input')).toHaveValue('main.cpp')
  })

  test('a file name edited by the user is kept', async ({ page }) => {
    const input = page.locator('.filename input')
    await input.fill('demo.txt')
    await input.press('Enter')
    await setCodeLanguage(page, 'Java')
    await expect(input).toHaveValue('demo.txt')
  })
})

test.describe('line highlighting', () => {
  test.beforeEach(async ({ page }) => openApp(page))

  const highlighted = (page) =>
    page.locator('.line').evaluateAll((els) => els.map((e, i) => (e.classList.contains('hl') ? i + 1 : 0)).filter(Boolean))
  const clearButton = (page) => page.getByRole('button', { name: 'Clear highlight' })

  test('click cycles a line, shift-click selects a range, and the clear button appears only when needed', async ({ page }) => {
    await expect(clearButton(page)).toHaveCount(0)
    await clickLineNumber(page, 6)
    expect(await highlighted(page)).toEqual([6])
    await expect(clearButton(page)).toHaveCount(1)
    if (!isMobile(page)) {
      await clickLineNumber(page, 9, ['Shift'])
      expect(await highlighted(page)).toEqual([6, 7, 8, 9])
    }
    // 再点三次：聚焦 → 错误 → 正确 → 无
    for (let i = 0; i < 3; i++) await clickLineNumber(page, 6)
    expect(await highlighted(page)).not.toContain(6)
    await clickLineNumber(page, 12)
    expect(await highlighted(page)).toContain(12)
    await clearButton(page).click()
    expect(await highlighted(page)).toEqual([])
    await expect(clearButton(page)).toHaveCount(0)
  })

  test('highlights survive a reload and follow inserted lines', async ({ page }) => {
    await clickLineNumber(page, 8)
    await page.evaluate(() => {
      const el = document.querySelector('textarea')
      el.focus()
      el.setSelectionRange(0, 0)
      document.execCommand('insertText', false, '// new first line\n')
    })
    await page.waitForTimeout(300)
    expect(await highlighted(page)).toEqual([9])
    await page.reload()
    await page.locator('.line span').first().waitFor()
    expect(await highlighted(page)).toEqual([9])
  })

  test('pasting over everything clears the highlights', async ({ page }) => {
    await clickLineNumber(page, 3)
    await pasteCode(page, 'int main() {\n  return 0;\n}')
    expect(await highlighted(page)).toEqual([])
  })
})

test.describe('wrong and right marks, start line', () => {
  test.beforeEach(async ({ page }) => openApp(page))

  const kindOf = (page, n) =>
    page.locator('.line').nth(n - 1).evaluate((e) => ['focus', 'wrong', 'right'].find((k) => e.classList.contains(`mark-${k}`)) ?? 'none')
  const firstNumber = (page) => page.locator('.line').first().getAttribute('data-n')
  const clear = (page) => page.getByRole('button', { name: 'Clear highlight' })

  async function hoverTitle(page, n) {
    const pos = await page.evaluate((n) => {
      const line = document.querySelectorAll('.line')[n - 1].getBoundingClientRect()
      const layer = document.querySelector('.layer').getBoundingClientRect()
      return { x: layer.left + 28, y: line.top + line.height / 2 }
    }, n)
    await page.mouse.move(pos.x, pos.y)
    return page.locator('textarea').getAttribute('title')
  }

  test('four clicks on one line go focus, wrong, right, none, and the hover title follows', async ({ page }) => {
    const hints = ['Click: highlight', 'Click: mark as wrong', 'Click: mark as correct', 'Click: clear']
    const kinds = ['none', 'focus', 'wrong', 'right']
    for (let i = 0; i < 4; i++) {
      expect(await kindOf(page, 4)).toBe(kinds[i])
      if (!isMobile(page)) expect(await hoverTitle(page, 4)).toBe(hints[i])
      await clickLineNumber(page, 4)
    }
    expect(await kindOf(page, 4)).toBe('none')
  })

  test('shift-click gives the whole range the kind of the anchor, and clear removes every kind', async ({ page }) => {
    await clickLineNumber(page, 3)
    await clickLineNumber(page, 3) // 错误
    await clickLineNumber(page, 10)
    await clickLineNumber(page, 10)
    await clickLineNumber(page, 10) // 正确
    expect([await kindOf(page, 3), await kindOf(page, 10)]).toEqual(['wrong', 'right'])
    if (!isMobile(page)) {
      await clickLineNumber(page, 7, ['Shift'])
      // 锚点是最近点的第 10 行（正确）：第 7 到 10 行都成为正确
      expect(await Promise.all([7, 8, 9, 10].map((n) => kindOf(page, n)))).toEqual(['right', 'right', 'right', 'right'])
      expect(await kindOf(page, 3)).toBe('wrong')
    }
    await clear(page).click()
    for (const n of [3, 7, 10]) expect(await kindOf(page, n)).toBe('none')
    await expect(clear(page)).toHaveCount(0)
  })

  test('the exported image has a red bar on a wrong line and a green bar on a right line', async ({ page }) => {
    await setBackground(page, 'No background')
    await clickLineNumber(page, 2)
    await clickLineNumber(page, 2)
    for (let i = 0; i < 3; i++) await clickLineNumber(page, 3)
    await page.mouse.move(0, 0)
    await page.waitForTimeout(400)
    const png = await exportPng(page)
    const { width } = pngSize(png)
    const [wrong, right] = await Promise.all(
      [2, 3].map(async (n) => {
        const box = await lineBoxInImage(page, n, width)
        return pixelAt(page, png, Math.round(box.scale * 1.5), Math.round((box.top + box.bottom) / 2))
      }),
    )
    expect(wrong[0]).toBeGreaterThan(wrong[1] + 80)
    expect(wrong[0]).toBeGreaterThan(wrong[2] + 80)
    expect(right[1]).toBeGreaterThan(right[0] + 50)
    expect(right[1]).toBeGreaterThan(right[2] + 50)
  })

  test('start line 42 numbers the first line 42, and the input is disabled without line numbers', async ({ page }) => {
    await setStartLine(page, 42)
    expect(await firstNumber(page)).toBe('42')
    expect(await page.locator('.line').nth(1).getAttribute('data-n')).toBe('43')
    await toggleLineNumbers(page)
    await withSettings(page, async (form) => {
      await expect(form.getByTestId('start-line').getByRole('textbox')).toBeDisabled()
    })
  })

  test('a start line that is not a positive number goes back to 1', async ({ page }) => {
    await setStartLine(page, 7)
    await setStartLine(page, 'abc')
    expect(await firstNumber(page)).toBe('1')
    await setStartLine(page, 0)
    expect(await firstNumber(page)).toBe('1')
  })

  test('pasting over everything clears the marks and puts the start line back to 1', async ({ page }) => {
    await setStartLine(page, 40)
    await clickLineNumber(page, 3)
    await pasteCode(page, 'int main() {\n  return 0;\n}', { replaceAll: false })
    expect(await firstNumber(page)).toBe('40')
    await pasteCode(page, 'int main() {\n  return 0;\n}')
    expect(await firstNumber(page)).toBe('1')
    expect(await kindOf(page, 3)).toBe('none')
    await withSettings(page, async (form) => {
      await expect(form.getByTestId('start-line').getByRole('textbox')).toHaveValue('1')
    })
  })

  test('marks and the start line survive a reload', async ({ page }) => {
    await setStartLine(page, 40)
    await clickLineNumber(page, 2)
    await clickLineNumber(page, 2)
    await clickLineNumber(page, 5)
    await page.reload()
    await page.locator('.line span').first().waitFor()
    expect(await firstNumber(page)).toBe('40')
    expect([await kindOf(page, 2), await kindOf(page, 5)]).toEqual(['wrong', 'focus'])
    expect(await settingsFromStorage(page)).toMatchObject({
      startLine: 40,
      lineMarks: [
        { line: 1, kind: 'wrong' },
        { line: 4, kind: 'focus' },
      ],
    })
    await withSettings(page, async (form) => {
      await expect(form.getByTestId('start-line').getByRole('textbox')).toHaveValue('40')
    })
  })

  test('start line 99990: the widest number is whole in the exported image and clear of the code', async ({ page }) => {
    await setBackground(page, 'No background')
    // 每行都从第 0 列开始，代码的左边缘就是行号栏的右边界
    await typeCode(page, Array.from({ length: 12 }, (_, i) => `int v${i} = ${i};`).join('\n'))
    await setStartLine(page, 99990)
    expect(await page.locator('.line').last().getAttribute('data-n')).toBe('100001')
    await page.mouse.move(0, 0)
    await page.waitForTimeout(400)
    const png = await exportPng(page)
    const { width } = pngSize(png)
    for (const n of [1, 12]) {
      const box = await lineBoxInImage(page, n, width)
      // 不依赖墨迹分成几段（代码里的空格在不同字体、倍率下间距不同）：按位置分类，
      // 代码左边缘 box.codeLeft 左侧的墨迹都是行号，其余是代码
      const runs = await inkRuns(page, png, box.top + 2, box.bottom - 2, 2) // 只合并相邻的列
      const where = `line ${n}, scale ${box.scale}, codeLeft ${box.codeLeft.toFixed(1)}, ink runs ${JSON.stringify(runs)}`
      const numbers = runs.filter(([start]) => start < box.codeLeft - 2 * box.scale)
      const code = runs.filter(([start]) => start >= box.codeLeft - 2 * box.scale)
      expect(numbers.length, `has a gutter number: ${where}`).toBeGreaterThan(0)
      expect(code.length, `has code: ${where}`).toBeGreaterThan(0)
      const numStart = numbers[0][0]
      const numEnd = numbers[numbers.length - 1][1]
      // 行号没被窗口左边缘截断，与代码之间至少隔着 12px；代码从排版的位置开始
      expect(numStart, `number not clipped on the left: ${where}`).toBeGreaterThan(10 * box.scale)
      expect(box.codeLeft - numEnd, `gap between number and code: ${where}`).toBeGreaterThanOrEqual(12 * box.scale)
      expect(Math.abs(code[0][0] - box.codeLeft), `code starts where the layout says: ${where}`).toBeLessThan(3 * box.scale)
    }
  })
})

test.describe('interface language', () => {
  test('switches language, translates the page and remembers the choice', async ({ page }) => {
    await openApp(page)
    await page.locator('.lang .trigger').click()
    await page.locator('.lang .menu li', { hasText: '简体中文' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
    await expect(page.locator('.logo')).toHaveText('码图')
    await expect(page).toHaveTitle('码图 Matu · 代码转图片')
    await expect(page.locator('.line').nth(3)).toContainText('快速幂')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
    await page.locator('.lang .trigger').click()
    await page.locator('.lang .menu li', { hasText: '한국어' }).click()
    await expect(page.locator('.logo')).toHaveText('Matu')
    await expect(page.locator('.line').nth(3)).toContainText('빠른 거듭제곱')
  })

  test('a code the user wrote is not replaced when the language changes', async ({ page }) => {
    await openApp(page)
    await typeCode(page, 'int mine = 1;')
    await page.locator('.lang .trigger').click()
    await page.locator('.lang .menu li', { hasText: '日本語' }).click()
    await expect(page.locator('textarea')).toHaveValue('int mine = 1;')
  })
})
