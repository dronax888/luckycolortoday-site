#!/usr/bin/env python3
"""Lucky Color Today — make the daily social cards and captions.

Usage:  python3 tools/social_cards.py YYYY-MM-DD

Reads the day's lucky color straight from index.html (via tools/lucky-day.js, which runs the
website's own luckFor()), then writes to social/YYYY-MM-DD/:
  lucky-color.jpg   story slide 1 + Pinterest Pin 1
  how-to-use.jpg    story slide 2 + Pinterest Pin 2
  zodiac-story.jpg  story slide 3
  zodiac-pin.jpg    spare Pinterest version of the zodiac card
  post.json         color data + ready-to-use Pin titles, descriptions and alt texts
Public URL once pushed: https://luckycolortoday.com/social/YYYY-MM-DD/<file>
"""
import json, os, random, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, 'tools', 'fonts')
W, H = 1080, 1920
GOLD = (233, 196, 106)
NIGHT = np.array([14, 12, 30], float)
WEIGHT = {400: 'Poppins-Regular.ttf', 500: 'Poppins-Medium.ttf', 600: 'Poppins-Medium.ttf', 700: 'Poppins-Bold.ttf'}


def font(size, weight):
    return ImageFont.truetype(os.path.join(FONTS, WEIGHT[weight]), size)


def rgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)


def mix(c, t, base):
    return tuple(int(round(v)) for v in c * t + np.asarray(base, float) * (1 - t))


def lum(c):
    v = c / 255; v = np.where(v <= .03928, v / 12.92, ((v + .055) / 1.055) ** 2.4)
    return float(.2126 * v[0] + .7152 * v[1] + .0722 * v[2])


def background(top, bot, seed):
    t = np.linspace(0, 1, H)[:, None, None]
    arr = np.asarray(top, float) * (1 - t) + np.asarray(bot, float) * t
    img = Image.fromarray(np.repeat(arr, W, axis=1).astype('uint8'), 'RGB')
    ov = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(ov); r = random.Random(seed)
    for _ in range(170):
        x, y, s = r.random() * W, r.random() * H, 0.8 + r.random() * 2.2
        d.ellipse([x - s, y - s, x + s, y + s], fill=(255, 255, 255, int(255 * (0.25 + r.random() * 0.6))))
    img = img.convert('RGBA'); img.alpha_composite(ov); return img


def text(img, s, y, size, weight, color, spacing=0, max_w=960):
    d = ImageDraw.Draw(img)
    while True:
        f = font(size, weight)
        widths = [d.textlength(ch, font=f) for ch in s]
        total = sum(widths) + spacing * (len(s) - 1)
        if total <= max_w or size <= 20: break
        size -= 2
    asc = f.getmetrics()[0]
    if spacing:
        x = (W - total) / 2
        for ch, w in zip(s, widths):
            d.text((x, y - asc), ch, font=f, fill=color); x += w + spacing
    else:
        d.text(((W - total) / 2, y - asc), s, font=f, fill=color)


def gold_line(img, y, w=170):
    ImageDraw.Draw(img).line([(W / 2 - w / 2, y), (W / 2 + w / 2, y)], fill=GOLD, width=3)


def radial(cx, cy, r0, r1, color, a0, a1):
    yy, xx = np.mgrid[0:H, 0:W]; dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    t = np.clip((dist - r0) / (r1 - r0), 0, 1); a = a0 * (1 - t) + a1 * t
    out = np.zeros((H, W, 4), np.uint8); out[..., :3] = np.asarray(color, np.uint8); out[..., 3] = (a * 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def orb(img, hexc):
    c = rgb(hexc); cx, cy, R = W / 2, 930, 255
    img.alpha_composite(radial(cx, cy, 150, 420, tuple(int(v) for v in c), 0.45, 0.0))
    yy, xx = np.mgrid[0:H, 0:W]
    t = np.clip(np.sqrt((xx - (cx - 80)) ** 2 + (yy - 850) ** 2) / 340, 0, 1)[..., None]
    light, mid, dark = np.array(mix(c, .55, [255] * 3), float), c, np.array(mix(c, .75, [0] * 3), float)
    col = np.where(t < .55, light + (mid - light) * (t / .55), mid + (dark - mid) * ((t - .55) / .45))
    layer = np.zeros((H, W, 4), np.uint8); layer[..., :3] = col.astype(np.uint8)
    mask = Image.new('L', (W, H), 0); ImageDraw.Draw(mask).ellipse([cx - R, cy - R, cx + R, cy + R], fill=255)
    layer[..., 3] = np.array(mask); img.alpha_composite(Image.fromarray(layer, 'RGBA'))
    d = ImageDraw.Draw(img)
    d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=(255, 255, 255, 128), width=5)
    d.ellipse([cx - 110 - 38, 820 - 38, cx - 110 + 38, 820 + 38], fill=(255, 255, 255, 204))


