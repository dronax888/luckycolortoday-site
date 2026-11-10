#!/usr/bin/env python3
"""Lucky Color Today — make the 1200x630 share images (Facebook, Google, X previews).

Usage:  python3 tools/sign_images.py          (only makes missing images)
        python3 tools/sign_images.py --all    (remakes every image)

Writes og.jpg (home page), zodiac/og.jpg (all signs) and zodiac/<sign>/og.jpg for each sign.
Sign names, dates and the three signature colors come from the SIGNS list in index.html.
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, 'tools', 'fonts')
W, H = 1200, 630
GOLD = (233, 196, 106)
TEXT = (245, 240, 230)
MUTED = (200, 193, 218)
ALL = '--all' in sys.argv

JS = r"""
const fs=require('fs');const h=fs.readFileSync(process.argv[1],'utf8');
const i=h.indexOf('const SIGNS=['),j=h.indexOf('\nconst MOOD=',i);
const SIGNS=new Function(h.slice(i,j)+'\nreturn SIGNS;')();
console.log(JSON.stringify(SIGNS));
"""


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def night(glows):
    """Dark night sky with soft colored glows: glows = [(x, y, radius, hex, strength)]."""
    yy, xx = np.mgrid[0:H, 0:W]
    img = np.zeros((H, W, 3)) + np.array([9, 8, 20], float)
    for x, y, r, hx, k in glows:
        d = np.exp(-(((xx - x) ** 2 + (yy - y) ** 2) / (2 * r * r)))[..., None]
        img += d * np.array(rgb(hx), float) * k
    rng = np.random.default_rng(7)
    for _ in range(140):
        sx, sy = rng.integers(0, W), rng.integers(0, H)
        img[max(0, sy - 1):sy + 1, max(0, sx - 1):sx + 1] += rng.uniform(40, 140)
    return Image.fromarray(np.clip(img, 0, 255).astype('uint8'))


def centered(d, y, text, fnt, fill):
    d.text(((W - d.textlength(text, font=fnt)) / 2, y), text, font=fnt, fill=fill)


def fit(d, text, name, size, width):
    f = font(name, size)
    while d.textlength(text, font=f) > width and size > 30:
        size -= 4; f = font(name, size)
    return f


def swatches(img, colors, y, r=58, gap=40):
    d = ImageDraw.Draw(img)
    total = len(colors) * 2 * r + (len(colors) - 1) * gap
    x = (W - total) / 2
    for hx in colors:
        glow = Image.new('L', (W, H), 0)
        ImageDraw.Draw(glow).ellipse((x - 10, y - 10, x + 2 * r + 10, y + 2 * r + 10), fill=120)
        glow = glow.filter(ImageFilter.GaussianBlur(22))
        img.paste(Image.new('RGB', (W, H), rgb(hx)), (0, 0), glow)
        d.ellipse((x, y, x + 2 * r, y + 2 * r), fill=rgb(hx), outline=(255, 255, 255), width=3)
        x += 2 * r + gap


def save(img, rel):
    out = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(out) or ROOT, exist_ok=True)
    img.convert('RGB').save(out, quality=88, optimize=True, progressive=True)
    print('wrote', rel)


def need(rel):
    return ALL or not os.path.exists(os.path.join(ROOT, rel))


signs = json.loads(subprocess.check_output(['node', '-e', JS, os.path.join(ROOT, 'index.html')]))

for s in signs:
    rel = f"zodiac/{s['id']}/og.jpg"
    if not need(rel):
        continue
    cols = [c[1] for c in s['palette']]
    img = night([(220, 120, 360, cols[0], .55), (1000, 520, 380, cols[1], .45), (600, 700, 300, cols[2], .35)])
    d = ImageDraw.Draw(img)
    centered(d, 58, f"{s['dates'].upper()}  ·  {s['element'].upper()} SIGN", font('Poppins-Medium.ttf', 26), GOLD)
    title = f"{s['name']} lucky number"
    centered(d, 104, title, fit(d, title, 'BodoniModa_600SemiBold.ttf', 84, 1080), TEXT)
    centered(d, 204, 'and lucky color today', font('BodoniModa_600SemiBold.ttf', 58), TEXT)
    swatches(img, cols, 330)
    d = ImageDraw.Draw(img)
    centered(d, 470, '  ·  '.join(c[0] for c in s['palette']), font('Poppins-Regular.ttf', 28), MUTED)
    centered(d, 540, 'New every midnight at luckycolortoday.com', font('Poppins-Medium.ttf', 30), GOLD)
    save(img, rel)

if need('zodiac/og.jpg'):
    img = night([(200, 160, 380, '#8A3FD1', .5), (1000, 470, 400, '#E8A93A', .4), (620, 680, 300, '#3BB8B3', .35)])
    d = ImageDraw.Draw(img)
    centered(d, 60, 'ALL 12 ZODIAC SIGNS', font('Poppins-Medium.ttf', 28), GOLD)
    centered(d, 108, 'Lucky numbers and', font('BodoniModa_600SemiBold.ttf', 76), TEXT)
    centered(d, 200, 'lucky colors today', font('BodoniModa_600SemiBold.ttf', 76), TEXT)
    swatches(img, [s['palette'][0][1] for s in signs], 345, r=36, gap=16)
    d = ImageDraw.Draw(img)
    centered(d, 440, '  '.join(s['name'][:3].upper() for s in signs), font('Poppins-Medium.ttf', 22), MUTED)
    centered(d, 530, 'Aries to Pisces, new every midnight · luckycolortoday.com', font('Poppins-Medium.ttf', 28), GOLD)
    save(img, 'zodiac/og.jpg')

if need('og.jpg'):
    img = night([(600, 300, 330, '#8A3FD1', .75), (150, 600, 300, '#E8A93A', .35), (1080, 80, 300, '#C8233B', .35)])
    d = ImageDraw.Draw(img)
    centered(d, 64, 'LUCKY COLOR TODAY', font('Poppins-Medium.ttf', 30), GOLD)
    centered(d, 120, "Today's lucky color", font('BodoniModa_600SemiBold.ttf', 80), TEXT)
    centered(d, 222, 'and lucky number', font('BodoniModa_600SemiBold.ttf', 80), TEXT)
    swatches(img, ['#E8A93A', '#EDEAE2', '#C8233B', '#1F9D6B', '#F3C125', '#E77FA6', '#8A3FD1'], 370, r=34, gap=18)
    d = ImageDraw.Draw(img)
    centered(d, 470, 'Plus a daily horoscope for all 12 zodiac signs', font('Poppins-Regular.ttf', 30), MUTED)
    centered(d, 535, 'New every midnight · luckycolortoday.com', font('Poppins-Medium.ttf', 30), GOLD)
    save(img, 'og.jpg')
