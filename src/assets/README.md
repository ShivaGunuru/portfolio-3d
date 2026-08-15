# Portrait source

The particle head in the Hero and About sections is sampled from a photograph
placed here.

## Adding the photo

Save it in this directory as any one of:

```
src/assets/portrait.jpg
src/assets/portrait.jpeg
src/assets/portrait.png
src/assets/portrait.webp
```

Nothing else needs to change. The file is discovered at build time, so when
none is present the site makes no request for it at all and both stages fall
back to the parametric head. A file that is present but cannot be decoded falls
back the same way. The site is never broken by a missing or bad portrait.

To confirm it is being used, load the site and check either stage in devtools:

```
document.querySelector('[data-portrait]').dataset
// { portrait: "ready",       points: "16587" }   photo is being sampled
// { portrait: "unavailable" }                    fell back to parametric head
```

## What the photo should be

The sampler is tuned for a **head-and-shoulders portrait on a plain backdrop**:

- Roughly 3:4 portrait aspect. Other ratios work; the framing constants below
  are calibrated for 3:4.
- A plain, evenly lit backdrop. A gradient or vignette is fine, the background
  model tracks it per row. A busy or cluttered background is not, since it
  cannot be separated from the subject.
- Clear separation between subject and backdrop in brightness or colour.
- At least ~600px on the short edge. It is downsampled to 220px wide for
  sampling, so anything larger is plenty and costs nothing at runtime.

## Tuning

All constants live in [`src/three/portraitSampler.ts`](../three/portraitSampler.ts).

| Option | Default | What it does |
|---|---|---|
| `maxPoints` | 52000 | Upper bound on points. Background rejection usually lands it lower. |
| `sampleWidth` | 560 | Resolution the photo is sampled at. Higher is denser and slower. |
| `height` | 5.1 | World height of the sampled region. Larger fills more of the frame. |
| `depth` | 1.15 | How far the relief protrudes toward the camera. |
| `keepTop` | 0.7 | Fraction of the image kept from the top. Lower trims more chest/jacket. |
| `backgroundTolerance` | 0.055 | Per-step tolerance for the background flood fill. Raise if backdrop survives around the subject; lower if the fill leaks into it. |
| `colorMode` | `'palette'` | `'palette'` recolours by luminance into the site palette. `'photo'` keeps original colours. |

Point size lives in `src/three/HeadPoints.tsx`, not here, and is the first
thing to check if the portrait looks dim. `gl_PointSize` is clamped to a
minimum of 1px, so a value that works out below that renders every point at
the floor and makes tone-driven sizing do nothing. Adding points will not fix
that; raising `uSize` will.

`depthEnvelope()` in the same file positions the head and shoulder domes. If
the subject sits noticeably off-centre in the crop, adjust the centres there.

## Why a relief, and not a scanned 3D head

Generating a true 3D head mesh from one photograph needs a face-reconstruction
model, which this project does not carry. Instead the photo is given real depth
by two overlapping domes (head and shoulders) with luminance layered on top as
surface detail only.

That has one consequence worth knowing: **the result is a bas-relief, not a
closed volume.** It has a front and nothing behind it. This is why the portrait
rotates much less than the parametric head did (`PORTRAIT_TURN_ANGLE` in
[`src/three/HeadPoints.tsx`](../three/HeadPoints.tsx)). Turned far enough, the
flat side would face the camera and give it away. Don't raise that angle much
without checking how it reads.
