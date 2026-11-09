#!/usr/bin/env python3
"""Lucky Color Today — weekly "lucky colors of the week" card for the Facebook Page.

Usage:  python3 tools/week_card.py YYYY-MM-DD      (the Monday the week starts on)

Reads each day's color straight from index.html via tools/lucky-day.js (same as the daily cards),
then writes to social/week-YYYY-MM-DD/:
  week.jpg    1080x1350 feed image (Monday to Sunday)
  week.json   the 7 days + ready-to-use Facebook caption and alt text
Public URL once pushed: https://luckycolortoday.com/social/week-YYYY-MM-DD/week.jpg
"""
import datetime as dt, json, os, subprocess, sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import social_cards as sc

ROOT = sc.ROOT
W, H = 1080, 1350
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


def day_info(d):
    return json.loads(subprocess.check_output(['node', os.path.join(ROOT, 'tools', 'lucky-day.js'),
                                               os.path.join(ROOT, 'index.html'), d.isoformat()]))


def centered(draw, s, y, f, fill, spacing=0):
    widths = [draw.textlength(ch, font=f) for ch in s]
    total = sum(widths) + spacing * (len(s) - 1)
    x = (W - total) / 2; asc = f.getmetrics()[0]
    for ch, w in zip(s, widths):
        draw.text((x, y - asc), ch, font=f, fill=fill); x += w + spacing


def range_label(a, b):
    if a.month == b.month:
        return f"{MONTHS[a.month - 1]} {a.day} - {b.day}"
    return f"{MONTHS[a.month - 1][:3]} {a.day} - {MONTHS[b.month - 1][:3]} {b.day}"


def card(days, a, b):
    sc.W, sc.H = W, H  # reuse the site's starry background at feed size
    img = sc.background((26, 22, 58), (14, 12, 30), 53)
    sc.W, sc.H = 1080, 1920
    d = ImageDraw.Draw(img)
    centered(d, 'YOUR WEEK AHEAD', 120, sc.font(36, 500), sc.GOLD, spacing=3)
    centered(d, 'Lucky Colors This Week', 205, sc.font(70, 700), (255, 255, 255))
    centered(d, range_label(a, b), 268, sc.font(36, 400), (220, 222, 232))
    d.line([(W / 2 - 85, 305), (W / 2 + 85, 305)], fill=sc.GOLD, width=3)
    top, row = 345, 118
    for i, L in enumerate(days):
        y = top + i * row
        ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(ov).rounded_rectangle([90, y, 990, y + row - 18], 30, fill=(255, 255, 255, 16))
        img.alpha_composite(ov); d = ImageDraw.Draw(img)
        cy = y + (row - 18) / 2
        c = tuple(int(v) for v in sc.rgb(L['hex']))
        d.ellipse([130, cy - 34, 198, cy + 34], fill=c, outline=(255, 255, 255, 140), width=3)
        f1 = sc.font(30, 500); f2 = sc.font(44, 700); f3 = sc.font(30, 500)
        d.text((228, cy - 22 - f1.getmetrics()[0]), L['weekday'].upper(), font=f1, fill=sc.GOLD)
        name = L['name']
        while d.textlength(name, font=f2) > 520: f2 = sc.font(f2.size - 2, 700)
        d.text((228, cy + 26 - f2.getmetrics()[0]), name, font=f2, fill=(255, 255, 255))
        num = f"No. {L['num']}"
        d.text((950 - d.textlength(num, font=f3), cy + 10 - f3.getmetrics()[0]), num, font=f3, fill=(215, 220, 230))
    centered(d, '@luckycolortoday', 1235, sc.font(40, 600), sc.GOLD)
    centered(d, 'luckycolortoday.com', 1290, sc.font(30, 400), (232, 234, 238))
    return img


def caption(days, a, b):
    lines = [f"🌈 Your lucky colors for the week ahead ({range_label(a, b)})", "",
             *[f"{L['weekday']}: {L['name']} (lucky number {L['num']})" for L in days], "",
             "Every day of the week is ruled by its own planet, and each planet has its own color. "
             "Save this post so you know what to wear each morning.", "",
             "Which day's color is your favorite this week? Tell us in the comments.", "",
             "Find your zodiac sign's lucky color 👉 https://luckycolortoday.com", "",
             "#luckycolor #luckycoloroftheday #weeklyhoroscope #colorastrology #goodluck"]
    return "\n".join(lines)


def main():
    a = dt.date.fromisoformat(sys.argv[1])
    if a.weekday() != 0:
        sys.exit('Give the Monday the week starts on')
    b = a + dt.timedelta(days=6)
    days = [day_info(a + dt.timedelta(days=i)) for i in range(7)]
    out = os.path.join(ROOT, 'social', f'week-{a.isoformat()}'); os.makedirs(out, exist_ok=True)
    card(days, a, b).convert('RGB').save(os.path.join(out, 'week.jpg'), 'JPEG', quality=90)
    data = {'start': a.isoformat(), 'end': b.isoformat(),
            'days': [{k: L[k] for k in ('date', 'weekday', 'name', 'hex', 'num')} for L in days],
            'url': f'https://luckycolortoday.com/social/week-{a.isoformat()}/week.jpg',
            'alt': f"Lucky colors and numbers for every day, {range_label(a, b)}",
            'caption': caption(days, a, b)}
    with open(os.path.join(out, 'week.json'), 'w') as fh: json.dump(data, fh, indent=2, ensure_ascii=False)
    print(json.dumps(data, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
