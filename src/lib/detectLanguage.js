// 轻量的规则打分：每种语言列出特征，命中就加分，取最高分
// 得分太低、或者并列第一时返回 null（保持当前语言不变）
const MIN_SCORE = 3

// 只有 C++ 才有的写法：出现时不再把代码判成 C
const CPP_ONLY = /\b(cout|cin|cerr)\b|std::|using\s+namespace|template\s*<|\bclass\s+\w+|\bnullptr\b|#include\s*<(iostream|bits\/stdc\+\+\.h|vector|string|algorithm|map|set|queue|cstdio|cstdlib|cmath|cstring)>/

const RULES = {
  cpp: [
    [/#include\s*<(iostream|bits\/stdc\+\+\.h|vector|string|algorithm|map|set|queue|stack|cstdio|cstdlib|cmath|cstring|numeric|unordered_map|unordered_set|functional|sstream|fstream)>/, 5],
    [/\bstd::/, 3],
    [/\b(cout|cin|cerr)\b/, 3],
    [/\busing\s+namespace\b/, 4],
    [/\btemplate\s*</, 4],
    [/\b(vector|map|set|pair|unordered_map|unordered_set|priority_queue|queue|stack)\s*</, 3],
    [/\bendl\b/, 2],
    [/\bnullptr\b/, 2],
    [/\bauto\s*&?\s*\w+\s*[=:]/, 1],
    [/\blong\s+long\b/, 1],
    [/\bclass\s+\w+\s*(:\s*(public|private)\s+\w+\s*)?\{/, 1],
    [/\w::\w/, 1],
  ],
  c: [
    [/#include\s*<(stdio|stdlib|string|math|time|ctype|stdint|stdbool|unistd|limits|assert)\.h>/, 5],
    [/\b(printf|scanf|puts|getchar|putchar)\s*\(/, 3],
    [/\b(malloc|calloc|realloc|free)\s*\(/, 3],
    [/\btypedef\b/, 1],
    [/\bstruct\s+\w+\s*\{/, 1],
    [/\bint\s+main\s*\(\s*(void|int\b)/, 1],
    [/^\s*#define\b/m, 1],
  ],
  python: [
    [/^\s*def\s+\w+\s*\(.*\)\s*(->\s*[^:]+)?:/m, 5],
    [/^\s*from\s+[\w.]+\s+import\s/m, 4],
    [/^\s*import\s+[\w.]+(\s+as\s+\w+)?(\s*,\s*[\w.]+)*\s*$/m, 3],
    [/\bprint\s*\(/, 2],
    [/^\s*elif\b/m, 4],
    [/^\s*(if|else|for|while|try|except|finally|with|class|def)\b[^\n{;]*:\s*$/m, 4],
    [/\bself\./, 3],
    [/\b(None|True|False)\b/, 2],
    [/__name__|__init__/, 4],
    [/\blambda\b[^\n]*:/, 2],
    [/^\s*#(?!include|define|if|endif|pragma)/m, 1],
  ],
  java: [
    [/\bpublic\s+static\s+void\s+main\b/, 6],
    [/\bpublic\s+(abstract\s+|final\s+)?(class|interface|enum)\b/, 5],
    [/\bSystem\.(out|err)\.print/, 5],
    [/^\s*import\s+(java|javax)\./m, 5],
    [/^\s*package\s+[\w.]+;/m, 4],
    [/\bString\s*\[\]/, 3],
    [/@Override\b/, 3],
    [/\b(private|protected)\s+(static\s+)?(final\s+)?[\w<>[\]]+\s+\w+\s*[(;=]/, 2],
    [/\b(extends|implements)\s+\w+/, 2],
    [/\bnew\s+\w+(<[^>]*>)?\s*\(/, 1],
  ],
  javascript: [
    [/\bconsole\.(log|error|warn)\s*\(/, 5],
    [/\bdocument\.|\bwindow\./, 4],
    [/\b(const|let)\s+[\w{[]/, 3],
    [/\bfunction\s*\w*\s*\(/, 3],
    [/=>/, 3],
    [/\brequire\s*\(|\bmodule\.exports\b/, 4],
    [/^\s*import\s+[^;\n]*\sfrom\s+['"]/m, 4],
    [/^\s*export\s+(default|const|function|class)\b/m, 3],
    [/[!=]==/, 2],
    [/\bvar\s+\w+/, 1],
    [/\b(undefined|async|await)\b|\$\{/, 1],
  ],
}

export function scoreLanguages(code) {
  const hasCppOnly = CPP_ONLY.test(code)
  const scores = {}
  for (const [id, rules] of Object.entries(RULES)) {
    scores[id] = id === 'c' && hasCppOnly ? 0 : rules.reduce((sum, [re, w]) => sum + (re.test(code) ? w : 0), 0)
  }
  return scores
}

export function detectLanguage(code) {
  const ranked = Object.entries(scoreLanguages(code)).sort((a, b) => b[1] - a[1])
  const [best, second] = ranked
  if (best[1] < MIN_SCORE || best[1] === second[1]) return null
  return best[0]
}

// 两段文本的变化比例（0 到 1）：用公共前后缀估算，足够判断「大幅变化」
export function changeRatio(prev, next) {
  const max = Math.max(prev.length, next.length)
  if (max === 0) return 0
  let p = 0
  const minLen = Math.min(prev.length, next.length)
  while (p < minLen && prev[p] === next[p]) p++
  let s = 0
  while (s < minLen - p && prev[prev.length - 1 - s] === next[next.length - 1 - s]) s++
  return (max - p - s) / max
}
