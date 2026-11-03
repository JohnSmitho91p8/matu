import { afterEach, describe, expect, it, vi } from 'vitest'
import { FALLBACK_LANG, LANGUAGES, SAMPLE_CODES, messages } from '../../src/i18n/messages'

describe('messages', () => {
  const codes = LANGUAGES.map((l) => l.code)
  const reference = Object.keys(messages[FALLBACK_LANG]).sort()

  it('has the four interface languages', () => {
    expect(codes).toEqual(['en', 'zh-CN', 'ja', 'ko'])
  })

  for (const code of codes) {
    it(`${code} has exactly the same keys as English`, () => {
      expect(Object.keys(messages[code]).sort()).toEqual(reference)
    })

    it(`${code} has no empty text`, () => {
      for (const [key, value] of Object.entries(messages[code])) {
        expect(value.trim(), key).not.toBe('')
      }
    })

    it(`${code} has a sample program with translated comments`, () => {
      expect(SAMPLE_CODES[code]).toContain('long long qpow')
      expect(SAMPLE_CODES[code].split('\n')).toHaveLength(SAMPLE_CODES.en.split('\n').length)
    })
  }

  it('translates every language differently from English (except brand and theme names)', () => {
    const allowed = new Set(['app.logo', 'theme.vitesse-dark', 'theme.catppuccin-mocha', 'theme.github-light', 'theme.vitesse-light'])
    for (const code of codes.filter((c) => c !== 'en')) {
      for (const key of reference) {
        if (!allowed.has(key)) expect(messages[code][key], `${code} ${key}`).not.toBe(messages.en[key])
      }
    }
  })
})

describe('interface language detection', () => {
  afterEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  async function langFor(languages) {
    vi.resetModules()
    vi.stubGlobal('navigator', { languages, language: languages[0] })
    const mod = await import('../../src/i18n/index.js')
    return mod.lang.value
  }

  it('maps the browser language to a supported one', async () => {
    expect(await langFor(['en-US'])).toBe('en')
    expect(await langFor(['zh-CN'])).toBe('zh-CN')
    expect(await langFor(['zh-TW'])).toBe('zh-CN')
    expect(await langFor(['ja-JP'])).toBe('ja')
    expect(await langFor(['ko-KR'])).toBe('ko')
  })

  it('uses the first language that matches, and English when none do', async () => {
    expect(await langFor(['fr-FR', 'ja'])).toBe('ja')
    expect(await langFor(['fr-FR', 'de'])).toBe('en')
  })

  it('prefers the saved choice over the browser language', async () => {
    localStorage.setItem('matu:lang', 'ko')
    expect(await langFor(['en-US'])).toBe('ko')
  })

  it('works when localStorage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(await langFor(['ja'])).toBe('ja')
    vi.restoreAllMocks()
  })
})
