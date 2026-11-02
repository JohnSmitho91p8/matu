"""Slice the CJK webfonts into unicode-range chunks (woff2) and generate their CSS.

Usage (needs `pip install fonttools brotli`):
  python scripts/build-fonts.py <LXGWWenKaiMono-Regular.ttf> <D2Coding-Regular.ttf>

Both fonts are SIL OFL 1.1. Every glyph that is 0.5em / 1em wide is re-spaced to
0.6em / 1.2em (glyph shifted to stay centred) so that one CJK character is exactly
two cells of JetBrains Mono (0.6em) and columns stay aligned in mixed text.
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


def respace(font):
    """Widen 0.5em -> 0.6em and 1em -> 1.2em advances, keeping glyphs centred."""
    glyph_set = font.getGlyphSet()
    glyf, hmtx = font['glyf'], font['hmtx']
    new = {}
    for name in font.getGlyphOrder():
        adv, lsb = hmtx[name]
        if adv not in (500, 1000):
            continue
        dx = adv // 10
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
    for i, cs in enumerate(chunks):
        uni = ','.join(f'U+{c:X}' for c in cs)
        with tempfile.TemporaryDirectory() as tmp:
            tmp_ttf = os.path.join(tmp, 'c.ttf')
            subprocess.run(
                ['pyftsubset', src, f'--unicodes={uni}', f'--output-file={tmp_ttf}',
                 '--layout-features=', '--no-hinting'],
                check=True,
            )
            font = TTFont(tmp_ttf)
            respace(font)
            font.flavor = 'woff2'
            font.save(os.path.join(out_dir, f'{i}.woff2'))
        css.append(
            f"@font-face {{\n  font-family: '{family}';\n  font-weight: 400;\n  font-display: swap;\n"
            f"  src: url('./{subdir}/{i}.woff2') format('woff2');\n  unicode-range: {uni.replace(',', ', ')};\n}}"
        )
    with open(os.path.join(FONTS_DIR, css_name), 'w') as fh:
        fh.write('\n'.join(css) + '\n')
    print(family, len(chunks), 'chunks')


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
                 [sym, kana] + split(gb, 300) + split(jis1, 300))

    ksx = keep(d2, decode_table('euc_kr', range(0xB0, 0xC9), range(0xA1, 0xFF)))
    ksx = [c for c in ksx if 0xAC00 <= c <= 0xD7A3]
    rest = [c for c in range(0xAC00, 0xD7A4) if c in d2 and c not in set(ksx)]
    jamo = keep(d2, range(0x3131, 0x318F))
    write_chunks(d2coding, 'D2Coding', 'd2coding', 'd2coding.css',
                 [jamo] + split(ksx, 300) + split(rest, 1000))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
