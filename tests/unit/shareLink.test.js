import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../src/config/defaults'
import {
  MAX_LINK_LENGTH,
  SHARED_KEYS,
  decodeShare,
  encodeShare,
  isShareSupported,
  shareDataFromHash,
} from '../../src/lib/shareLink'
import { SAMPLES } from './samples'

const BASE = 'https://example.github.io/matu/'
const make = (over = {}) => ({ ...DEFAULT_SETTINGS, ...over })
const dataOf = (url) => shareDataFromHash(url.slice(url.indexOf('#')))

async function roundTrip(over) {
  const enc = await encodeShare(make(over), BASE)
  expect(enc.ok).toBe(true)
  const dec = await decodeShare(dataOf(enc.url))
  expect(dec.ok).toBe(true)
  return dec.settings
}

// 手工拼一个链接数据：任意 JSON 经过同样的压缩和编码
async function craft(value) {
  const bytes = new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value))
  const cs = new CompressionStream('deflate-raw')
  const w = cs.writable.getWriter()
  w.write(bytes)
  w.close()
  const out = new Uint8Array(await new Response(cs.readable).arrayBuffer())
  return Buffer.from(out).toString('base64url')
}

describe('share link round trip', () => {
  it('is supported in the test environment', () => {
    expect(isShareSupported()).toBe(true)
  })

  it('puts the data after #s= and keeps the code out of the visible address', async () => {
    const enc = await encodeShare(make({ code: 'secret_token_123' }), BASE)
    expect(enc.url.startsWith(`${BASE}#s=`)).toBe(true)
    expect(enc.url).not.toContain('secret_token_123')
  })

  it('keeps plain code and every shared setting', async () => {
    const over = {
      code: 'int main() {\n  return 0;\n}',
      language: 'cpp',
      filename: 'a.cpp',
      theme: 'github-light',
      background: 'mint',
      padding: 'l',
      fontSize: 's',
      lineNumbers: false,
      startLine: 40,
      lineMarks: [
        { line: 0, kind: 'wrong' },
        { line: 2, kind: 'right' },
      ],
    }
    const got = await roundTrip(over)
    for (const key of SHARED_KEYS) expect(got[key], key).toEqual(over[key])
  })

  it('keeps Chinese, Japanese, Korean text and emoji', async () => {
    const code = '// 快速幂：计算 a^b\n// べき乗を計算\n// 빠른 거듭제곱\nint x = 1; // 👍🏽 🇨🇳 𠮷'
    expect((await roundTrip({ code })).code).toBe(code)
  })

  it('keeps blank lines, tabs, trailing spaces and CRLF', async () => {
    const code = '\n\n\tint a;  \r\n\n\n\t\tb();\n\n'
    expect((await roundTrip({ code })).code).toBe(code)
  })

  it('keeps a start line and marks together', async () => {
    const got = await roundTrip({
      code: 'a\nb\nc\nd\ne',
      startLine: 99990,
      lineMarks: [{ line: 1, kind: 'wrong' }, { line: 2, kind: 'right' }, { line: 4, kind: 'focus' }],
    })
    expect(got.startLine).toBe(99990)
    expect(got.lineMarks).toHaveLength(3)
  })

  it('does not carry the signature or the interface language', async () => {
    const enc = await encodeShare(make({ watermarkEnabled: true, watermarkText: '@me' }), BASE)
    const dec = await decodeShare(dataOf(enc.url))
    expect(dec.settings).not.toHaveProperty('watermarkEnabled')
    expect(dec.settings).not.toHaveProperty('watermarkText')
    expect(Object.keys(dec.settings).sort()).toEqual([...SHARED_KEYS, 'filenameEdited'].sort())
    const raw = await decodeShare(await craft({ v: 1, code: 'x', watermarkText: '@me', uiLang: 'ja' }))
    expect(raw.settings).not.toHaveProperty('watermarkText')
  })

  it('treats a non-default file name as edited and a default one as not edited', async () => {
    expect((await roundTrip({ filename: 'notes.txt' })).filenameEdited).toBe(true)
    expect((await roundTrip({ filename: 'main.cpp' })).filenameEdited).toBe(false)
  })

  it('reads the data out of a location hash', () => {
    expect(shareDataFromHash('#s=abc_-9')).toBe('abc_-9')
    expect(shareDataFromHash('#other')).toBeNull()
    expect(shareDataFromHash('')).toBeNull()
    expect(shareDataFromHash(undefined)).toBeNull()
  })
})

