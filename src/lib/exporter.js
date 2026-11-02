import { domToBlob } from 'modern-screenshot'

const SCALE = 2
const CODE_FONTS = ['JetBrains Mono', 'LXGW WenKai Mono', 'D2Coding']
// 无背景时卡片四周只有 16px，容不下 0 20px 68px 的阴影，导出时临时加宽透明边
const PAGE_PAD = 16
const EXPORT_PAD_NO_BG = 80

export async function renderBlob(cardEl, { noBackground = false } = {}) {
  // 先同步让编辑框失去焦点，再等字体，避免光标出现在图里
  document.activeElement?.blur?.()
  // 字体按字符范围分包懒加载：先确保卡片里用到的字都已加载，再等其余字体
  const text = cardEl.textContent
  await Promise.all(CODE_FONTS.map((f) => document.fonts.load(`15px "${f}"`, text)))
  await document.fonts.ready

  const extra = noBackground ? EXPORT_PAD_NO_BG - PAGE_PAD : 0
  return domToBlob(cardEl, {
    scale: SCALE,
    type: 'image/png',
    width: cardEl.offsetWidth + extra * 2,
    height: cardEl.offsetHeight + extra * 2,
    style: noBackground ? { padding: `${EXPORT_PAD_NO_BG}px` } : undefined,
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
