# About Field Refinement: Design

**Status:** approved 2026-09-04

## Goal

The About section's harmonic point field reads, in the user's words, as sloppy
and amateurish. Refine it into something that reads as a designed object, and
remove the soft-cloud background box so it sits directly on the white page like
the Hero cutout does.

The field stays a live spherical-harmonic point cloud that reorganises on
scroll. Replacing it with a different subject, or dropping WebGL entirely, were
both considered and rejected: the field is the one element on the site that
demonstrates engineering rather than describing it.

## Diagnosis

Four specific faults, not a general quality problem. Each was isolated by
rendering the real modules offscreen and comparing.

1. **Decorative speckle.** `buildHarmonicField` recolours 14% of points
   (`accentRatio = 0.14`) to `--color-accent`, scattered through the volume so
   the highlight "reads as sparkle through the volume instead of a stripe
   across it". That reasoning held on the old near-black page. On white,
   randomly placed amber specks read as dirt: scanner dust or JPEG artifacts.

2. **The silhouette is a spray, not a form.** `HARMONIC_A` and `HARMONIC_B`
   use exponent 6 in almost every term. High exponents carve distinct lobes,
   which is why they were chosen, but combined with equal-area Fibonacci
   sampling they stretch the lobes into thin radiating sprays of scattered
   points. The result is a firework, not an object.

3. **No depth cueing.** Point size falls off with distance through the
   perspective divide, but the camera sits at z 7.3 with a form of radius
   around 1.5, so that variation is roughly 25% and invisible. Nothing else
   distinguishes near from far, so 42,000 points render as a flat speckle
   field rather than a volume.

4. **Points near the radius floor pile up at the origin.** `harmonicRadius`
   ends in `max(r, 0.12)`. Every angle where all four terms cancel lands on
   that floor, so a visible dark knot forms at the centre of the frame. Those
   points carry no shape information.

A fifth issue is framing rather than rendering: `harmonicFitScale` computes one
world scale across the whole morph, so a morph whose endpoints differ in radius
renders one end much smaller than the other.

## Design

### Form

```
HARMONIC_A = [2, 2, 2, 2, 2, 2, 2, 2]   // sphere
HARMONIC_B = [2, 4, 3, 4, 2, 4, 3, 4]   // four-pointed star
```

Exponents drop from 6 to the 2 to 4 range. Both endpoints have closed
silhouettes with legible surface structure, and so does every intermediate
step: rendered at morph 0, 0.25, 0.5, 0.75 and 1, the sequence runs sphere,
rounded cube, four-petal, cross, four-pointed star. The scroll now reads as a
system resolving from an undifferentiated ball into structure.

Sphere-to-lens (`[1,3,2,3,3,3,2,3]`) was rendered as the alternative and
rejected: prettier in isolation, but the botanical read sits oddly beside copy
about retrieval systems and backend engineering.

### Material

- **Remove the accent speckle.** Delete the `accentColor` and `accentRatio`
  parameters from `buildHarmonicField`, along with the per-point accent branch.
  Nothing else consumes them, so they are removed rather than defaulted to
  zero. `HeadStage` stops reading `--color-accent` and stops passing
  `accentColor` to `HarmonicField`.

- **Add depth cueing.** A new `vDepth` varying, computed in the vertex shader
  from view-space depth and consumed in the fragment shader:

  ```glsl
  // vertex
  vDepth = clamp((-viewPos.z - 5.2) / 4.2, 0.0, 1.0);

  // fragment
  float alpha = falloff * uOpacity * vTone * mix(1.0, 0.2, vDepth) * (1.0 + vGlow * 0.35);
  ```

  The near side holds full weight and the far side fades toward the page. This
  is the largest single improvement of the five changes.

- **Point size `uSize` 0.05 to 0.07**, point count unchanged at 42,000.
  Measured against the alternatives at matching apparent density: 24,000 points
  at 0.08 reads chunky, with individual dots too separately visible; 70,000 at
  0.042 is smoother but lighter, and costs 66% more points for a worse result.
  Raising size alone is the free win.