def color_card(L):
    c = rgb(L['hex']); lu = lum(c)
    img = background(mix(c, .32, NIGHT), mix(c, .08, NIGHT), 11)
    text(img, L['dayLabel'], 290, 40, 500, GOLD, spacing=3)
    text(img, "Today's Lucky Color", 410, 84, 700, (255, 255, 255))
    orb(img, L['hex'])
    name_col = mix(c, .45, [255] * 3) if lu < .12 else tuple(int(v) for v in c)
    text(img, L['name'].upper(), 1340, 92, 700, name_col)
    text(img, f"Lucky number:  {L['num']}", 1475, 62, 700, (255, 255, 255))
    text(img, L['vibeLine'], 1550, 38, 400, (220, 220, 228))
    gold_line(img, 1640)
    text(img, '@luckycolortoday', 1730, 46, 600, GOLD)
    text(img, 'luckycolortoday.com', 1795, 34, 400, (232, 234, 238))
    return img


def tips_for(L):
    low = L['name'].lower(); keep = f'Keep something {low}'
    return [('Wear it close to your skin', 'A scarf, a bracelet or socks'),
            (keep if len(keep) <= 26 else 'Carry it with you', 'In your wallet or bag all day'),
            (f"Pair it with {L['pair'].lower()}", 'Your color match for today'),
            ('Set your wallpaper to it', 'A quiet lucky reminder')]


def tips_card(L, tips):
    c = rgb(L['hex']); lu = lum(c)
    img = background(mix(c, .22, NIGHT), mix(c, .08, NIGHT), 23)
    text(img, 'HOW TO USE', 330, 40, 500, GOLD, spacing=3)
    text(img, f"{L['name']} Today", 450, 90, 700, (255, 255, 255))
    gold_line(img, 520)
    for i, (title, sub) in enumerate(tips):
        y = 680 + i * 250
        ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(ov).rounded_rectangle([150, y - 95, 930, y + 95], 36, fill=(255, 255, 255, 18))
        img.alpha_composite(ov); d = ImageDraw.Draw(img)
        d.ellipse([230 - 42, y - 5 - 42, 230 + 42, y - 5 + 42], fill=tuple(int(v) for v in c), outline=(255, 255, 255, 128), width=3)
        f = font(40, 700); num = str(i + 1); w = d.textlength(num, font=f)
        d.text((230 - w / 2, y - 5 - 29), num, font=f, fill=(26, 20, 38) if lu > .42 else (255, 255, 255))
        ft = font(46, 600)
        while d.textlength(title, font=ft) > 600: ft = font(ft.size - 2, 600)
        d.text((310, y - 5 - ft.getmetrics()[0]), title, font=ft, fill=(255, 255, 255))
        fs = font(34, 400); d.text((310, y + 48 - fs.getmetrics()[0]), sub, font=fs, fill=(201, 205, 214))
    text(img, f"Lucky number {L['num']}  •  Pairs with {L['pair']}", 1700, 38, 500, (220, 227, 236))
    text(img, '@luckycolortoday', 1800, 46, 600, GOLD)
    return img


