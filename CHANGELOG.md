# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-11-03

### Added

- Faster copy: images are prepared in the background, so copying, downloading and sharing are nearly instant
- A friendly message when there is no code to export, or when the code is too long to turn into an image

### Changed

- A cleaner toolbar: it now keeps only theme and background, and everything else (language, padding, font size, line numbers, signature) lives in a new Settings panel
- Line numbers are easier to read in every theme, and the Vitesse Light theme has better contrast
- The first load is lighter: languages and themes are downloaded only when needed
- Typing stays smooth in long files

### Fixed

- Exported images look the same in Chrome and Safari, with fonts embedded correctly
- Very long lines, very long files, emoji and non-CJK scripts export without errors
- Exporting no longer hangs when a font loads slowly or fails to load
- The app keeps working when the browser blocks local storage, for example in private mode

## [2.0.0] - 2026-11-03

### Added

- Syntax highlighting and automatic detection for C, Python, Java and JavaScript, in addition to C++
- Line highlighting: click a line number to spotlight it, Shift-click to select a range
- Optional signature in the corner of the image
- Three font sizes, and theme previews in the toolbar
- A layout for iPhone, with a bottom toolbar, a Share button and an image preview
- Interface in English, Simplified Chinese, Japanese and Korean
- Korean support in exported code, aligned to the same character grid as Chinese and Japanese

### Changed

- Pasted code has its leading and trailing blank lines removed
- Code is never wrapped; on narrow screens the whole card scales down to fit
- Notifications stay on screen, and the toolbar spacing is tighter

## [1.0.0] - 2026-11-03

### Added

- Code to image: type or paste code on the card and copy it to the clipboard or download it as a PNG
- C++ syntax highlighting
- Four code themes, five gradient backgrounds or no background, three padding sizes and a line-number toggle
- Chinese comments display correctly, with self-hosted fonts
- Your settings and code are remembered in the browser; nothing is uploaded
- Keyboard shortcuts for copying and downloading

[3.0.0]: https://github.com/JohnSmitho91p8/matu/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/JohnSmitho91p8/matu/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/JohnSmitho91p8/matu/releases/tag/v1.0.0
