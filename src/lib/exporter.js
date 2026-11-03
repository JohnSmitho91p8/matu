import { buildFontCss, waitForEmbeddedFonts } from './exportFonts'


// 电脑 2 倍，手机 3 倍（手机上常常放大看）
export const SCALE_DESKTOP = 2
export const SCALE_MOBILE = 3
const CODE_FONTS = ['JetBrains Mono', 'LXGW WenKai Mono', 'D2Coding']
// 卡片里用到的、会影响外观的样式属性（computed style 的长属性名）。
// 卡片的样式有改动时，如果导出的图和屏幕上不一样，先检查这里是不是漏了属性
const STYLE_PROPERTIES = [
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'box-sizing', 'overflow-x', 'overflow-y',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
  'align-items', 'align-self', 'align-content', 'justify-content', 'row-gap', 'column-gap',
  'background-color', 'background-image', 'background-size', 'background-repeat',
  'background-position-x', 'background-position-y', 'background-origin', 'background-clip',
  'color', 'opacity', 'visibility', 'box-shadow', 'transform', 'transform-origin',
  'font-family', 'font-size', 'font-style', 'font-weight', 'font-variant-ligatures', 'font-kerning',
  'line-height', 'letter-spacing', 'word-spacing', 'text-align', 'text-indent', 'text-transform',
  'text-decoration-line', 'text-decoration-color', 'text-decoration-style',
  'white-space', 'tab-size', 'overflow-wrap', 'word-break', 'text-overflow', 'vertical-align',
  'direction', 'unicode-bidi',
]

// ---- 导出的几个固定数值 ----


// 等字体加载的最长时间：网络很慢或字体加载失败时，超时后照常导出（用系统字体），不能一直卡住
const FONT_TIMEOUT = 3000

// 画布大小上限。各浏览器不一样，iPhone / iPad 的 Safari 最严格：
//   iOS Safari：面积不超过 16,777,216 像素（4096 × 4096）
//   桌面 Chrome / Safari / Firefox：面积约 2.68 亿像素，单边约 32,767 像素
// 这里取留有余量的安全值：iOS 设备 1600 万像素，其余 6400 万像素，单边都不超过 32,000 像素。
// 超出时先降低倍率（3 → 2 → 1），降到 1 倍仍然超出就放弃，提示「代码太长，无法生成图片」
export const MAX_PIXELS_IOS = 16_000_000
export const MAX_PIXELS_DESKTOP = 64_000_000
export const MAX_SIDE = 32_000

export class ExportError extends Error {
  constructor(code) {
    super(code)
    this.name = 'ExportError'
    this.code = code // 'empty' | 'too-large'
  }
}

export function isIOSDevice() {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

// 在不超过画布上限的前提下，选出不大于期望值的最高整数倍率；一档都放不下返回 null
export function chooseScale(width, height, desired, { maxPixels, maxSide = MAX_SIDE } = {}) {
  for (const scale of [3, 2, 1]) {
    if (scale > desired) continue
    const w = width * scale
    const h = height * scale
    if (w <= maxSide && h <= maxSide && w * h <= maxPixels) return scale
  }
  return null
}

// 图片就是卡片本身的大小：有背景时包含背景边距，无背景时只有窗口（没有边距，也没有阴影）
function exportGeometry(cardEl) {
  return { width: cardEl.offsetWidth, height: cardEl.offsetHeight }
}

// 这张卡片现在能不能导出？返回 null（可以）或 'too-large'。计算很便宜，点击时可以同步调用
export function exportProblem(cardEl) {
  const { width, height } = exportGeometry(cardEl)
  const maxPixels = isIOSDevice() ? MAX_PIXELS_IOS : MAX_PIXELS_DESKTOP
  return chooseScale(width, height, 1, { maxPixels }) ? null : 'too-large'
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))])
}

// 导出库只在真正导出时才加载，首次打开页面少下载一份代码；空闲时会提前加载好
let libraryPromise
export function loadExportLibrary() {
  libraryPromise ??= import('modern-screenshot')
  return libraryPromise
}

export async function renderBlob(cardEl, { scale: desired = SCALE_DESKTOP } = {}) {
  const { width, height } = exportGeometry(cardEl)
  const maxPixels = isIOSDevice() ? MAX_PIXELS_IOS : MAX_PIXELS_DESKTOP
  const scale = chooseScale(width, height, desired, { maxPixels })
  if (!scale) throw new ExportError('too-large')

  const { domToBlob } = await loadExportLibrary()
  // 字体按字符范围分包懒加载：先确保卡片里用到的字都已加载；同时准备要嵌入图片的字体（自己下载并缓存，见 exportFonts.js）。
  // 两件事同时进行，合起来最多等 FONT_TIMEOUT：字体加载失败或很慢时，超时后照常导出（用系统字体）
  const text = [...new Set(cardEl.textContent)].join('')
  const pageFontsReady = withTimeout(
    Promise.all([...CODE_FONTS.map((f) => document.fonts.load(`15px "${f}"`, text)), document.fonts.ready]).catch(() => {}),
    FONT_TIMEOUT,
  )
  const [, fonts] = await Promise.all([pageFontsReady, buildFontCss(text, { timeout: FONT_TIMEOUT })])
  await waitForEmbeddedFonts(fonts, FONT_TIMEOUT)
  const fontCss = fonts.css

  // 主题、颜色切换有 200ms 的过渡动画：等动画结束再取样式，否则会导出到一半的颜色
  await withTimeout(Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))), 600)

  return domToBlob(cardEl, {
    font: fontCss ? { cssText: fontCss } : false,
    scale,
    type: 'image/png',
    // 只复制渲染用得到的样式：默认会逐个元素读取三百多个样式属性，几百行代码时占了导出时间的大部分
    includeStyleProperties: STYLE_PROPERTIES,
    width,
    height,
    // 屏幕上卡片可能被缩小显示，导出时始终按原始尺寸
    style: { transform: 'none' },
    // 编辑框文字本来就是透明的，导出时直接去掉，光标和选区都不会出现
    filter: (node) => node.tagName !== 'TEXTAREA',
  })
}

// Safari 要求在点击事件里同步调用 clipboard.write，所以把 Promise 交给 ClipboardItem
// （图片已经提前生成好时，这个 Promise 是现成的）
export function copyImage(blobPromise) {
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])
}

export async function downloadImage(blobPromise, filename) {
  const blob = await blobPromise
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 手机：优先调起系统分享面板。分享成功或取消时返回 { status }；系统不支持或分享失败时返回生成好的图片，交给调用方显示预览
export async function shareImage(blobPromise, filename) {
  const blob = await blobPromise
  const file = new File([blob], `${filename}.png`, { type: 'image/png' })
  if (!navigator.canShare?.({ files: [file] })) return { blob }
  try {
    await navigator.share({ files: [file] })
    return { status: 'shared' }
  } catch (e) {
    if (e?.name === 'AbortError') return { status: 'cancelled' }
    return { blob }
  }
}