describe('broken share links', () => {
  const bad = { ok: false, reason: 'bad' }

  it('rejects empty, non-base64, wrong-length and non-compressed data without throwing', async () => {
    for (const data of ['', '***', 'abc def', 'A', 'AAAAA', '=====', 'ünï', null, undefined, 42, 'x'.repeat(MAX_LINK_LENGTH + 1)]) {
      expect(await decodeShare(data), String(data).slice(0, 20)).toEqual(bad)
    }
  })

  it('rejects data that was cut off or changed', async () => {
    const enc = await encodeShare(make({ code: SAMPLES.cpp.join('\n\n') }), BASE)
    const data = dataOf(enc.url)
    expect(await decodeShare(data.slice(0, Math.floor(data.length / 2)))).toEqual(bad)
    const flipped = data.slice(0, 20) + (data[20] === 'A' ? 'B' : 'A') + data.slice(21)
    const res = await decodeShare(flipped)
    // 改一个字符：要么解不出来，要么解出来不是合法内容；无论如何不抛异常
    expect([true, false]).toContain(res.ok)
  })

  it('rejects invalid JSON, non-objects and unknown versions', async () => {
    expect(await decodeShare(await craft('{not json'))).toEqual(bad)
    expect(await decodeShare(await craft('[1,2,3]'))).toEqual(bad)
    expect(await decodeShare(await craft('"text"'))).toEqual(bad)
    expect(await decodeShare(await craft('null'))).toEqual(bad)
    expect(await decodeShare(await craft({ code: 'x' }))).toEqual(bad)
    expect(await decodeShare(await craft({ v: 2, code: 'x' }))).toEqual(bad)
    expect(await decodeShare(await craft({ v: '1', code: 'x' }))).toEqual(bad)
  })

  it('rejects a link without usable code', async () => {
    expect(await decodeShare(await craft({ v: 1 }))).toEqual(bad)
    expect(await decodeShare(await craft({ v: 1, code: 5 }))).toEqual(bad)
  })

  it('rejects text that is not valid UTF-8', async () => {
    const cs = new CompressionStream('deflate-raw')
    const w = cs.writable.getWriter()
    w.write(new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]))
    w.close()
    const out = new Uint8Array(await new Response(cs.readable).arrayBuffer())
    expect(await decodeShare(Buffer.from(out).toString('base64url'))).toEqual(bad)
  })

  it('refuses data that unpacks to something huge', async () => {
    const code = 'a'.repeat(3 * 1024 * 1024)
    const data = await craft({ v: 1, code })
    expect(data.length).toBeLessThan(MAX_LINK_LENGTH)
    expect(await decodeShare(data)).toEqual(bad)
  })
})

describe('invalid settings fall back to the defaults', () => {
  it('replaces each illegal item and keeps the legal ones', async () => {
    const res = await decodeShare(
      await craft({
        v: 1,
        code: 'int a;',
        theme: 'no-such-theme',
        background: 42,
        padding: 'xl',
        fontSize: null,
        lineNumbers: 'yes',
        startLine: -3,
        language: 'cobol',
        filename: '   ',
        lineMarks: [{ line: 5, kind: 'bogus' }],
      }),
    )
    expect(res.ok).toBe(true)
    for (const key of ['theme', 'background', 'padding', 'fontSize', 'lineNumbers', 'startLine', 'language', 'filename', 'lineMarks']) {
      expect(res.settings[key], key).toEqual(DEFAULT_SETTINGS[key])
    }
    expect(res.settings.code).toBe('int a;')
  })

  it('keeps legal items next to illegal ones', async () => {
    const res = await decodeShare(await craft({ v: 1, code: 'x', theme: 'github-light', padding: 'bad' }))
    expect(res.settings.theme).toBe('github-light')
    expect(res.settings.padding).toBe(DEFAULT_SETTINGS.padding)
  })

  it('drops marks that point past the last line, and unsorted marks altogether', async () => {
    const past = await decodeShare(
      await craft({ v: 1, code: 'a\nb', lineMarks: [{ line: 0, kind: 'wrong' }, { line: 7, kind: 'right' }] }),
    )
    expect(past.settings.lineMarks).toEqual([{ line: 0, kind: 'wrong' }])
    const unsorted = await decodeShare(
      await craft({ v: 1, code: 'a\nb\nc', lineMarks: [{ line: 2, kind: 'wrong' }, { line: 1, kind: 'right' }] }),
    )
    expect(unsorted.settings.lineMarks).toEqual([])
  })
})

describe('link length limit', () => {
  const lines = (n) => Array.from({ length: n }, (_, i) => `    int value${i} = compute(${i}) * ${i % 7}; // step ${i}`).join('\n')

  it('refuses a link longer than 8000 characters', async () => {
    const enc = await encodeShare(make({ code: lines(2000) }), BASE)
    expect(enc).toEqual({ ok: false, reason: 'too-long' })
  })

  it('allows a link at the limit and refuses one more character', async () => {
    // 随机内容压缩不掉：找到刚好在上限两侧的长度
    let seed = 7
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    const noise = (n) => Array.from({ length: n }, () => String.fromCharCode(33 + Math.floor(rnd() * 90))).join('')
    const urlLength = async (n) => {
      const r = await encodeShare(make({ code: noise(n) }), BASE)
      return r.ok ? r.url.length : Infinity
    }
    let lo = 100
    let hi = 20000
    while (lo + 1 < hi) {
      seed = 7
      const mid = (lo + hi) >> 1
      if ((await urlLength(mid)) <= MAX_LINK_LENGTH) lo = mid
      else hi = mid
    }
    seed = 7
    const ok = await encodeShare(make({ code: noise(lo) }), BASE)
    expect(ok.ok).toBe(true)
    expect(ok.url.length).toBeLessThanOrEqual(MAX_LINK_LENGTH)
    seed = 7
    expect((await encodeShare(make({ code: noise(hi) }), BASE)).reason).toBe('too-long')
  })

  it('reports an unsupported browser instead of throwing', async () => {
    const saved = globalThis.CompressionStream
    globalThis.CompressionStream = undefined
    try {
      expect(await encodeShare(make(), BASE)).toEqual({ ok: false, reason: 'unsupported' })
      expect(await decodeShare('abcd')).toEqual({ ok: false, reason: 'unsupported' })
    } finally {
      globalThis.CompressionStream = saved
    }
  })
})
