import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

let highlighterPromise

// 只打包 cpp 语法和 4 个主题
export function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      langs: [import('shiki/langs/cpp.mjs')],
      themes: [
        import('shiki/themes/vitesse-dark.mjs'),
        import('shiki/themes/catppuccin-mocha.mjs'),
        import('shiki/themes/github-light.mjs'),
        import('shiki/themes/vitesse-light.mjs'),
      ],
      engine: createJavaScriptRegexEngine(),
    })
  }
  return highlighterPromise
}

// 返回每一行的 token 列表：[{ content, color, fontStyle }]
export function highlightLines(highlighter, code, theme) {
  return highlighter.codeToTokens(code, { lang: 'cpp', theme }).tokens
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
