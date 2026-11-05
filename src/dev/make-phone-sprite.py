"""Cuts the phone sprite out of the desktop one: every other frame, same frame size.

The memory, not the download, is the reason. 96 decoded frames are ~100 MB,
which is enough to get a tab killed on an iPhone, and the 26 MP sheet is over
the 16.7 MP iOS decodes images at full size. 48 frames in a 7x7 grid are ~50 MB
and ~13 MP. Over a thumb's scroll they read just as smooth.

Run from portfolio-3d/ after every re-bake of hero-cutout.webp:
    python -I src/dev/make-phone-sprite.py
"""
import json
import math
from pathlib import Path

from PIL import Image

ASSETS = Path("src/assets")
FRAMES = 48

src = json.loads((ASSETS / "hero-cutout.json").read_text())
fw, fh = src["frameWidth"], src["frameHeight"]
sheet = Image.open(ASSETS / "hero-cutout.webp").convert("RGBA")

cols = math.ceil(math.sqrt(FRAMES))
rows = math.ceil(FRAMES / cols)
out = Image.new("RGBA", (cols * fw, rows * fh), (0, 0, 0, 0))
for i in range(FRAMES):
    # Keeps both the first and the last pose: the last is what the still matches.
    k = round(i * (src["frameCount"] - 1) / (FRAMES - 1))
    x, y = (k % src["columns"]) * fw, (k // src["columns"]) * fh
    out.paste(sheet.crop((x, y, x + fw, y + fh)), ((i % cols) * fw, (i // cols) * fh))

out.save(ASSETS / "hero-cutout-phone.webp", quality=92, method=6, exact=True)
(ASSETS / "hero-cutout-phone.json").write_text(
    json.dumps({**src, "frameCount": FRAMES, "columns": cols, "rows": rows}, indent=2) + "\n"
)
print(out.size, (ASSETS / "hero-cutout-phone.webp").stat().st_size)
