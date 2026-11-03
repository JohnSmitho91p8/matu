// 行标记：[{ line, kind }]，line 是行下标（0 开始），按 line 升序，同一行最多一条。
// kind：focus（聚焦）、wrong（错误）、right（正确）
export const MARK_KINDS = ['focus', 'wrong', 'right']

// 单击时的循环顺序：无 → 聚焦 → 错误 → 正确 → 无
const CYCLE = [null, ...MARK_KINDS]

const toMarks = (map) => [...map].sort((a, b) => a[0] - b[0]).map(([line, kind]) => ({ line, kind }))

// 代码被编辑后，让标记尽量跟着原来那一行移动（kind 跟着走）：
// 用公共前缀 / 后缀找出被改动的区域，后缀部分整体平移，改动区域内按位置对应。
// 两条标记落到同一行时，保留原来靠后的那一条
export function remapHighlights(marks, oldCode, newCode) {
  if (!marks.length || oldCode === newCode) return marks
  const oldLines = oldCode.split('\n')
  const newLines = newCode.split('\n')
  const limit = Math.min(oldLines.length, newLines.length)

  let p = 0
  while (p < limit && oldLines[p] === newLines[p]) p++
  let s = 0
  while (s < limit - p && oldLines[oldLines.length - 1 - s] === newLines[newLines.length - 1 - s]) s++

  const newMid = newLines.length - p - s
  const shift = newLines.length - oldLines.length
  const mapped = new Map()
  for (const { line: i, kind } of marks) {
    let j
    if (i < p) j = i
    else if (i >= oldLines.length - s) j = i + shift
    else if (newMid === 0) continue
    else j = p + Math.min(i - p, newMid - 1)
    if (j >= 0 && j < newLines.length) mapped.set(j, kind)
  }
  return toMarks(mapped)
}

// 点击行号：
// - 普通点击：这一行的标记按 无 → 聚焦 → 错误 → 正确 → 无 循环
// - Shift + 点击：锚点行到这一行之间的每一行，都设成锚点行当前的标记；锚点行没有标记时整段设为聚焦
// cycle 是单击循环用到的标记种类（默认三种都用）
export function toggleHighlight(marks, index, anchor, shift, cycle = MARK_KINDS) {
  const map = new Map(marks.map((m) => [m.line, m.kind]))
  if (shift && anchor != null && anchor !== index) {
    const kind = map.get(anchor) ?? 'focus'
    const [from, to] = anchor < index ? [anchor, index] : [index, anchor]
    for (let i = from; i <= to; i++) map.set(i, kind)
  } else {
    const order = [null, ...cycle]
    const next = order[(order.indexOf(map.get(index) ?? null) + 1) % order.length]
    if (next) map.set(index, next)
    else map.delete(index)
  }
  return toMarks(map)
}

// 标记是否合法：对象数组，line 为非负整数且严格升序（同一行最多一条），kind 只能是三种之一
export function isValidMarks(v) {
  if (!Array.isArray(v)) return false
  let last = -1
  for (const m of v) {
    if (!m || typeof m !== 'object' || !Number.isInteger(m.line) || m.line <= last) return false
    if (!MARK_KINDS.includes(m.kind)) return false
    last = m.line
  }
  return true
}

// 旧版本保存的是 highlightedLines（行下标数组）：每个行号转成一条聚焦标记；数据不合法则返回 null
export function marksFromLegacy(lines) {
  if (!Array.isArray(lines) || !lines.every((n) => Number.isInteger(n) && n >= 0)) return null
  return [...new Set(lines)].sort((a, b) => a - b).map((line) => ({ line, kind: 'focus' }))
}
