import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSettings, saveSettings } from '../../src/lib/storage'
import { loadAppSettings } from '../../src/lib/settings'
import { DEFAULT_SETTINGS } from '../../src/config/defaults'

const KEY = 'matu:settings'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('loadAppSettings', () => {
  it('returns the defaults when nothing is saved', () => {
    expect(loadAppSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('fills in missing fields when reading data saved by an older version', () => {
    // 最早的版本只保存这几项
    localStorage.setItem(
      KEY,
      JSON.stringify({ theme: 'github-light', background: 'ocean', padding: 'l', lineNumbers: false, code: 'int x;', filename: 'main.cpp' }),
    )
    const s = loadAppSettings()
    expect(s).toMatchObject({ theme: 'github-light', background: 'ocean', padding: 'l', lineNumbers: false, code: 'int x;' })
    expect(Object.keys(s).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort())
    expect(s.fontSize).toBe(DEFAULT_SETTINGS.fontSize)
    expect(s.language).toBe('auto')
    expect(s.lineMarks).toEqual([])
    expect(s.startLine).toBe(1)
    expect(s.watermarkEnabled).toBe(false)
  })

  it('treats an old custom file name as edited by the user', () => {
    localStorage.setItem(KEY, JSON.stringify({ filename: 'notes.cpp' }))
    expect(loadAppSettings()).toMatchObject({ filename: 'notes.cpp', filenameEdited: true })
  })

  it('does not treat a default file name as edited', () => {
    localStorage.setItem(KEY, JSON.stringify({ filename: 'main.py' }))
    expect(loadAppSettings().filenameEdited).toBe(false)
  })

  it('falls back to the default for invalid values', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ theme: 'nope', padding: 'xl', fontSize: 3, language: 'rust', highlightedLines: [-1, 'a'], lineMarks: [{ line: 1, kind: 'pink' }], startLine: 0, watermarkText: 'x'.repeat(31) }),
    )
    const s = loadAppSettings()
    expect(s.theme).toBe(DEFAULT_SETTINGS.theme)
    expect(s.padding).toBe(DEFAULT_SETTINGS.padding)
    expect(s.fontSize).toBe(DEFAULT_SETTINGS.fontSize)
    expect(s.language).toBe('auto')
    expect(s.lineMarks).toEqual([])
    expect(s.startLine).toBe(1)
    expect(s.watermarkText).toBe('')
  })

  it('turns the highlighted lines saved by an older version into focus marks', () => {
    localStorage.setItem(KEY, JSON.stringify({ theme: 'github-light', highlightedLines: [4, 1, 4] }))
    const s = loadAppSettings()
    expect(s.lineMarks).toEqual([{ line: 1, kind: 'focus' }, { line: 4, kind: 'focus' }])
    expect(s.theme).toBe('github-light')
    expect('highlightedLines' in s).toBe(false)
  })

  it('prefers lineMarks over the old highlightedLines when both are present', () => {
    localStorage.setItem(KEY, JSON.stringify({ highlightedLines: [1], lineMarks: [{ line: 2, kind: 'wrong' }] }))
    expect(loadAppSettings().lineMarks).toEqual([{ line: 2, kind: 'wrong' }])
  })

  it('ignores invalid old highlighted lines', () => {
    localStorage.setItem(KEY, JSON.stringify({ highlightedLines: [-1, 'a'] }))
    expect(loadAppSettings().lineMarks).toEqual([])
  })

  it('survives corrupted data', () => {
    localStorage.setItem(KEY, '{not json')
    expect(loadAppSettings()).toEqual(DEFAULT_SETTINGS)
    localStorage.setItem(KEY, '"a string"')
    expect(loadAppSettings()).toEqual(DEFAULT_SETTINGS)
  })
})

describe('storage when localStorage is unavailable', () => {
  function breakStorage() {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
  }

  it('loading falls back to the defaults without throwing', () => {
    breakStorage()
    expect(() => loadAppSettings()).not.toThrow()
    expect(loadAppSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('saving does not throw', () => {
    breakStorage()
    expect(() => saveSettings({ theme: 'github-light' })).not.toThrow()
  })
})

describe('saveSettings / loadSettings', () => {
  it('round-trips settings', () => {
    saveSettings({ ...DEFAULT_SETTINGS, theme: 'catppuccin-mocha', lineMarks: [{ line: 1, kind: 'wrong' }, { line: 3, kind: 'right' }], startLine: 40 })
    expect(loadAppSettings()).toMatchObject({
      theme: 'catppuccin-mocha',
      lineMarks: [{ line: 1, kind: 'wrong' }, { line: 3, kind: 'right' }],
      startLine: 40,
    })
  })

  it('only keeps keys that exist in the defaults', () => {
    localStorage.setItem(KEY, JSON.stringify({ unknown: 1 }))
    expect(loadSettings({ a: 1 }, { a: () => true })).toEqual({ a: 1 })
  })
})
