export const START_LINE_MIN = 1
export const START_LINE_MAX = 99999

export const isValidStartLine = (v) => Number.isInteger(v) && v >= START_LINE_MIN && v <= START_LINE_MAX

// 输入框失去焦点或按回车时整理输入：空值或不是正整数的恢复为 1，超出范围的夹到 1 或 99999
export function normalizeStartLine(raw) {
  const text = String(raw ?? '').trim()
  if (!/^\d+$/.test(text)) return START_LINE_MIN
  const n = Number(text)
  return Math.min(START_LINE_MAX, Math.max(START_LINE_MIN, n))
}