- **Fade the degenerate points.** In the vertex shader:

  ```glsl
  vTone = (0.30 + 0.70 * shade) * smoothstep(0.13, 0.45, r);
  ```

  Points sitting on or near the `max(r, 0.12)` floor fade out. Verified to
  remove the centre knot at both morph 0.5 and morph 1 with no other visible
  change to the form.

### Framing

- **Remove the background box.** Drop `bg-bg-soft` from the `Stage` className
  in `About.tsx`, so the field sits on the page's white exactly as the Hero
  cutout does. Verified: `About.tsx` is the token's last consumer, so
  `--color-bg-soft` will then have none in `src/`. Leave the token defined and
  leave `bake.html`'s reference to it alone, since that documents how to
  restore a staged backdrop if footage ever needs one again. Note in CLAUDE.md
  that no component currently uses it.

- **Normalise scale per morph.** Build a lookup table of fit scales at mount
  and interpolate it per frame, replacing the single `uScaleWorld` value:

  - 17 entries across morph 0 to 1.
  - Each entry fits the shape at that morph, interpolated with the same
    `t = m * m * (3 - 2 * m)` easing the vertex shader applies, so the table
    and the shader agree about what shape is on screen.
  - Per frame, `uScaleWorld` is a linear interpolation between the two
    bracketing entries, driven by the already-smoothed morph value.

  This is required rather than cosmetic. Without it the sphere end renders at
  roughly half the linear size of the star end and the object visibly swells
  through the scroll. Computing the fit per frame is not an option: measured at
  2.37ms per call against a 16.7ms frame budget.

  **Build the table with a single-shape fit, not `harmonicFitScale`.** That
  function takes two parameter sets and walks 5 morph steps between them. Given
  the same set twice, which is what a per-morph fit needs, all 5 steps evaluate
  identical parameters and it performs six redundant 64x64 scans. Extract a
  helper that interpolates once and scans once. It keeps the full 64x64 angular
  resolution, so there is no accuracy compromise, and it costs roughly 0.4ms
  per entry: about 7ms to build the whole table, once, on the lazily-loaded 3D
  chunk that already waits for browser idle.

### Unchanged

Scroll-pin mechanics, the `still` reduced-motion frame, the sub-768px hide,
normal blending, `uPush: 0`, and the hover glow. The glow keeps
`--color-head-glow`: cursor-driven emphasis is signal, which is exactly what
the removed speckle was not.

## Verification

- **No frame contact.** The per-morph fit keeps full angular resolution, so it
  should be at least as tight as the value it replaces, but the failure mode if
  it is not is the form touching the frame edge. Render at morph 0, 0.25, 0.5,
  0.75 and 1 and confirm the form's bounding box stays inside the canvas, the
  same check the original fit scale was given.
- **Centre knot gone.** Confirm no dark cluster at the origin at morph 0.5 and
  morph 1.
- **Background merge.** The stage box background must compute to the page white
  with no box edge, matching the Hero.
- **Reduced motion.** The still frame renders and holds, unchanged.
- **Existing suites.** `palette.test.ts`, `content.test.ts` and
  `reducedMotion.test.ts` all pass, plus typecheck and production build.

## Files

| File | Change |
|---|---|
| `src/three/harmonicGeometry.ts` | New `HARMONIC_A`/`HARMONIC_B`; drop accent params from `buildHarmonicField`; add a single-shape fit helper and the morph fit table |
| `src/three/harmonicShaders.ts` | `vDepth` varying; depth term in alpha; floor fade on `vTone` |
| `src/three/HarmonicField.tsx` | `uSize` 0.07; build the fit table at mount; drive `uScaleWorld` per frame; drop `accentColor` prop |
| `src/three/HeadStage.tsx` | Stop reading `--color-accent` and passing `accentColor` |
| `src/components/sections/About.tsx` | Remove `bg-bg-soft` |
| `CLAUDE.md` | Record the diagnosis and why each value is what it is |

## Out of scope

Point count, camera, pin mechanics, the Hero, and the rest of the palette.
