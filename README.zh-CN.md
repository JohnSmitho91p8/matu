[English](README.md) | 简体中文

# cpp-shot

把 C++ 代码变成好看的图片，一键复制，分享给任何人。

![效果截图](docs/screenshot.png)

**在线使用：<https://JohnSmitho91p8.github.io/cpp-shot/>**

## 功能

- **直接在卡片里编辑**：打字或粘贴代码，所见即所得
- **C++ 语法高亮**：使用 [Shiki](https://shiki.style)，与 VS Code 同一套高亮引擎
- **4 个代码主题**（2 深 2 浅）和 **5 个渐变背景**，也可以选择无背景
- **3 档边距**，可开关行号
- **中文注释显示正常**：代码用 JetBrains Mono，中文用霞鹜文楷等宽，字体均为自托管
- **一键复制图片**到剪贴板（2 倍清晰度），或下载 PNG
- **自动记住设置和代码**，保存在浏览器本地
- 完全在浏览器中运行，不会上传任何内容

## 快捷键

| 快捷键 | 作用 |
|---|---|
| `Cmd/Ctrl + Shift + C` | 复制图片 |
| `Cmd/Ctrl + S` | 下载图片 |

## 本地运行

需要 Node.js 20.19 以上（或 22.12 以上）。

```bash
npm install
npm run dev      # 然后打开 http://localhost:5173/cpp-shot/
npm run build    # 打包到 dist 文件夹
npm run preview  # 预览打包后的版本
```

## 技术栈

Vite · Vue 3 · Shiki · modern-screenshot

## 许可证

[MIT](LICENSE)
