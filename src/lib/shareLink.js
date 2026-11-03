import { DEFAULT_SETTINGS } from '../config/defaults'
import { isDefaultFilename } from '../config/languages'
import { settingsValidators } from './settings'

// 分享链接：把代码和外观放进网址 # 后面，格式为 <页面地址>#s=<数据>。
// 数据 = JSON → deflate-raw 压缩 → base64url。# 后面的内容浏览器不会发给服务器，代码不会上传。
// 署名水印和界面语言是个人设置，不放进链接。

export const SHARE_VERSION = 1
export const SHARE_PARAM = 's'
// 完整网址的长度上限（字符数）
export const MAX_LINK_LENGTH = 8000
// 解压后的数据上限：防止被篡改的小数据解压成巨大的内容
const MAX_DECODED_BYTES = 1024 * 1024

// 放进链接的设置项
export const SHARED_KEYS = [
  'code',
  'language',
  'filename',
  'theme',
  'background',
  'padding',
  'fontSize',
  'lineNumbers',
  'startLine',
  'lineMarks',
]

// 失败的原因：unsupported 浏览器不支持压缩；too-long 网址太长；bad 链接内容无法解析
export const isShareSupported = () =>
  typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'

// ---- base64url ----
function toBase64Url(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text) {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) throw new Error('bad base64url')
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

// ---- 压缩 ----
async function pipe(bytes, stream, maxBytes = Infinity) {
  const writer = stream.writable.getWriter()
  // 写入的结果在读取时才会报错，这里不单独等待，避免出错时挂起
  writer.write(bytes).catch(() => {})
  writer.close().catch(() => {})
  const reader = stream.readable.getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > maxBytes) {
      reader.cancel().catch(() => {})
      throw new Error('too large')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(size)
  let at = 0
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  return out
}

// ---- 生成链接 ----
// baseUrl：不含 # 的页面地址。返回 { ok: true, url } 或 { ok: false, reason }
export async function encodeShare(settings, baseUrl) {
  if (!isShareSupported()) return { ok: false, reason: 'unsupported' }
  const payload = { v: SHARE_VERSION }
  for (const key of SHARED_KEYS) payload[key] = settings[key]
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(payload))
    const packed = await pipe(bytes, new CompressionStream('deflate-raw'))
    const url = `${baseUrl}#${SHARE_PARAM}=${toBase64Url(packed)}`
    if (url.length > MAX_LINK_LENGTH) return { ok: false, reason: 'too-long' }
    return { ok: true, url }
  } catch {
    return { ok: false, reason: 'unsupported' }
  }
}

// 从 location.hash 里取出分享数据；不是分享链接则返回 null
export function shareDataFromHash(hash) {
  const m = /^#s=(.*)$/.exec(hash ?? '')
  return m ? m[1] : null
}

// ---- 打开链接 ----
// data：# 后面 s= 之后的部分。返回 { ok: true, settings } 或 { ok: false, reason }
// settings 只含分享的那些项：不合法的项用默认值；filenameEdited 按文件名推出来（不是默认文件名就算改过）
export async function decodeShare(data) {
  if (!isShareSupported()) return { ok: false, reason: 'unsupported' }
  let payload
  try {
    if (typeof data !== 'string' || data.length === 0 || data.length > MAX_LINK_LENGTH) throw new Error('bad size')
    const bytes = await pipe(fromBase64Url(data), new DecompressionStream('deflate-raw'), MAX_DECODED_BYTES)
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    return { ok: false, reason: 'bad' }
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { ok: false, reason: 'bad' }
  if (payload.v !== SHARE_VERSION) return { ok: false, reason: 'bad' }
  // 没有代码就没有可打开的内容
  if (!settingsValidators.code(payload.code)) return { ok: false, reason: 'bad' }

  const settings = {}
  for (const key of SHARED_KEYS) {
    settings[key] = settingsValidators[key](payload[key]) ? payload[key] : structuredClone(DEFAULT_SETTINGS[key])
  }
  // 标记只能落在存在的行上
  const lineCount = settings.code.split('\n').length
  settings.lineMarks = settings.lineMarks.filter((m) => m.line < lineCount)
  settings.filenameEdited = !isDefaultFilename(settings.filename)
  return { ok: true, settings }
}
