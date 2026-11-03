import { describe, expect, it } from 'vitest'
import { changeRatio, detectLanguage, resolveDetectedLanguage, shouldRedetect } from '../../src/lib/detectLanguage'
import { SAMPLES } from './samples'

describe('detectLanguage', () => {
  for (const [lang, samples] of Object.entries(SAMPLES)) {
    samples.forEach((code, i) => {
      it(`recognises ${lang} sample ${i + 1}`, () => {
        expect(detectLanguage(code)).toBe(lang)
      })
    })
  }

  it('does not call C++ code C', () => {
    expect(detectLanguage('#include <stdio.h>\nusing namespace std;\nint main() { cout << 1; }')).toBe('cpp')
  })

  it('returns null for short or ambiguous code', () => {
    for (const code of ['', 'x = 1', 'hello world', 'print("hi")', 'for (int i = 0; i < n; i++) {}']) {
      expect(detectLanguage(code)).toBeNull()
    }
  })
})

describe('resolveDetectedLanguage', () => {
  it('detects when the mode is auto', () => {
    expect(resolveDetectedLanguage('auto', 'cpp', SAMPLES.python[0])).toBe('python')
  })

  it('keeps the current language when the code is too short to tell', () => {
    expect(resolveDetectedLanguage('auto', 'java', 'x = 1')).toBe('java')
  })

  it('never changes once the language is locked manually', () => {
    expect(resolveDetectedLanguage('python', 'python', SAMPLES.cpp[0])).toBe('python')
    expect(resolveDetectedLanguage('cpp', 'cpp', SAMPLES.java[0])).toBe('cpp')
  })
})

describe('shouldRedetect', () => {
  it('does not trigger while typing one character at a time', () => {
    let code = SAMPLES.python[0]
    for (const ch of '\n#include <iostream>') {
      const next = code + ch
      expect(shouldRedetect(code, next)).toBe(false)
      code = next
    }
  })

  it('triggers when the content changes by more than half', () => {
    expect(shouldRedetect(SAMPLES.cpp[0], SAMPLES.python[0])).toBe(true)
  })

  it('does not trigger for an empty result', () => {
    expect(shouldRedetect(SAMPLES.cpp[0], '   \n')).toBe(false)
  })

  it('measures change ratio between 0 and 1', () => {
    expect(changeRatio('abc', 'abc')).toBe(0)
    expect(changeRatio('abc', 'xyz')).toBe(1)
    expect(changeRatio('', '')).toBe(0)
  })
})
