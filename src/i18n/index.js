import { ref, watchEffect } from 'vue'
import { FALLBACK_LANG, LANGUAGES, SAMPLE_CODES, messages } from './messages'

const KEY = 'matu:lang'

const isSupported = (code) => LANGUAGES.some((l) => l.code === code)

// 根据浏览器语言偏好挑选界面语言，匹配不到用英文
function detectLang() {
  for (const tag of navigator.languages?.length ? navigator.languages : [navigator.language]) {
    const base = String(tag || '').toLowerCase().split('-')[0]
    if (base === 'zh') return 'zh-CN'
    if (base === 'ja') return 'ja'
    if (base === 'ko') return 'ko'
    if (base === 'en') return 'en'
  }
  return FALLBACK_LANG
}

function loadLang() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && isSupported(saved)) return saved
  } catch (e) {
    // 读不到就按浏览器语言
  }
  return detectLang()
}

export const lang = ref(loadLang())

export function setLang(code) {
  if (!isSupported(code)) return
  lang.value = code
  try {
    localStorage.setItem(KEY, code)
  } catch (e) {
    // 存储不可用：忽略
  }
}

export function t(key) {
  return messages[lang.value]?.[key] ?? messages[FALLBACK_LANG][key] ?? key
}

export function sampleCode(code = lang.value) {
  return SAMPLE_CODES[code] ?? SAMPLE_CODES[FALLBACK_LANG]
}

// 当前代码是不是某一种语言的默认示例（是的话，切换语言时才跟着换）
export function isSampleCode(code) {
  return Object.values(SAMPLE_CODES).includes(code)
}

// 页面标题、描述、<html lang> 跟随语言
export function useDocumentLang() {
  watchEffect(() => {
    const meta = LANGUAGES.find((l) => l.code === lang.value)
    document.documentElement.lang = meta.htmlLang
    document.title = t('app.title')
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('app.description'))
  })
}

export { LANGUAGES }
