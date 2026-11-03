// 导出图片时需要把字体一起嵌进去（图片是在一个独立的 SVG 里渲染的，用不到页面上已经加载好的字体）。
// 这里自己准备字体，而不是让导出库去下载：
//  - 只嵌入卡片里的字真正用到的字体分包（中日韩字体按字符范围切成了很多小包）
//  - 下载下来的字体缓存在内存里，第二次导出不用再下载、转码
//  - 每个字体文件最多等 timeout 毫秒；下载失败或太慢就跳过它，改用系统字体，导出照常完成

// "U+20-7E, U+A0" → [[0x20, 0x7e], [0xa0, 0xa0]]
export function parseUnicodeRange(text) {
  return String(text)
    .split(',')
    .map((part) => part.trim().replace(/^U\+/i, ''))
    .filter(Boolean)
    .map((part) => {
      if (part.includes('?')) return [parseInt(part.replace(/\?/g, '0'), 16), parseInt(part.replace(/\?/g, 'F'), 16)]
      const [from, to = from] = part.split('-')
      return [parseInt(from, 16), parseInt(to, 16)]
    })
}

// 这一份字体分包里有没有任何一个字符会被用到
export function facesNeeded(ranges, codePoints) {
  if (!ranges.length) return true // 没写 unicode-range：整个字体都可能被用到
  for (const cp of codePoints) {
    for (const [from, to] of ranges) if (cp >= from && cp <= to) return true
  }
  return false
}

const dataUrlCache = new Map() // 字体文件的地址 → 已经转好的 data URL

async function fetchDataUrl(url, timeout) {
  if (dataUrlCache.has(url)) return dataUrlCache.get(url)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null
    const blob = await response.blob()
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    dataUrlCache.set(url, dataUrl)
    return dataUrl
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function fontFaceRules() {
  const rules = []
  for (const sheet of document.styleSheets) {
    let cssRules
    try {
      cssRules = sheet.cssRules
    } catch {
      continue // 跨域样式表读不了
    }
    for (const rule of cssRules) {
      if (typeof CSSFontFaceRule !== 'undefined' && rule instanceof CSSFontFaceRule) rules.push({ rule, sheet })
    }
  }
  return rules
}

// 返回要嵌入图片的 @font-face 样式文本；一个字体都用不上或全部失败时返回空字符串
export async function buildFontCss(text, { timeout = 3000 } = {}) {
  const codePoints = [...new Set([...text].map((ch) => ch.codePointAt(0)))]
  const jobs = fontFaceRules().map(async ({ rule, sheet }) => {
    const style = rule.style
    if (!facesNeeded(parseUnicodeRange(style.getPropertyValue('unicode-range')), codePoints)) return ''
    const src = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(style.getPropertyValue('src'))?.[1]
    if (!src || src.startsWith('data:')) return ''
    const dataUrl = await fetchDataUrl(new URL(src, sheet.href || document.baseURI).href, timeout)
    if (!dataUrl) return ''
    const descriptors = ['font-family', 'font-weight', 'font-style', 'font-stretch', 'size-adjust', 'unicode-range']
      .map((name) => [name, style.getPropertyValue(name)])
      .filter(([, value]) => value)
      .map(([name, value]) => `${name}: ${value};`)
    return `@font-face { ${descriptors.join(' ')} src: url("${dataUrl}") format("woff2"); }`
  })
  return (await Promise.all(jobs)).filter(Boolean).join('\n')
}
