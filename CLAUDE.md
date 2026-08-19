# CLAUDE.md

## Project

3D personal portfolio website for Shiva Gunuru, an AI engineer, built to support an active AI engineering job search. Four project case studies, an about section, and contact, with a 3D "head" visualization (points/particles, built from a parametric surface) as the visual centerpiece that reacts to scroll position.

## Stack

- Vite
- React
- TypeScript
- React Three Fiber (`@react-three/fiber`) + drei (`@react-three/drei`)
- GSAP with ScrollTrigger
- Lenis (smooth scroll)
- Tailwind CSS

## Source of truth: read before touching content or styling

- **[docs/content-inventory.md](docs/content-inventory.md)**: all site copy. Positioning, hero, four project case studies (hook/problem/approach/stack/result), about, contact links, SEO metadata. Read at the start of any task that touches content.
- **[docs/direction/](docs/direction/)**: the locked visual direction, a Claude Design handoff bundle. `docs/direction/project/Utterance - Portfolio.dc.html` is the pixel reference for the whole site (palette, type scale, spacing, section layout, copy placement). `head-stage.js` is the reference implementation of the 3D head (Three.js, parametric surface, "points" treatment, scroll-driven phase). Read at the start of any task that touches styling or layout. Treat it as locked: match it, don't reinterpret it.

### Copy precedence

The two documents overlap and **their wording differs**. The prototype's copy is the inventory's copy edited to fit the locked layout: tightened throughout, and restructured in About, where the lead line is a display pull-quote whose short length is load-bearing. So:

1. **Prototype wording wins where it exists.**
2. **Inventory is canonical for facts** (links, stack lists, claims) and for anything the prototype doesn't cover.
3. **Inventory wins on substantive conflict**, as opposed to phrasing.

**Never invent copy.** Every rendered word must trace back to one of those two documents. In practice this is enforced by `src/content/site.ts`: all copy lives there, and components read from it rather than holding string literals. Add copy to that module, not to JSX.

### No em dashes

**The site uses no em dashes (—) anywhere.** This is a hard rule and it overrides verbatim transcription.

Both source documents in `docs/` still contain em dashes, and they have deliberately not been rewritten so their provenance stays intact. **Strip them when transcribing.** Don't substitute a hyphen or an en dash; restructure the sentence instead, using a comma, colon, parenthesis, or a full stop, whichever fits the cadence. `src/content/site.ts` has worked examples of all four.

En dashes are fine in numeric ranges (`1–10 scale`). Arrows (`↳`, `→`) are part of the visual direction and stay.

Check before committing copy:

```bash
grep -n "—" src/content/site.ts index.html
```

## Design tokens

Tailwind v4 is CSS-first, so **there is no `tailwind.config.js`**. Every token is declared in a `@theme` block in **[src/index.css](src/index.css)**, which is the only file in the project where a hex value or font name may appear. Tailwind generates utilities from each token (`--color-bg` → `bg-bg`, `text-bg`) *and* emits it as a real CSS custom property, which is how the Three.js layer reads the same values via `getComputedStyle` instead of keeping a second copy of the palette.

Colors: `bg`, `bg-glow`, `fg`, `body`, `muted`, `dim`, `faint`, `accent`, `edge`, `head-fg`.
Fonts: `font-display` (Syne), `font-sans` (IBM Plex Sans), `font-mono` (IBM Plex Mono).

Read `src/index.css` for the values and what each is for. Note `edge` is the hairline/border token, not `border`, which would collide with Tailwind's own `border-*` utilities.

Fonts are **self-hosted via `@fontsource`**, never loaded from the Google Fonts CDN. A CDN request sends every visitor's IP to Google, which is live GDPR exposure for a site meant to be found by EU recruiters. Syne and IBM Plex Sans use variable builds; IBM Plex Mono has no variable build, so its 400/500 weights are imported individually.

**Never hardcode a color or font in a component.** Use the utilities, or read the custom property.

## The 3D layer

**The two stages render different scenes.** Hero plays a baked video-particle field (`variant="video"`), a subject isolated from `Create_an_ultra_photorealistic.mp4` whose motion is locked to scroll; About runs a generative spherical-harmonic field (`variant="harmonic"`) that has no source footage at all, so About must not request or sample it. Files: `harmonicGeometry.ts` (seeds, parameter sets, fit scale), `harmonicShaders.ts`, `HarmonicField.tsx`.

**The harmonic form is solved per frame, never stored.** Each point knows only its angle on a Fibonacci-lattice sphere; position comes from `r = sin(m0 phi)^m1 + cos(m2 phi)^m3 + sin(m4 theta)^m5 + cos(m6 theta)^m7`, and scroll interpolates the eight exponents between two sets. **Exponents near 1 make it a fuzzy ball** (the first attempt filled the entire frame as noise); high exponents are what carve distinct lobes. `harmonicFitScale()` samples across the morph rather than just the endpoints, because the midpoint can be wider than either end. Verified: zero frame-edge contact at morph 0, 0.5 and 1.

