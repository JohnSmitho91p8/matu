import { describe, expect, it } from 'vitest'
import { isValidMarks, marksFromLegacy, remapHighlights, toggleHighlight } from '../../src/lib/lineHighlights'

const m = (line, kind = 'focus') => ({ line, kind })
const lines = (marks) => marks.map((x) => x.line)

describe('toggleHighlight', () => {
  it('a plain click cycles none → focus → wrong → right → none', () => {
    let marks = []
    const seen = []
    for (let i = 0; i < 4; i++) {
      marks = toggleHighlight(marks, 4, 4, false)
      seen.push(marks.find((x) => x.line === 4)?.kind ?? null)
    }
    expect(seen).toEqual(['focus', 'wrong', 'right', null])
    expect(marks).toEqual([])
  })

  it('a click only changes the clicked line', () => {
    expect(toggleHighlight([m(9, 'wrong'), m(2, 'right')].sort((a, b) => a.line - b.line), 5, null, false)).toEqual([
      m(2, 'right'),
      m(5),
      m(9, 'wrong'),
    ])
  })

  it('shift-click gives every line in the range the anchor line\'s mark', () => {
    expect(toggleHighlight([m(4, 'wrong')], 8, 4, true)).toEqual([4, 5, 6, 7, 8].map((l) => m(l, 'wrong')))
    expect(toggleHighlight([m(8, 'right')], 4, 8, true)).toEqual([4, 5, 6, 7, 8].map((l) => m(l, 'right')))
  })

  it('shift-click overwrites marks that were already inside the range', () => {
    expect(toggleHighlight([m(2, 'wrong'), m(3, 'right')], 4, 2, true)).toEqual([2, 3, 4].map((l) => m(l, 'wrong')))
  })

  it('shift-click from an anchor without a mark makes the whole range focus', () => {
    expect(toggleHighlight([], 6, 4, true)).toEqual([4, 5, 6].map((l) => m(l)))
    expect(toggleHighlight([m(5, 'wrong')], 6, 4, true)).toEqual([4, 5, 6].map((l) => m(l)))
  })

  it('shift-click without an anchor, or on the anchor itself, is a plain click', () => {
    expect(toggleHighlight([], 3, null, true)).toEqual([m(3)])
    expect(toggleHighlight([m(3)], 3, 3, true)).toEqual([m(3, 'wrong')])
  })

  it('can be limited to fewer kinds', () => {
    expect(toggleHighlight([m(1)], 1, 1, false, ['focus'])).toEqual([])
  })
})

describe('remapHighlights', () => {
  const code = ['a', 'b', 'c', 'd', 'e'].join('\n')

  it('does nothing without marks or without a change', () => {
    expect(remapHighlights([], code, code + 'x')).toEqual([])
    expect(remapHighlights([m(1), m(2)], code, code)).toEqual([m(1), m(2)])
  })

  it('moves marks down, and keeps their kind, when lines are inserted above', () => {
    expect(remapHighlights([m(2, 'wrong'), m(3, 'right')], code, 'new\n' + code)).toEqual([m(3, 'wrong'), m(4, 'right')])
  })

  it('moves marks up when lines are deleted above', () => {
    expect(remapHighlights([m(2, 'right'), m(3)], code, ['b', 'c', 'd', 'e'].join('\n'))).toEqual([m(1, 'right'), m(2)])
  })

  it('leaves marks above the change alone', () => {
    expect(remapHighlights([m(0, 'wrong'), m(1)], code, code + '\nf')).toEqual([m(0, 'wrong'), m(1)])
  })

  it('keeps the mark and its kind when its line is edited in place', () => {
    expect(remapHighlights([m(2, 'wrong')], code, ['a', 'b', 'c!', 'd', 'e'].join('\n'))).toEqual([m(2, 'wrong')])
  })

  it('drops the mark when its line is deleted', () => {
    expect(remapHighlights([m(2)], code, ['a', 'b', 'd', 'e'].join('\n'))).toEqual([])
  })

  it('splitting a marked line keeps the first half marked', () => {
    expect(remapHighlights([m(1, 'right')], 'a\nbb\nc', 'a\nb\nb\nc')).toEqual([m(1, 'right')])
  })

  it('drops marks beyond the end when the code gets shorter', () => {
    expect(remapHighlights([m(4)], code, 'a\nb')).toEqual([])
  })

  it('when two marks land on the same line, keeps the one that was further down', () => {
    // 中间三行被换成一行：原来的第 1、2、3 行都映射到新的第 1 行
    const out = remapHighlights([m(1, 'focus'), m(2, 'wrong'), m(3, 'right')], code, ['a', 'X', 'e'].join('\n'))
    expect(lines(out)).toEqual([1])
    expect(out[0].kind).toBe('right')
  })

  it('returns marks in ascending order', () => {
    const out = remapHighlights([m(0), m(3), m(4, 'wrong')], code, 'new\n' + code)
    expect(lines(out)).toEqual([...lines(out)].sort((a, b) => a - b))
  })
})

describe('validating and converting marks', () => {
  it('accepts well-formed marks', () => {
    expect(isValidMarks([])).toBe(true)
    expect(isValidMarks([m(0), m(3, 'wrong'), m(7, 'right')])).toBe(true)
  })

  it('rejects anything else', () => {
    for (const bad of [null, 'x', {}, [1, 2], [{ line: -1, kind: 'focus' }], [{ line: 1.5, kind: 'focus' }], [{ line: '1', kind: 'focus' }], [{ line: 1, kind: 'pink' }], [{ line: 1 }], [m(3), m(1)], [m(2), m(2, 'wrong')]]) {
      expect(isValidMarks(bad)).toBe(false)
    }
  })

  it('turns an old list of highlighted lines into focus marks', () => {
    expect(marksFromLegacy([5, 1, 5, 3])).toEqual([m(1), m(3), m(5)])
    expect(marksFromLegacy([])).toEqual([])
  })

  it('refuses invalid old data', () => {
    expect(marksFromLegacy([-1, 'a'])).toBeNull()
    expect(marksFromLegacy('x')).toBeNull()
  })
})
