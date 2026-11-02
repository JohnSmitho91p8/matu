import { sampleCode } from '../i18n'
import { DEFAULT_LANGUAGE, languageById } from './languages'

export const DEFAULT_FILENAME = languageById(DEFAULT_LANGUAGE).filename

// 背景到窗口的距离（px）；手机上屏幕窄，用 mobilePx，否则窗口会被挤得太窄
export const PADDINGS = [
  { id: 's', label: 'S', px: 32, mobilePx: 12 },
  { id: 'm', label: 'M', px: 64, mobilePx: 20 },
  { id: 'l', label: 'L', px: 96, mobilePx: 32 },
]

// 代码字号，行高固定 1.6
export const FONT_SIZES = [
  { id: 's', label: 'S', px: 13 },
  { id: 'm', label: 'M', px: 15 },
  { id: 'l', label: 'L', px: 17 },
]

export const BASE_FONT_SIZE = 15

// background 为 'none' 表示无背景
export const DEFAULT_SETTINGS = {
  theme: 'vitesse-dark',
  background: 'sunset',
  padding: 'm',
  fontSize: 'm',
  lineNumbers: true,
  code: sampleCode(),
  filename: DEFAULT_FILENAME,
  // 代码语言：'auto' 表示自动识别，否则是手动锁定的语言；detectedLanguage 是自动识别的结果
  language: 'auto',
  detectedLanguage: DEFAULT_LANGUAGE,
  // 文件名是否被用户改过（没改过就跟随语言）
  filenameEdited: false,
  // 被高亮的行号（0 开始）
  highlightedLines: [],
  // 署名水印
  watermarkEnabled: false,
  watermarkText: '',
}

export const WATERMARK_MAX_LENGTH = 30
