"""Lift a near-white studio background to pure white, before baking.

Usage (from portfolio-3d/):
    ffmpeg -i "../new(argon).mp4" -vf fps=3.6 /tmp/raw/f%03d.png
    python src/dev/grade-to-white.py /tmp/raw public/_bake-frames

Then run src/dev/bake.html as usual. Needs Python 3 with numpy and Pillow
(a dev tool only; nothing here ships).

Why it exists: the Hero relies on the clip's background being exactly the
page's #ffffff, so the frames merge into the page with no visible box (see
"The Hero keeps its background" in CLAUDE.md). The Gemini/Veo clip arrived
light grey with a vignette: 223 in the top corners, 244 at mid-edges, and no
pixel at 255. On the white page that is a grey rectangle with dark corners.

How: one fixed curve, applied identically to every frame, that lifts bright
NEUTRAL pixels to white and leaves anything coloured alone.
  - Fixed, not estimated per frame. A matte or level fitted per frame
    wobbles wherever the estimate is marginal, and that wobble was the old
    Hero's flicker. A constant function of the pixel cannot drift.
  - Gated on chroma (max - min channel). The wall measured 0-2, skin at its
    brightest 30+. A brightness-only curve also flattened forehead and hand
    highlights; with the chroma gate, skin moved by exactly 0.00 on average.
    The white tee is neutral and does go to pure white, which is fine: it
    sits inside the blazer, so the blazer still draws its shape.

Measured on new(argon).mp4: background 99.8% at 255 on every sampled frame,
the rest being the antialiased edge of the silhouette.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# Brightness ramp: untouched below K0, fully white from K1. K1 sits under the
# darkest background corner (223) with margin.
K0, K1 = 170.0, 218.0
# Chroma gate: fully lifted at or below C0, untouched from C1.
C0, C1 = 10.0, 26.0


def smoothstep(e0: float, e1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def grade(rgb: np.ndarray) -> np.ndarray:
    a = rgb.astype(np.float64)
    lum = a.mean(axis=2)
    chroma = a.max(axis=2) - a.min(axis=2)
    lift = smoothstep(K0, K1, lum) * (1.0 - smoothstep(C0, C1, chroma))
    # Monotonic in each channel: x + (255 - x) * s never decreases.
    return np.clip(np.round(a + (255.0 - a) * lift[..., None]), 0, 255).astype(np.uint8)


def main() -> None:
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    frames = sorted(src.glob('*.png'))
    for i, path in enumerate(frames, start=1):
        rgb = np.asarray(Image.open(path).convert('RGB'))
        Image.fromarray(grade(rgb)).save(out / f'frame{i:03d}.png')
    print(f'graded {len(frames)} frames into {out}')


if __name__ == '__main__':
    main()
