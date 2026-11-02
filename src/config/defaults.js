import { sampleCode } from '../i18n'

export const DEFAULT_FILENAME = 'main.cpp'

// 背景到窗口的距离（px）
export const PADDINGS = [
  { id: 's', label: 'S', px: 32 },
  { id: 'm', label: 'M', px: 64 },
  { id: 'l', label: 'L', px: 96 },
]

// background 为 'none' 表示无背景
export const DEFAULT_SETTINGS = {
  theme: 'vitesse-dark',
  background: 'sunset',
  padding: 'm',
  lineNumbers: true,
  code: sampleCode(),
  filename: DEFAULT_FILENAME,
}
