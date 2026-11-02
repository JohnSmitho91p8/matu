[English](README.md) | 简体中文

# Matu（码图）

把代码变成好看的图片，一键复制，分享给任何人。

![效果截图](docs/screenshot.png)

**在线使用：<https://JohnSmitho91p8.github.io/matu/>**

## 功能

- **直接在卡片里编辑**：打字或粘贴代码，所见即所得
- **语法高亮**：使用 [Shiki](https://shiki.style)，与 VS Code 同一套高亮引擎。支持 **C++、C、Python、Java、JavaScript**，自动识别语言，也可以手动指定
- **行高亮**：点行号高亮一行，Shift + 点击选中一段，其余行自动变暗，讲重点时很好用
- **4 个代码主题**（带预览色块）、**5 个渐变背景**（也可以无背景）、**3 档边距**、**3 档字号**，可开关行号
- **可选的署名水印**：在图片角落加上你的名字，比如 `@yourname`
- **中日韩注释显示正常**：代码用 JetBrains Mono，中日文用霞鹜文楷等宽，韩文用 D2Coding，字体均为自托管，并与英文按同一字符网格对齐
- **一键复制图片**到剪贴板（2 倍清晰度），或下载 PNG
- **iPhone 上也好用**：触屏友好的布局和底部工具栏；「分享」按钮会调起系统分享面板（存到相册、发给好友、AirDrop）。如果系统分享不可用，长按预览图片即可保存
- **界面支持英、中、日、韩四种语言**，首次打开按浏览器语言自动选择，也可随时切换
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
npm run dev      # 然后打开 http://localhost:5173/matu/
npm run build    # 打包到 dist 文件夹
npm run preview  # 预览打包后的版本
```

想在同一个 Wi-Fi 下的手机上试用，运行 `npm run dev -- --host`，用手机打开终端里显示的 `Network` 地址。（分享和复制图片需要 HTTPS，这两项请在线上版本测试。）

## 技术栈

Vite · Vue 3 · Shiki · modern-screenshot

## 许可证

[MIT](LICENSE)
