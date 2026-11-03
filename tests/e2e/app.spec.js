import { expect, test } from '@playwright/test'
import {
  isMobile,
  openApp,
  pasteCode,
  setBackground,
  setCodeLanguage,
  setFontSize,
  setPadding,
  setTheme,
  setWatermark,
  settingsFromStorage,
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

  async function clickLineNumber(page, n, modifiers = []) {
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
