#!/usr/bin/env python3
"""Lucky Color Today — make the Pinterest image (1000x1500) for every Journal article.

Usage:  python3 tools/journal_pins.py            (only makes missing images)
        python3 tools/journal_pins.py --all      (remakes every image)

Reads the article list from tools/journal.json and each article's tag, colors and summary from the
GUIDES list in index.html, then writes journal/<page>/pin.jpg. Run node tools/build_journal.js after.
"""
import json, os, random, re, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, 'tools', 'fonts')
W, H = 1000, 1500
GOLD = (233, 196, 106)
NIGHT = np.array([12, 10, 26], float)
MUTED = (200, 193, 218)


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def rgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def wrap(draw, text, fnt, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=fnt) <= width or not cur:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines


def centered(draw, y, lines, fnt, fill, gap, spacing=0):
    for ln in lines:
        if spacing:
            total = sum(draw.textlength(ch, font=fnt) for ch in ln) + spacing * (len(ln) - 1)
            x = (W - total) / 2
            for ch in ln:
                draw.text((x, y), ch, font=fnt, fill=fill); x += draw.textlength(ch, font=fnt) + spacing
        else:
            draw.text(((W - draw.textlength(ln, font=fnt)) / 2, y), ln, font=fnt, fill=fill)
        y += gap
    return y


def make(article, guide, out):
    c1, c2 = rgb(guide['hex']), rgb(guide['hex2'])
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    # night sky tinted with the article's colors
    t = (yy / H)[..., None]
    top = c2 * .22 + NIGHT * .78
    img = top * (1 - t) + NIGHT * t
    ox, oy, r = W / 2, 560, 225
    d = np.sqrt((xx - ox) ** 2 + (yy - oy) ** 2)
    glow = np.clip(1 - d / 560, 0, 1)[..., None] ** 2
    img = img * (1 - glow * .55) + (c1 * .5 + c2 * .5) * glow * .55
    # two-tone orb with a soft highlight
    inside = d <= r
    u = np.clip(((xx - ox) + (yy - oy)) / (2 * r) * .9 + .5, 0, 1)[..., None]
    orb = c1 * (1 - u) + c2 * u
    hl = np.clip(1 - np.sqrt((xx - (ox - r * .38)) ** 2 + (yy - (oy - r * .4)) ** 2) / (r * .75), 0, 1)[..., None] ** 1.6
    orb = orb * (1 - hl * .65) + 255 * hl * .65
    shade = np.clip((d / r) ** 3, 0, 1)[..., None]
    orb = orb * (1 - shade * .35)
    img = np.where(inside[..., None], orb, img)
    im = Image.fromarray(np.clip(img, 0, 255).astype('uint8'))

    # stars (behind nothing important, seeded per article so images are stable)
    rnd = random.Random(article['page'])
    stars = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(stars)
    for _ in range(140):
        x, y = rnd.uniform(0, W), rnd.uniform(0, H)
        if (x - ox) ** 2 + (y - oy) ** 2 < (r + 8) ** 2:
            continue
        s = rnd.uniform(.8, 2.4)
        sd.ellipse((x - s, y - s, x + s, y + s), fill=(255, 255, 255, rnd.randint(60, 200)))
    im = Image.alpha_composite(im.convert('RGBA'), stars)

    # gold ring around the orb (front half drawn over the orb)
    ring = Image.new('RGBA', (W * 2, H * 2), (0, 0, 0, 0)); rd = ImageDraw.Draw(ring)
    rx, ry = 410 * 2, 92 * 2
    rd.ellipse((ox * 2 - rx, oy * 2 - ry, ox * 2 + rx, oy * 2 + ry), outline=GOLD + (190,), width=6)
    ring = ring.rotate(16, center=(ox * 2, oy * 2), resample=Image.BICUBIC).resize((W, H), Image.LANCZOS)
    mask = Image.new('L', (W, H), 255); md = ImageDraw.Draw(mask)
    md.ellipse((ox - r, oy - r, ox + r, oy + r), fill=0)
    md.rectangle((0, oy, W, H), fill=255)  # lower half of the ring passes in front of the orb
    back = Image.composite(ring, Image.new('RGBA', (W, H), (0, 0, 0, 0)), mask)
    im = Image.alpha_composite(im, back)

    dr = ImageDraw.Draw(im)
    eyebrow = f"LUCKY COLOR TODAY  •  {guide['tag'].upper()}"
    centered(dr, 120, [eyebrow], font('Poppins-Medium.ttf', 30), GOLD, 0, spacing=3)

    title = font('BodoniModa_600SemiBold.ttf', 92)
    lines = wrap(dr, article['pinTitle'], title, 860)
    while len(lines) > 3:
        title = font('BodoniModa_600SemiBold.ttf', title.size - 6); lines = wrap(dr, article['pinTitle'], title, 860)
    # balance the lines so the last one is not a single short word
    wdt = 860
    while wdt > 500 and len(wrap(dr, article['pinTitle'], title, wdt - 20)) == len(lines):
        wdt -= 20
    lines = wrap(dr, article['pinTitle'], title, wdt)
    y = centered(dr, 850, lines, title, (255, 255, 255), int(title.size * 1.12))

    dek = font('Poppins-Regular.ttf', 34)
    y = centered(dr, y + 40, wrap(dr, guide['dek'], dek, 820)[:3], dek, MUTED, 50)

    dr.line((W / 2 - 80, 1330, W / 2 + 80, 1330), fill=GOLD, width=3)
    centered(dr, 1356, ['Read the guide at luckycolortoday.com'], font('Poppins-Medium.ttf', 34), GOLD, 0)

    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.convert('RGB').save(out, quality=90, optimize=True, progressive=True)


def main():
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf8').read()
    meta = json.load(open(os.path.join(ROOT, 'tools', 'journal.json'), encoding='utf8'))['articles']
    for a in meta:
        m = re.search(r"\{slug:'" + re.escape(a['id']) + r"',tag:'([^']*)',title:'[^']*',hex:'(#\w{6})',hex2:'(#\w{6})',dek:(['\"])(.*?)\4", html)
        if not m:
            sys.exit('Could not find ' + a['id'] + ' in index.html GUIDES')
        g = {'tag': m.group(1), 'hex': m.group(2), 'hex2': m.group(3), 'dek': m.group(5)}
        out = os.path.join(ROOT, 'journal', a['page'], 'pin.jpg')
        if os.path.exists(out) and '--all' not in sys.argv:
            continue
        make(a, g, out)
        print('made', out)


if __name__ == '__main__':
    main()
