import { describe, expect, it } from 'vitest'
import { cleanPastedText, replacesWholeDocument } from '../../src/lib/paste'

describe('cleanPastedText', () => {
  it('removes blank lines at the start and end', () => {
    expect(cleanPastedText('\n\n   \nint a;\n\n  return a;  \n\n \n')).toBe('int a;\n\n  return a;  ')
  })

  it('keeps blank lines in the middle and the first line indentation', () => {
    expect(cleanPastedText('    a();\n\n\n    b();\n')).toBe('    a();\n\n\n    b();')
  })

  it('turns tabs into four spaces', () => {
    expect(cleanPastedText('if (x) {\n\treturn 1;\n}')).toBe('if (x) {\n    return 1;\n}')
  })

  it('normalises Windows and old Mac line endings', () => {
    expect(cleanPastedText('a\r\nb\rc\r\n')).toBe('a\nb\nc')
  })

  it('treats whitespace-only text as empty', () => {
    expect(cleanPastedText(' \n\t\n  ').trim()).toBe('')
  })

  it('leaves trailing spaces on the last code line alone', () => {
    expect(cleanPastedText('x   \n')).toBe('x   ')
  })
})

describe('replacesWholeDocument', () => {
  it('is true only when everything is selected', () => {
    expect(replacesWholeDocument('abc', 0, 3)).toBe(true)
    expect(replacesWholeDocument('abc', 0, 2)).toBe(false)
    expect(replacesWholeDocument('abc', 1, 3)).toBe(false)
    expect(replacesWholeDocument('', 0, 0)).toBe(false)
  })
})
