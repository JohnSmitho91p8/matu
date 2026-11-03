import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

let highlighterPromise

// 语法和主题都按需加载：首次打开只下载当前用到的那一份（默认是 C++ 和晨雾主题）。
// C++ 的语法文件本身有 780 kB（里面包含了它内嵌的宏、正则、GLSL 语法），无法再拆小；其余语言和主题都很小
const LANGUAGE_LOADERS = {
  cpp: () => import('shiki/langs/cpp.mjs'),
  c: () => import('shiki/langs/c.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  java: () => import('shiki/langs/java.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
}

const THEME_LOADERS = {
  'vitesse-dark': () => import('shiki/themes/vitesse-dark.mjs'),
  'catppuccin-mocha': () => import('shiki/themes/catppuccin-mocha.mjs'),
  'github-light': () => import('shiki/themes/github-light.mjs'),
  'vitesse-light': () => import('shiki/themes/vitesse-light.mjs'),
}

export function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      langs: [],
      themes: [],
      engine: createJavaScriptRegexEngine(),
    })
  }
  return highlighterPromise
}

// 确保指定的语言和主题已经加载好，返回高亮器
export async function ensureLoaded(lang, theme) {
  const highlighter = await getHighlighter()
  const jobs = []
  if (!highlighter.getLoadedLanguages().includes(lang)) jobs.push(highlighter.loadLanguage(LANGUAGE_LOADERS[lang]()))
  if (!highlighter.getLoadedThemes().includes(theme)) jobs.push(highlighter.loadTheme(THEME_LOADERS[theme]()))
  await Promise.all(jobs)
  return highlighter
}

// 空闲时把其余主题也预先加载好（每个只有十几 kB），切换主题时颜色不会晚一拍
export function preloadThemes() {
  const run = () => Promise.all(Object.keys(THEME_LOADERS).map((id) => getHighlighter().then((h) => !h.getLoadedThemes().includes(id) && h.loadTheme(THEME_LOADERS[id]())))).catch(() => {})
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}

// 返回每一行的 token 列表：[{ content, color, fontStyle }]
export function highlightLines(highlighter, code, theme, lang) {
  return highlighter.codeToTokens(code, { lang, theme }).tokens
}

// 主题的注释色，用于行号
export function getCommentColor(highlighter, theme) {
  const { settings } = highlighter.getTheme(theme)
  const hit = settings.find((s) => {
    const scopes = [].concat(s.scope || [])
    return scopes.includes('comment') && s.settings?.foreground
  })
  return hit?.settings.foreground ?? null
}
