#!/usr/bin/env python3
"""Lucky Color Today — turn the day's cards into a short vertical Reel with soft music.

Usage:  python3 tools/social_reel.py YYYY-MM-DD

Needs social/YYYY-MM-DD/ cards from tools/social_cards.py (run that first). Writes:
  social/YYYY-MM-DD/reel.mp4        1080x1920, ~16 s, H.264 + AAC (Facebook / Instagram Reels)
  social/YYYY-MM-DD/reel-cover.jpg  cover image (the lucky color card)
The music is generated here (original, royalty free), so the Reel never gets muted or claimed.
Needs ffmpeg (or: pip install imageio-ffmpeg --break-system-packages).
"""
import os, shutil, subprocess, sys, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
SLIDES = [('lucky-color.jpg', 6.0), ('how-to-use.jpg', 6.5), ('zodiac-story.jpg', 4.5)]
FADE = 0.7
FPS = 30


def ffmpeg_bin():
    exe = shutil.which('ffmpeg')
    if exe: return exe
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def note(freq, dur, amp, attack=0.02, release=None, bell=False):
    t = np.arange(int(SR * dur)) / SR
    if bell:
        w = np.sin(2 * np.pi * freq * t) + .35 * np.sin(2 * np.pi * freq * 2.01 * t) + .12 * np.sin(2 * np.pi * freq * 3.98 * t)
        env = np.exp(-t * 2.8)
    else:
        w = np.sin(2 * np.pi * freq * t) + .25 * np.sin(2 * np.pi * freq * 2 * t) + .08 * np.sin(2 * np.pi * freq * 3 * t)
        rel = release or dur * .4
        env = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / rel)
    return amp * w * np.clip(env, 0, 1)


def music(total, seed):
    """Calm pad + bell arpeggio, key changes with the date so each day sounds a little different."""
    rng = np.random.default_rng(seed)
    base = 220 * 2 ** (rng.integers(-3, 3) / 12)
    prog = [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]]  # I vi IV V
    out = np.zeros(int(SR * (total + 2)))
    bar = 4.0
    for i in range(int(np.ceil(total / bar))):
        chord = prog[i % 4]; start = int(i * bar * SR)
        for st in chord:
            seg = note(base * 2 ** (st / 12) / 2, bar + 1, .07, attack=1.2, release=1.5)
            out[start:start + len(seg)] += seg[:len(out) - start]
        for k in range(8):
            st = chord[(k + rng.integers(0, 3)) % 3] + 12 * (1 + (k % 2))
            seg = note(base * 2 ** (st / 12), 1.6, .05 if k % 2 else .065, bell=True)
            s = start + int(k * bar / 8 * SR)
            if s < len(out): out[s:s + len(seg)] += seg[:len(out) - s]
    # simple echo for space
    d = int(.32 * SR); echo = np.zeros_like(out); echo[d:] = out[:-d] * .35; out += echo
    out = out[:int(SR * total)]
    fade = int(1.5 * SR); out[-fade:] *= np.linspace(1, 0, fade); out[:int(.3 * SR)] *= np.linspace(0, 1, int(.3 * SR))
    return (out / max(1e-6, np.abs(out).max()) * .55 * 32767).astype(np.int16)


def main():
    date = sys.argv[1]
    folder = os.path.join(ROOT, 'social', date)
    for f, _ in SLIDES:
        if not os.path.exists(os.path.join(folder, f)):
            sys.exit(f'Missing {f}: run python3 tools/social_cards.py {date} first')
    total = sum(d for _, d in SLIDES) - FADE * (len(SLIDES) - 1)
    wav = os.path.join(folder, '_music.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(music(total, int(date.replace('-', ''))).tobytes())

    args = [ffmpeg_bin(), '-y', '-loglevel', 'error']
    for f, d in SLIDES:
        args += ['-loop', '1', '-t', str(d), '-i', os.path.join(folder, f)]
    args += ['-i', wav]
    parts = []
    for i, (_, d) in enumerate(SLIDES):
        frames = int(d * FPS)
        # slow, smooth push-in (scale up first so the zoom does not jitter)
        parts.append(f"[{i}:v]scale=2160:3840,zoompan=z='1+0.06*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                     f":d={frames}:s=1080x1920:fps={FPS},setsar=1,format=yuv420p[v{i}]")
    off = SLIDES[0][1] - FADE
    parts.append(f"[v0][v1]xfade=transition=fade:duration={FADE}:offset={off:.2f}[x1]")
    off += SLIDES[1][1] - FADE
    parts.append(f"[x1][v2]xfade=transition=fade:duration={FADE}:offset={off:.2f}[vout]")
    out = os.path.join(folder, 'reel.mp4')
    args += ['-filter_complex', ';'.join(parts), '-map', '[vout]', '-map', f'{len(SLIDES)}:a',
             '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-r', str(FPS),
             '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out]
    subprocess.run(args, check=True)
    os.remove(wav)
    shutil.copyfile(os.path.join(folder, 'lucky-color.jpg'), os.path.join(folder, 'reel-cover.jpg'))
    print(out, f'{os.path.getsize(out) / 1e6:.1f} MB', f'{total:.1f} s')


if __name__ == '__main__':
    main()
