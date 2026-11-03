import { describe, expect, it } from 'vitest'
import { isValidStartLine, normalizeStartLine } from '../../src/lib/startLine'

describe('normalizeStartLine', () => {
  it('keeps a valid positive integer', () => {
    expect(normalizeStartLine('42')).toBe(42)
    expect(normalizeStartLine(42)).toBe(42)
    expect(normalizeStartLine(' 7 ')).toBe(7)
    expect(normalizeStartLine('007')).toBe(7)
    expect(normalizeStartLine('99999')).toBe(99999)
  })

  it('falls back to 1 for empty or illegal input', () => {
    for (const bad of ['', '   ', null, undefined, 'abc', '12a', '-5', '3.5', '1e3', '+4', 'NaN']) {
      expect(normalizeStartLine(bad)).toBe(1)
    }
  })

  it('clamps out-of-range numbers', () => {
    expect(normalizeStartLine('0')).toBe(1)
    expect(normalizeStartLine('100000')).toBe(99999)
    expect(normalizeStartLine('99999999999999999999')).toBe(99999)
  })
})

describe('isValidStartLine', () => {
  it('only accepts integers from 1 to 99999', () => {
    expect(isValidStartLine(1)).toBe(true)
    expect(isValidStartLine(99999)).toBe(true)
    for (const bad of [0, -1, 100000, 1.5, '3', null, NaN, undefined]) expect(isValidStartLine(bad)).toBe(false)
  })
})
