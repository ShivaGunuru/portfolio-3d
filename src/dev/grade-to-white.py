"""Grade a near-white studio clip to pure white and cut the subject out.

Usage (from portfolio-3d/):
    ffmpeg -i "../new(argon).mp4" -vf fps=3.6 /tmp/raw/f%03d.png
    python src/dev/grade-to-white.py /tmp/raw public/_bake-frames

Writes RGBA frames for src/dev/bake.html, whose `none` matte keeps the
frame's own alpha. Needs Python 3 with numpy, scipy and Pillow (a dev tool
only; nothing here ships).

Two steps, both fixed functions of the pixels, never estimates fitted per
frame. A matte or level fitted per frame wobbles wherever the estimate is
marginal, and that wobble was the old Hero's flicker; a constant function of
the pixel cannot drift.

1. Grade to white. The Gemini/Veo clip arrived light grey with a vignette
   (223 in the top corners, 244 at mid-edges, nothing at 255). One curve lifts
   bright NEUTRAL pixels to 255 and leaves coloured ones alone, gated on chroma
   (max - min channel): the wall measured 0-2, skin at its brightest 30+. With
   the gate, skin moved by exactly 0.00 on average; a brightness-only curve had
   flattened forehead and hand highlights. The white tee is neutral and goes to
   pure white, which is fine: the blazer still draws its shape.

2. Cut out. The portrait used to be composited with mix-blend-mode: multiply
   to make that white vanish over the giant back name. Multiply also darkened
   the subject wherever the pale name sat behind it, in letter shapes the
   camera push then magnified across the face, and once the hi-res still
   swapped in over the frame canvas it multiplied the image by itself. A real
   alpha channel replaces all of that:
     - Background: pure-white regions touching the top, left or right edge,
       plus enclosed pure-white pockets of at least POCKET_MIN_FRACTION of the
       frame (the gap between a raised arm and the neck).
     - Kept opaque: pure white that reaches the bottom edge (the tee, which
       always runs off the bottom of a chest-up crop) and specks smaller than
       the pocket floor (glints on the sunglasses).
     - Edge: within EDGE_PX of the background, alpha comes from treating white
       as the transparent colour ("colour to alpha"), so antialiased edges stay
       soft and composite back over white to exactly the graded pixel.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

# Brightness ramp: untouched below K0, fully white from K1. K1 sits under the
# darkest background corner (223) with margin.
K0, K1 = 170.0, 218.0
# Chroma gate: fully lifted at or below C0, untouched from C1.
C0, C1 = 10.0, 26.0
# Enclosed white regions smaller than this share of the frame stay opaque.
POCKET_MIN_FRACTION = 0.0015
# Width of the soft edge band around the background, in pixels.
EDGE_PX = 2


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


def background_mask(graded: np.ndarray) -> np.ndarray:
    white = (graded == 255).all(axis=2)
    labels, count = ndimage.label(white, structure=np.ones((3, 3), dtype=bool))
    if count == 0:
        return np.zeros_like(white)
    h, w = white.shape
    top = set(np.unique(labels[0])) | set(np.unique(labels[:, 0])) | set(np.unique(labels[:, -1]))
    bottom = set(np.unique(labels[-1]))
    sizes = ndimage.sum(white, labels, index=np.arange(1, count + 1))
    keep = np.zeros(count + 1, dtype=bool)
    floor = POCKET_MIN_FRACTION * h * w
    for label in range(1, count + 1):
        if label in top:
            keep[label] = True
        elif label not in bottom and sizes[label - 1] >= floor:
            keep[label] = True
    return keep[labels]


def cut_out(graded: np.ndarray) -> np.ndarray:
    bg = background_mask(graded)
    near = ndimage.binary_dilation(bg, iterations=EDGE_PX) & ~bg
    rgb = graded.astype(np.float64)
    alpha = np.ones(bg.shape)
    alpha[bg] = 0.0
    # Colour to alpha from white: the most transparent alpha that, composited
    # over white, reproduces the pixel exactly.
    edge_alpha = ((255.0 - rgb) / 255.0).max(axis=2)
    a = edge_alpha[near]
    safe = np.maximum(a, 1e-6)[..., None]
    rgb[near] = np.clip(255.0 - (255.0 - rgb[near]) / safe, 0, 255)
    alpha[near] = a
    rgb[bg] = 255.0
    out = np.dstack([rgb, alpha * 255.0])
    return np.clip(np.round(out), 0, 255).astype(np.uint8)


def main() -> None:
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    frames = sorted(src.glob('*.png'))
    for i, path in enumerate(frames, start=1):
        rgb = np.asarray(Image.open(path).convert('RGB'))
        Image.fromarray(cut_out(grade(rgb)), 'RGBA').save(out / f'frame{i:03d}.png')
    print(f'graded and cut out {len(frames)} frames into {out}')


if __name__ == '__main__':
    main()