def zodiac_card(story):
    img = background((17, 22, 58), (37, 21, 66), 37 if story else 41)
    text(img, 'WHAT IS YOUR' if story else 'DISCOVER', 330, 40, 500, GOLD, spacing=3)
    text(img, 'Zodiac sign?' if story else 'Lucky Color Today', 450, 96 if story else 90, 700, (255, 255, 255))
    gold_line(img, 520); d = ImageDraw.Draw(img)
    for i, s in enumerate(['Your lucky color, every day', 'Your lucky number', 'Horoscope & palm tips']):
        y = 640 + i * 105; d.ellipse([170 - 11, y - 14 - 11, 170 + 11, y - 14 + 11], fill=GOLD)
        f = font(46, 500); d.text((215, y - f.getmetrics()[0]), s, font=f, fill=(255, 255, 255))
    signs = [('ARI', '#E04848'), ('TAU', '#2E9E5B'), ('GEM', '#F2C318'), ('CAN', '#C9CBDC'), ('LEO', '#F39A1E'), ('VIR', '#6FA552'),
             ('LIB', '#EC7BB4'), ('SCO', '#9B1F3A'), ('SAG', '#8E44AD'), ('CAP', '#5A5A6E'), ('AQU', '#3A8FD9'), ('PIS', '#1BB89A')]
    f = font(30, 700)
    for i, (lab, hx) in enumerate(signs):
        cx, cy = W / 2 - 225 + (i % 4) * 150, 1020 + (i // 4) * 150
        d.ellipse([cx - 62, cy - 62, cx + 62, cy + 62], fill=tuple(int(v) for v in rgb(hx)))
        w = d.textlength(lab, font=f); d.text((cx - w / 2, cy + 11 - f.getmetrics()[0]), lab, font=f, fill=(255, 255, 255))
    text(img, 'Spin the zodiac wheel' if story else "Find your sign's lucky color", 1530, 60, 700, (255, 255, 255))
    text(img, "Your sign's color today: luckycolortoday.com" if story else 'Save this Pin and check back every day', 1600, 38, 400, (215, 220, 228))
    text(img, '@luckycolortoday', 1760, 46, 600, GOLD)
    return img


def captions(L, tips):
    name, low, num, pair = L['name'], L['name'].lower(), L['num'], L['pair'].lower()
    t2 = tips[1][0][0].lower() + tips[1][0][1:]
    return {
        'pin1': {
            'title': f"Today's Lucky Color: {name} (Lucky Number {num})",
            'alt': f"Today's lucky color is {name}, lucky number {num}",
            'text': (f"Today's lucky color is {name.upper()} and your lucky number is {num}. {L['siteLead']} "
                     f"It pairs beautifully with {pair}. Find your zodiac sign's lucky color at luckycolortoday.com and save this Pin.\n\n"
                     "#luckycolor #luckycoloroftheday #luckynumber #colormeaning #goodluck #manifestation")},
        'pin2': {
            'title': f"How to Use {name} for Good Luck (4 Easy Ways)",
            'alt': f"4 ways to use {low} for good luck today",
            'text': (f"How to use {low} for good luck today: wear it close to your skin, like a scarf, a bracelet or socks; "
                     f"{t2.replace('carry it with you', f'carry something {low} with you')} in your wallet or bag; pair it with {pair}, today's color match; "
                     f"and set your phone wallpaper to it as a quiet lucky reminder. Your lucky number is {num}. "
                     "Get your zodiac sign's lucky color at luckycolortoday.com and save this Pin.\n\n"
                     f"#luckycolor #{low.replace(' ', '')} #goodluck #{L['planet'].lower()}energy #luckytips #manifestation")},
    }


def main():
    date = sys.argv[1]
    L = json.loads(subprocess.check_output(['node', os.path.join(ROOT, 'tools', 'lucky-day.js'), os.path.join(ROOT, 'index.html'), date]))
    out = os.path.join(ROOT, 'social', date); os.makedirs(out, exist_ok=True)
    tips = tips_for(L)
    for fname, img in [('lucky-color.jpg', color_card(L)), ('how-to-use.jpg', tips_card(L, tips)),
                       ('zodiac-story.jpg', zodiac_card(True)), ('zodiac-pin.jpg', zodiac_card(False))]:
        img.convert('RGB').save(os.path.join(out, fname), 'JPEG', quality=90)
    base = f'https://luckycolortoday.com/social/{date}/'
    post = {**L, 'tips': tips, 'urls': {k: base + k + '.jpg' for k in ['lucky-color', 'how-to-use', 'zodiac-story', 'zodiac-pin']},
            **captions(L, tips)}
    with open(os.path.join(out, 'post.json'), 'w') as fh: json.dump(post, fh, indent=2, ensure_ascii=False)
    print(json.dumps(post, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
