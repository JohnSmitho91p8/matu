"""Slice the CJK webfonts into unicode-range chunks (woff2) and generate their CSS.

Usage (needs `pip install fonttools brotli`):
  python scripts/build-fonts.py <LXGWWenKaiMono-Regular.ttf> <D2Coding-Regular.ttf>

Both fonts are SIL OFL 1.1. CJK glyphs are enlarged with `size-adjust` so they fill their
two-cell width, and each glyph's advance is re-spaced (glyph shifted to stay centred) so that
advance * size-adjust is exactly 1.2em / 0.6em: one CJK character is two cells of JetBrains
Mono (0.6em) and columns stay aligned in mixed text.
"""
import os
import subprocess
import sys
import tempfile

from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

FONTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'fonts')


def decode_table(encoding, leads, trails):
    out = []
    for hi in leads:
        for lo in trails:
            try:
                out.append(ord(bytes([hi, lo]).decode(encoding)))
            except (UnicodeDecodeError, TypeError):
                pass
    return out


# size-adjust per script, tuned by eye against JetBrains Mono at the same font size
SCALE_HAN = 1.15   # LXGW WenKai Mono: Chinese characters and CJK punctuation
SCALE_KANA = 1.2   # LXGW WenKai Mono: kana are drawn smaller inside the em box
SCALE_HANGUL = 1.1  # D2Coding: strokes are heavier, so a smaller boost


def respace(font, scale):
    """Set advances so that advance * scale = 0.6em (half-width) / 1.2em (full-width)."""
    glyph_set = font.getGlyphSet()
    glyf, hmtx = font['glyf'], font['hmtx']
    new = {}
    for name in font.getGlyphOrder():
        adv, lsb = hmtx[name]
        if adv not in (500, 1000):
            continue
        target = round(adv * 1.2 / scale)
        dx = (target - adv) // 2
        pen = TTGlyphPen(glyph_set)
        glyph_set[name].draw(TransformPen(pen, (1, 0, 0, 1, dx, 0)))
        glyph = pen.glyph()
        glyph.recalcBounds(glyf)
        new[name] = (glyph, (adv + 2 * dx, glyph.xMin if glyph.numberOfContours else 0))
    for name, (glyph, metrics) in new.items():
        glyf[name] = glyph
        hmtx[name] = metrics
    if 'hdmx' in font:
        del font['hdmx']


def write_chunks(src, family, subdir, css_name, chunks):
    out_dir = os.path.join(FONTS_DIR, subdir)
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, f))
    css = []
    for i, (cs, scale) in enumerate(chunks):
        uni = ','.join(f'U+{c:X}' for c in cs)  # pyftsubset 的参数
        with tempfile.TemporaryDirectory() as tmp:
            tmp_ttf = os.path.join(tmp, 'c.ttf')
            subprocess.run(
                ['pyftsubset', src, f'--unicodes={uni}', f'--output-file={tmp_ttf}',
                 '--layout-features=', '--no-hinting'],
                check=True,
            )
            font = TTFont(tmp_ttf)
            respace(font, scale)
            font.flavor = 'woff2'
            font.save(os.path.join(out_dir, f'{i}.woff2'))
        css.append(
            f"@font-face {{\n  font-family: '{family}';\n  font-weight: 400;\n  font-display: swap;\n  size-adjust: {scale * 100:g}%;\n"
            f"  src: url('./{subdir}/{i}.woff2') format('woff2');\n  unicode-range: {format_ranges(cs)};\n}}"
        )
    with open(os.path.join(FONTS_DIR, css_name), 'w') as fh:
        fh.write('\n'.join(css) + '\n')
    print(family, len(chunks), 'chunks')


def format_ranges(codepoints):
    """Merge consecutive code points into ranges: U+20-7E, U+A0-A5 (keeps the CSS small)."""
    cps = sorted(set(codepoints))
    parts, i = [], 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1:
            j += 1
        parts.append(f'U+{cps[i]:X}' if i == j else f'U+{cps[i]:X}-{cps[j]:X}')
        i = j + 1
    return ', '.join(parts)


def split(chars, size):
    return [chars[i:i + size] for i in range(0, len(chars), size)]


def main(wenkai, d2coding):
    wk = set(TTFont(wenkai, lazy=True).getBestCmap())
    d2 = set(TTFont(d2coding, lazy=True).getBestCmap())

    def keep(cmap, chars):
        return [c for c in chars if c in cmap]

    sym = keep(wk, [c for a, b in [(0x20, 0x7E), (0xA0, 0x24F), (0x2000, 0x206F), (0x2190, 0x21FF),
                                   (0x2500, 0x257F), (0x25A0, 0x25FF), (0x3000, 0x303F), (0xFF00, 0xFFEF)]
                    for c in range(a, b + 1)])
    kana = keep(wk, [c for a, b in [(0x3040, 0x30FF), (0x31F0, 0x31FF), (0xFF61, 0xFF9F)] for c in range(a, b + 1)])
    sym = [c for c in sym if c not in set(kana)]
    gb = keep(wk, decode_table('gb2312', range(0xB0, 0xF8), range(0xA1, 0xFF)))
    jis1 = [c for c in keep(wk, decode_table('euc_jp', range(0xB0, 0xD0), range(0xA1, 0xFF))) if c not in set(gb)]
    write_chunks(wenkai, 'LXGW WenKai Mono', 'wenkai', 'wenkai.css',
                 [(sym, SCALE_HAN), (kana, SCALE_KANA)]
                 + [(c, SCALE_HAN) for c in split(gb, 300) + split(jis1, 300)])

    ksx = keep(d2, decode_table('euc_kr', range(0xB0, 0xC9), range(0xA1, 0xFF)))
    ksx = [c for c in ksx if 0xAC00 <= c <= 0xD7A3]
    rest = [c for c in range(0xAC00, 0xD7A4) if c in d2 and c not in set(ksx)]
    jamo = keep(d2, range(0x3131, 0x318F))
    write_chunks(d2coding, 'D2Coding', 'd2coding', 'd2coding.css',
                 [(c, SCALE_HANGUL) for c in [jamo] + split(ksx, 300) + split(rest, 1000)])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
