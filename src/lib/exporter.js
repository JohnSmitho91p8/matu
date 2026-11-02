import { domToBlob } from 'modern-screenshot'

// 电脑 2 倍，手机 3 倍（手机上常常放大看）
export const SCALE_DESKTOP = 2
export const SCALE_MOBILE = 3
const CODE_FONTS = ['JetBrains Mono', 'LXGW WenKai Mono', 'D2Coding']
// 无背景时卡片四周只有 16px，容不下 0 20px 68px 的阴影，导出时临时加宽透明边
const PAGE_PAD = 16
const EXPORT_PAD_NO_BG = 80

export async function renderBlob(cardEl, { noBackground = false, scale = SCALE_DESKTOP } = {}) {
  // 先同步让编辑框失去焦点，再等字体，避免光标出现在图里
  document.activeElement?.blur?.()
  // 字体按字符范围分包懒加载：先确保卡片里用到的字都已加载，再等其余字体
  const text = cardEl.textContent
  await Promise.all(CODE_FONTS.map((f) => document.fonts.load(`15px "${f}"`, text)))
  await document.fonts.ready

  const extra = noBackground ? EXPORT_PAD_NO_BG - PAGE_PAD : 0
  return domToBlob(cardEl, {
    scale,
    type: 'image/png',
    width: cardEl.offsetWidth + extra * 2,
    height: cardEl.offsetHeight + extra * 2,
    // 屏幕上卡片可能被缩小显示，导出时始终按原始尺寸
    style: { transform: 'none', ...(noBackground ? { padding: `${EXPORT_PAD_NO_BG}px` } : {}) },
    // 编辑框文字本来就是透明的，导出时直接去掉，光标和选区都不会出现
    filter: (node) => node.tagName !== 'TEXTAREA',
  })
}

// Safari 要求在点击事件里同步调用 clipboard.write，所以把 Promise 交给 ClipboardItem
export function copyImage(cardEl, options) {
  const blobPromise = renderBlob(cardEl, options)
  return navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })])
}

export async function downloadImage(cardEl, filename, options) {
  const blob = await renderBlob(cardEl, options)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// 手机：优先调起系统分享面板。分享成功或取消时返回 { status }；系统不支持或分享失败时返回生成好的图片，交给调用方显示预览
export async function shareImage(cardEl, filename, options) {
  const blob = await renderBlob(cardEl, options)
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
