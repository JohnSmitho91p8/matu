English | [简体中文](README.zh-CN.md)

# Matu

Turn code into a beautiful image — copy it in one click and share it anywhere.

![Screenshot](docs/screenshot.png)

**Live demo: <https://JohnSmitho91p8.github.io/matu/>**

## Features

- **Edit in place** — type or paste code right on the card; what you see is what you export
- **Syntax highlighting** powered by [Shiki](https://shiki.style), the same engine as VS Code. Supports **C++, C, Python, Java and JavaScript**, with automatic language detection (or pick one manually)
- **Line highlighting** — click a line number to spotlight it, Shift-click to select a range; every other line fades out. Perfect for pointing at the important part
- **4 code themes** with live previews, **5 gradient backgrounds** or no background at all, **3 padding sizes**, **3 font sizes** and a line-number toggle
- **Optional signature** — add your handle (for example `@yourname`) to the corner of the image
- **Good CJK support** — JetBrains Mono for code, LXGW WenKai Mono for Chinese and Japanese comments and D2Coding for Korean, all self-hosted and aligned to the same character grid
- **One-click copy** to the clipboard (2× resolution), or download as PNG
- **Works great on iPhone** — a touch-friendly layout with a bottom toolbar, and a Share button that opens the system share sheet (save to Photos, send to a chat, AirDrop). If sharing isn't available, long-press the preview image to save it
- **Multilingual interface** — English, 简体中文, 日本語 and 한국어 (picked from your browser language, switchable any time)
- **Remembers your settings and code** in the browser's local storage
- Runs entirely in the browser; nothing is uploaded

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + Shift + C` | Copy image |
| `Cmd/Ctrl + S` | Download image |

## Design principles

1. **Do one thing**: turn code into a good-looking image.
2. **Open and use**: no account, and all your data stays in your browser.
3. **Beautiful by default**: the image looks good without touching a single setting.
4. **Less is more**: a new feature has to be used often enough to earn its place, and features that aren't will be removed.

## Run locally

Requires Node.js 20.19+ (or 22.12+).

```bash
npm install
npm run dev      # then open http://localhost:5173/matu/
npm run build    # production build in dist/
npm run preview  # preview the production build
npm test         # unit tests (Vitest)
npm run test:e2e # end-to-end tests (Playwright; first run: npx playwright install chromium webkit)
```

To try it on a phone on the same Wi-Fi, run `npm run dev -- --host` and open the `Network` address it prints. (Sharing and copying images need HTTPS, so test those on the deployed site.)

## Tech stack

Vite · Vue 3 · Shiki · modern-screenshot

## License

[MIT](LICENSE)
