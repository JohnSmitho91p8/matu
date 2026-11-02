// 界面文字字典：新增语言时，在 LANGUAGES 里加一项，并补一份同样结构的翻译即可
export const LANGUAGES = [
  { code: 'en', name: 'English', htmlLang: 'en' },
  { code: 'zh-CN', name: '简体中文', htmlLang: 'zh-CN' },
  { code: 'ja', name: '日本語', htmlLang: 'ja' },
  { code: 'ko', name: '한국어', htmlLang: 'ko' },
]

export const FALLBACK_LANG = 'en'

export const messages = {
  en: {
    'app.logo': 'Matu',
    'app.title': 'Matu · Turn code into images',
    'app.description': 'Turn code into a beautiful image, copy it in one click and share it anywhere.',
    'top.download': 'Download',
    'top.download.title': 'Download as PNG (Cmd/Ctrl + S)',
    'top.copy': 'Copy image',
    'top.copy.title': 'Copy image to clipboard (Cmd/Ctrl + Shift + C)',
    'lang.label': 'Language',
    'toolbar.label': 'Appearance settings',
    'toolbar.language': 'Language',
    'language.auto': 'Auto',
    'toolbar.clearHighlight': 'Clear highlight',
    'toolbar.theme': 'Theme',
    'toolbar.background': 'Background',
    'toolbar.padding': 'Padding',
    'toolbar.lineNumbers': 'Line numbers',
    'theme.vitesse-dark': 'Vitesse Dark',
    'theme.catppuccin-mocha': 'Catppuccin Mocha',
    'theme.github-light': 'GitHub Light',
    'theme.vitesse-light': 'Vitesse Light',
    'bg.sunset': 'Sunset',
    'bg.ocean': 'Ocean',
    'bg.mint': 'Mint',
    'bg.dusk': 'Dusk',
    'bg.graphite': 'Graphite',
    'bg.none': 'No background',
    'padding.s': 'Small',
    'padding.m': 'Medium',
    'padding.l': 'Large',
    'editor.label': 'Code editor',
    'filename.label': 'File name',
    'toast.copied': 'Copied. You can paste it anywhere.',
    'toast.copyFailed': 'Copy failed, downloading the image instead',
    'toast.exportFailed': 'Export failed, please try again',
  },
  'zh-CN': {
    'app.logo': '码图',
    'app.title': '码图 Matu · 代码转图片',
    'app.description': '把代码变成好看的图片，一键复制，分享给任何人。',
    'top.download': '下载',
    'top.download.title': '下载 PNG 图片（Cmd/Ctrl + S）',
    'top.copy': '复制图片',
    'top.copy.title': '复制图片到剪贴板（Cmd/Ctrl + Shift + C）',
    'lang.label': '语言',
    'toolbar.label': '外观设置',
    'toolbar.language': '语言',
    'language.auto': '自动',
    'toolbar.clearHighlight': '清除高亮',
    'toolbar.theme': '主题',
    'toolbar.background': '背景',
    'toolbar.padding': '边距',
    'toolbar.lineNumbers': '行号',
    'theme.vitesse-dark': '晨雾',
    'theme.catppuccin-mocha': '摩卡',
    'theme.github-light': '纸白',
    'theme.vitesse-light': '素雅',
    'bg.sunset': '晚霞',
    'bg.ocean': '深海',
    'bg.mint': '薄荷',
    'bg.dusk': '暮紫',
    'bg.graphite': '石墨',
    'bg.none': '无背景',
    'padding.s': '小',
    'padding.m': '中',
    'padding.l': '大',
    'editor.label': '代码编辑器',
    'filename.label': '文件名',
    'toast.copied': '已复制，可以直接粘贴',
    'toast.copyFailed': '复制失败，已改为下载图片',
    'toast.exportFailed': '导出失败，请重试',
  },
  ja: {
    'app.logo': 'Matu',
    'app.title': 'Matu · コードを画像に',
    'app.description': 'コードをきれいな画像に変換。ワンクリックでコピーして、誰にでも共有できます。',
    'top.download': 'ダウンロード',
    'top.download.title': 'PNG 画像としてダウンロード（Cmd/Ctrl + S）',
    'top.copy': '画像をコピー',
    'top.copy.title': '画像をクリップボードにコピー（Cmd/Ctrl + Shift + C）',
    'lang.label': '言語',
    'toolbar.label': '外観の設定',
    'toolbar.language': '言語',
    'language.auto': '自動',
    'toolbar.clearHighlight': 'ハイライトを解除',
    'toolbar.theme': 'テーマ',
    'toolbar.background': '背景',
    'toolbar.padding': '余白',
    'toolbar.lineNumbers': '行番号',
    'theme.vitesse-dark': 'Vitesse Dark',
    'theme.catppuccin-mocha': 'Catppuccin Mocha',
    'theme.github-light': 'GitHub Light',
    'theme.vitesse-light': 'Vitesse Light',
    'bg.sunset': '夕焼け',
    'bg.ocean': '海',
    'bg.mint': 'ミント',
    'bg.dusk': '夕暮れ',
    'bg.graphite': 'グラファイト',
    'bg.none': '背景なし',
    'padding.s': '小',
    'padding.m': '中',
    'padding.l': '大',
    'editor.label': 'コードエディター',
    'filename.label': 'ファイル名',
    'toast.copied': 'コピーしました。そのまま貼り付けられます',
    'toast.copyFailed': 'コピーに失敗したため、画像をダウンロードします',
    'toast.exportFailed': '書き出しに失敗しました。もう一度お試しください',
  },
  ko: {
    'app.logo': 'Matu',
    'app.title': 'Matu · 코드를 이미지로',
    'app.description': '코드를 보기 좋은 이미지로 만들어 한 번에 복사하고 누구에게나 공유하세요.',
    'top.download': '다운로드',
    'top.download.title': 'PNG 이미지로 다운로드 (Cmd/Ctrl + S)',
    'top.copy': '이미지 복사',
    'top.copy.title': '이미지를 클립보드에 복사 (Cmd/Ctrl + Shift + C)',
    'lang.label': '언어',
    'toolbar.label': '화면 설정',
    'toolbar.language': '언어',
    'language.auto': '자동',
    'toolbar.clearHighlight': '강조 해제',
    'toolbar.theme': '테마',
    'toolbar.background': '배경',
    'toolbar.padding': '여백',
    'toolbar.lineNumbers': '줄 번호',
    'theme.vitesse-dark': 'Vitesse Dark',
    'theme.catppuccin-mocha': 'Catppuccin Mocha',
    'theme.github-light': 'GitHub Light',
    'theme.vitesse-light': 'Vitesse Light',
    'bg.sunset': '노을',
    'bg.ocean': '바다',
    'bg.mint': '민트',
    'bg.dusk': '황혼',
    'bg.graphite': '그래파이트',
    'bg.none': '배경 없음',
    'padding.s': '작게',
    'padding.m': '보통',
    'padding.l': '크게',
    'editor.label': '코드 편집기',
    'filename.label': '파일 이름',
    'toast.copied': '복사했습니다. 바로 붙여넣을 수 있어요',
    'toast.copyFailed': '복사에 실패하여 이미지를 다운로드합니다',
    'toast.exportFailed': '내보내기에 실패했습니다. 다시 시도해 주세요',
  },
}

// 默认示例代码：同一段快速幂，只有注释随语言变化
function sample(comments) {
  return `#include <bits/stdc++.h>
using namespace std;

// ${comments[0]}
long long qpow(long long a, long long b, long long p) {
    long long res = 1;
    a %= p;
    while (b) {
        if (b & 1) res = res * a % p;  // ${comments[1]}
        a = a * a % p;
        b >>= 1;
    }
    return res;
}

int main() {
    cout << qpow(2, 10, 1000000007) << endl;  // ${comments[2]}
    return 0;
}`
}

export const SAMPLE_CODES = {
  en: sample(['Fast power: compute a^b mod p', 'multiply when the current bit is 1', 'prints 1024']),
  'zh-CN': sample(['快速幂：计算 a^b mod p', '当前位是 1 就乘上', '输出 1024']),
  ja: sample(['べき乗（繰り返し二乗法）：a^b mod p を計算', '現在のビットが 1 なら掛ける', '1024 を出力']),
  ko: sample(['빠른 거듭제곱: a^b mod p 계산', '현재 비트가 1이면 곱하기', '1024 출력']),
}