**The portrait crop dissolves at the bottom** via `fadeBand`, which thins the population *and* dims what survives. Fading opacity alone leaves a straight line of faint points, which still reads as a line. Before it existed, the bottom row held the highest density in the whole cloud at full brightness, which is what made the crop look guillotined.

`harmonicGeometry.ts` and `HarmonicField.tsx` differ only in casing from each other's original names; the data module was renamed for exactly that reason, since a case-insensitive filesystem collides on it.

**There is no page-wide canvas.** Two independent "stages" live inside their own section's layout column: Hero (`variant="video"`) and About (`variant="harmonic"`). Work and Contact have no 3D. Each stage is pinned via GSAP ScrollTrigger while its section is in view — the viewport holds in place and the scroll gesture drives that section's animation to completion (progress 0→1), then the section unpins and normal scrolling continues. This replaced an earlier single full-page fixed background layer; if you find references to that design elsewhere, they're stale. An earlier version of Hero also sampled a static portrait photo into points (`portraitSampler.ts`, `headSurface.ts`, `headShaders.ts`, `HeadPoints.tsx`, `usePortraitPoints.ts`); that pipeline is gone, replaced by the video bake below, and those files no longer exist. If you find references to `data-portrait`, `data-points`, or a `mode` prop on `Stage`/`HeadStage`, they're stale too.

| File | Role |
|---|---|
| `src/three/backgroundSeparation.ts` | Bounded flood-fill background separation, shared by the bake tool. Pure function of pixel data in, mask out |
| `src/dev/bakeHeroVideo.ts` | Dev-only, committed (not throwaway): video frames → baked particle field. Read it before touching any Hero visual |
| `src/three/videoFieldShaders.ts` | GLSL for the Hero field. All per-point motion lives here |
| `src/three/VideoField.tsx` | Uniform wiring, easing, tone-texture upload; takes `data` + `progress` + `still` as props, computes nothing about scroll or background separation itself |
| `src/hooks/useHeroField.ts` | Loads and unpacks `hero-field.bin`/`.json`, degrades to `unavailable` on any failure |
| `src/three/HeadStage.tsx` | The section-scoped canvas: token reading, mobile-hide, variant switch between the video field and the harmonic field |
| `src/hooks/usePinnedStage.ts` | GSAP ScrollTrigger `pin: true, scrub: true` on a section ref → a 0..1 progress ref |
| `src/hooks/usePointer.ts` | Window pointer → NDC |

### Hero is a baked video, not a live effect

The subject in `Create_an_ultra_photorealistic.mp4` is isolated from its background and turned into a particle field whose motion is **locked to scroll**: progress 0..1 maps directly to a position in the clip, nothing plays independently. This is baked offline by `src/dev/bakeHeroVideo.ts`, not computed at runtime, because per-frame background separation measured ~175ms/frame against the real source video, far too slow for live scroll-scrubbing. Run the bake again any time the hero video changes; see the tool's own doc comment for the procedure.

**Point positions are a fixed grid, unioned across every sampled frame, not recomputed per frame.** An independently-thinned candidate list from each frame has no correspondence to any other frame's list, so there is nothing to interpolate between. Instead every (x,y) grid location ever classified as subject in *any* sampled frame gets one permanent point; a frame where that location isn't subject just gives it tone 0 (invisible) for that frame. Position never changes; only tone does, read from a per-frame tiled `DataTexture` and blended between the two nearest baked frames by the scroll-driven fractional progress.

