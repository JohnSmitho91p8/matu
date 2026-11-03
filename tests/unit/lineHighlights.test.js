import { describe, expect, it } from 'vitest'
import { remapHighlights, toggleHighlight } from '../../src/lib/lineHighlights'

describe('toggleHighlight', () => {
  it('toggles a single line on and off', () => {
    expect(toggleHighlight([], 4, null, false)).toEqual([4])
    expect(toggleHighlight([4], 4, 4, false)).toEqual([])
  })

  it('selects a range with shift, in either direction', () => {
    expect(toggleHighlight([4], 8, 4, true)).toEqual([4, 5, 6, 7, 8])
    expect(toggleHighlight([8], 4, 8, true)).toEqual([4, 5, 6, 7, 8])
  })

  it('acts like a normal click when there is no anchor', () => {
    expect(toggleHighlight([], 3, null, true)).toEqual([3])
  })

  it('keeps lines sorted and unique', () => {
    expect(toggleHighlight([9, 2], 5, null, false)).toEqual([2, 5, 9])
    expect(toggleHighlight([2, 3], 5, 2, true)).toEqual([2, 3, 4, 5])
  })
})

describe('remapHighlights', () => {
  const code = ['a', 'b', 'c', 'd', 'e'].join('\n')

  it('does nothing when there are no highlights or no change', () => {
    expect(remapHighlights([], code, code + 'x')).toEqual([])
    expect(remapHighlights([1, 2], code, code)).toEqual([1, 2])
  })

  it('moves highlights down when a line is inserted above', () => {
    expect(remapHighlights([2, 3], code, 'new\n' + code)).toEqual([3, 4])
  })

  it('moves highlights up when a line above is deleted', () => {
    expect(remapHighlights([2, 3], code, ['b', 'c', 'd', 'e'].join('\n'))).toEqual([1, 2])
  })

  it('keeps highlights above an edit where they are', () => {
    expect(remapHighlights([0, 1], code, code + '\nf')).toEqual([0, 1])
  })

  it('keeps the highlight when text inside the line changes', () => {
    expect(remapHighlights([2], code, ['a', 'b', 'c!', 'd', 'e'].join('\n'))).toEqual([2])
  })

  it('drops the highlight of a deleted line', () => {
    expect(remapHighlights([2], code, ['a', 'b', 'd', 'e'].join('\n'))).toEqual([])
  })

  it('splitting a highlighted line keeps the first half highlighted', () => {
    expect(remapHighlights([1], 'a\nbb\nc', 'a\nb\nb\nc')).toEqual([1])
  })

  it('discards lines that no longer exist', () => {
    expect(remapHighlights([4], code, 'a\nb')).toEqual([])
  })
})
