import { describe, expect, it } from 'vitest'
import { facesNeeded, parseUnicodeRange } from '../../src/lib/exportFonts'

describe('parseUnicodeRange', () => {
  it('parses single code points and ranges', () => {
    expect(parseUnicodeRange('U+20-7E, U+A0, U+AC00-AC40')).toEqual([
      [0x20, 0x7e],
      [0xa0, 0xa0],
      [0xac00, 0xac40],
    ])
  })

  it('parses wildcard ranges', () => {
    expect(parseUnicodeRange('U+4??')).toEqual([[0x400, 0x4ff]])
  })

  it('returns an empty list for an empty value', () => {
    expect(parseUnicodeRange('')).toEqual([])
  })
})

describe('facesNeeded', () => {
  const hangul = parseUnicodeRange('U+AC00-AD00, U+B000-B010')
  const ascii = parseUnicodeRange('U+20-7E')

  it('is true when at least one character falls in the ranges', () => {
    expect(facesNeeded(hangul, [0x41, 0xac05])).toBe(true)
    expect(facesNeeded(ascii, [0x61])).toBe(true)
  })

  it('is false when none of the characters do', () => {
    expect(facesNeeded(hangul, [0x41, 0x4e2d])).toBe(false)
    expect(facesNeeded(hangul, [0xad01, 0xaffff])).toBe(false)
  })

  it('treats a face without ranges as always needed', () => {
    expect(facesNeeded([], [0x41])).toBe(true)
  })
})
