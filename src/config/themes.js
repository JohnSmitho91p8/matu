// id 即 Shiki 内置主题名；bg / fg 用于窗口底色与前景色，
// keyword / string / comment 取自主题里对应的颜色，用来画工具栏里的迷你预览；
// wrong / right 是「错误」「正确」两种行标记的颜色（深色、浅色主题各一组）
export const THEMES = [
  { id: 'vitesse-dark', dark: true, bg: '#121212', fg: '#dbd7ca', keyword: '#4d9375', string: '#c98a7d', comment: '#758575', wrong: '#f85149', right: '#3fb950' },
  { id: 'catppuccin-mocha', dark: true, bg: '#1e1e2e', fg: '#cdd6f4', keyword: '#cba6f7', string: '#a6e3a1', comment: '#9399b2', wrong: '#f85149', right: '#3fb950' },
  { id: 'github-light', dark: false, bg: '#ffffff', fg: '#24292e', keyword: '#d73a49', string: '#032f62', comment: '#6a737d', wrong: '#cf222e', right: '#1a7f37' },
  { id: 'vitesse-light', dark: false, bg: '#ffffff', fg: '#393a34', keyword: '#1e754f', string: '#ab6354', comment: '#6b736b', wrong: '#cf222e', right: '#1a7f37' },
]
