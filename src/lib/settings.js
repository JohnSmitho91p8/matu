import { THEMES } from '../config/themes'
import { BACKGROUNDS } from '../config/backgrounds'
import { DEFAULT_SETTINGS, FONT_SIZES, PADDINGS, WATERMARK_MAX_LENGTH } from '../config/defaults'
import { isCodeLanguage, isDefaultFilename } from '../config/languages'
import { loadSettings } from './storage'

// 每个设置项的合法值；读到不合法的值（或旧版本没有的项）就用默认值
export const settingsValidators = {
  theme: (v) => THEMES.some((t) => t.id === v),
  background: (v) => v === 'none' || BACKGROUNDS.some((b) => b.id === v),
  padding: (v) => PADDINGS.some((p) => p.id === v),
  fontSize: (v) => FONT_SIZES.some((f) => f.id === v),
  lineNumbers: (v) => typeof v === 'boolean',
  code: (v) => typeof v === 'string',
  filename: (v) => typeof v === 'string' && v.trim() !== '',
  language: (v) => v === 'auto' || isCodeLanguage(v),
  detectedLanguage: isCodeLanguage,
  filenameEdited: (v) => typeof v === 'boolean',
  watermarkEnabled: (v) => typeof v === 'boolean',
  watermarkText: (v) => typeof v === 'string' && v.length <= WATERMARK_MAX_LENGTH,
  highlightedLines: (v) => Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= 0),
}

export function loadAppSettings() {
  const settings = loadSettings(DEFAULT_SETTINGS, settingsValidators)
  // 旧版本保存的文件名没有「是否改过」的记录：不是默认名就认为是用户改过的
  if (!settings.filenameEdited && !isDefaultFilename(settings.filename)) settings.filenameEdited = true
  return settings
}