**A multi-frame union is inherently more spread than a single static crop, and that costs brightness.** The first bake mapped the video's raw 16:9 frame aspect directly into world space, spreading points across the same area a static portrait crop would need roughly six times over (lots of blank backdrop either side of a centred subject in a wide frame), which cut additive-blend density, and with it brightness, by about the same factor: point size alone could not close the gap. The fix has two parts, both in `bakeHeroVideo.ts`: fit world-space to the *subject's own tight bounding box* (not the frame's aspect ratio), and keep `worldHeight` small (3.4, not a bigger number that "looks more spacious") since even the fitted union still has to hold every sampled pose's extent at once, wider than one photo ever would. Measured density at `worldHeight` 5.6 / 4.0 / 3.4 was 1217 / 2399 / 3307 points per sq-unit; only 3.4 reached the portrait-era working range (~5250). **If this field ever looks dim again, check point density (count ÷ world-space area) before adding points or upsizing `uSize`.**

**`uSize` is bigger than the old portrait's (0.105 vs 0.055) for the same 1px-floor reason documented below**, because this field's density, even after the fixes above, is still lower than a static portrait crop's. Verified at the stage's real scale: 0.105 lands face brightness at 97-110 across the *entire* scroll range (checked at progress 0.05 through 0.95, not just one frame), matching the portrait-era working band of 94-120.

**Pointer-push (`uPush`) is 0 for this field, not the portrait-era 0.55.** The push term (`videoFieldShaders.ts`) displaces points radially away from the cursor by a distance scaled by `smoothstep(uRadius, 0, dist)`: points near the cursor move nearly the full `uPush` distance, points at the radius barely move, which always collapses into a ring/shell shape, not a soft glow. At this field's larger point size that ring rendered as a hard, ugly donut hole rather than a glow. Zero push keeps the brightening/enlarging/recolour terms, which are driven by the same `influence` value and don't need displacement, so hovering still reads as a diffuse warm bloom, just without moving anything. Confirmed visually before locking this in; don't reintroduce push here without re-checking the rendered result, not just the numbers.

**Deliberately no idle motion.** Every other particle system on this site turns or sways on its own; this one does not, because the entire point of it is that the subject's motion is locked to the scroll gesture. There's a tiny per-point breathing pulse (`videoFieldShaders.ts`) and that's all.

**Each stage exposes `data-hero-field`** (video) or the harmonic equivalent on its container, so load status is inspectable rather than guessed at.

**Colours are fixed per point**, from that point's mean tone across the frames where it's visible, remapped into the palette by luminance the same way the portrait was. Per-frame variation lives entirely in the tone texture; colour doesn't need a second per-frame channel.

### Shared across both stages

**Point size must be set against the 1px floor, not by eye.** `gl_PointSize` is clamped to `ALIASED_POINT_SIZE_RANGE`, whose minimum is 1. At a stage's real scale (`uScale = canvasHeight * dpr / 2`, about 491 for a 561px box) a `uSize` of 0.0135 works out to 0.91px, so every point clamped to 1px, the tone-driven size modulation became inert, and the render looked dim and sparse no matter how many points were thrown at it. This is what happened to both the portrait (fixed at `uSize` 0.055) and, differently, the video field (fixed at `uSize` 0.105, see above) — **always check the pixel size before adding points.**

**Background separation is a bounded flood fill inward from the border**, in `backgroundSeparation.ts`. Two failed approaches are worth not repeating: comparing each pixel to a reference colour (however carefully modelled, per-row included) keeps misreading the dark end of a vignette as subject, and an unbounded flood fill leaks through soft edges and hollows the subject into an outline. The fill needs *both* local step continuity and a global bound on how far a filled pixel may sit from the backdrop reference. `seedEdges` is configurable per side; the hero video seeds top/left/right only, since the subject's shoulders run off the bottom edge in every frame.

**All per-point motion is in the vertex shader, not JavaScript.** The reference implementation in `docs/direction/` mutates thousands of positions in a JS loop every frame. Adding per-point cursor response on top of that does not hold 60fps. Breathing, scatter/tone and cursor push are computed per-point on the GPU from time, progress and pointer uniforms. Measured on Intel UHD 620: 60fps steady at 26,000+ points in a single stage, and hovering adds no measurable cost. **Do not move per-point work back into JS.**

**Pinning is compatible with Lenis's default configuration** (`wrapper: window`, native scrollTop, no transformed wrapper div), so `pin: true` works with GSAP's default `pinType: 'fixed'` and needs no extra config. Confirmed by reading Lenis's source, not just its docs. `scrub: true` (not a numeric lerp) is deliberate: Lenis already smooths scroll, so a second lerp on top would compound lag.

**Both stages are hidden entirely under 768px**, not shrunk. Pinning plus a mobile browser's address-bar show/hide resize is a well-known source of jank; per the mobile non-negotiable below, the right answer is no 3D there, not a smaller/glitchier version of it.

**The cursor test happens in NDC, not world space.** It matches what the user sees on screen rather than what is near in 3D. Hover stays active throughout the pinned animation (a deliberate choice, not an oversight) — it's a separate uniform from progress/rotation, so both run simultaneously without conflict.

**Every canvas must stay `pointer-events: none`,** including the inline `style` passed to `<Canvas>` — R3F writes `pointer-events: auto` on its own container and will otherwise swallow clicks near it. Cursor position comes from a `window` listener, so hover works without the canvas intercepting anything.

**Glow is done in-shader**, via additive blending plus a radial falloff and over-driven colour near the cursor. There is no postprocessing pass and no bloom dependency.

**`reducedMotion` holds a representative frame rather than animating.** Both `HarmonicField` and `VideoField` accept a `still` prop; the video field holds `uProgress` at 0.5 (a frame partway through the clip, not a near-empty first/last frame) with no pointer response and no breathing.

## Non-negotiables

- **Real DOM content.** Every section must have real, semantic HTML in the DOM independent of the canvas. Headings, paragraphs and links must exist and be readable/crawlable/accessible whether or not WebGL runs. The 3D canvas is a decorative/enhancement layer, never the only place content lives.
- **Respect `prefers-reduced-motion` everywhere.** GSAP/ScrollTrigger animations, Lenis smooth scroll, and any R3F/Three.js motion must check for and honor this media query, not just the CSS `scroll-behavior` fallback.
- **Mobile is a deliberate lighter experience**, not a shrunken desktop scene. Simplify or drop expensive 3D/scroll effects on mobile rather than scaling the same scene down.
- **No layout shift on load.** Fonts, canvas mounting, and async-loaded 3D assets must not cause CLS. Reserve space, use font-display strategies, etc.

## Working rules

- **Plan before executing** for any task touching more than 3 files. Produce a plan and wait for approval before making changes.
- **Ask before adding any new dependency.** Don't `npm install` anything not already in the stack list above without checking first.
