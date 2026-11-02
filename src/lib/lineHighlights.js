// 行高亮按行号记录（0 开始）。代码被编辑后，让高亮尽量跟着原来那一行移动：
// 用公共前缀 / 后缀找出被改动的区域，后缀部分整体平移，改动区域内按位置对应。
export function remapHighlights(indices, oldCode, newCode) {
  if (!indices.length || oldCode === newCode) return indices
  const oldLines = oldCode.split('\n')
  const newLines = newCode.split('\n')
  const limit = Math.min(oldLines.length, newLines.length)

  let p = 0
  while (p < limit && oldLines[p] === newLines[p]) p++
  let s = 0
  while (s < limit - p && oldLines[oldLines.length - 1 - s] === newLines[newLines.length - 1 - s]) s++

  const newMid = newLines.length - p - s
  const shift = newLines.length - oldLines.length
  const mapped = new Set()
  for (const i of indices) {
    let j
    if (i < p) j = i
    else if (i >= oldLines.length - s) j = i + shift
    else if (newMid === 0) continue
    else j = p + Math.min(i - p, newMid - 1)
    if (j >= 0 && j < newLines.length) mapped.add(j)
  }
  return [...mapped].sort((a, b) => a - b)
}

// 点击行号：普通点击切换这一行；Shift + 点击把锚点行到这一行之间整段高亮
export function toggleHighlight(indices, index, anchor, shift) {
  const set = new Set(indices)
  if (shift && anchor != null && anchor !== index) {
    const [from, to] = anchor < index ? [anchor, index] : [index, anchor]
    for (let i = from; i <= to; i++) set.add(i)
  } else if (set.has(index)) {
    set.delete(index)
  } else {
    set.add(index)
  }
  return [...set].sort((a, b) => a - b)
}
