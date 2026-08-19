# CLAUDE.md

## Project

3D personal portfolio website for Shiva Gunuru, an AI engineer, built to support an active AI engineering job search. Four project case studies, an about section, and contact. Hero plays a real, background-removed video of the subject, scroll-locked and effect-free; About runs a generative 3D spherical-harmonic point field. See "The Hero cutout" and "The About field" below.

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

## The Hero cutout and the About field

**The two sections render fundamentally different things, not two variants of one system.** Hero plays a real, background-removed video of the subject, a plain 2D canvas with no shader effects. About runs a generative 3D spherical-harmonic point field in WebGL, no source footage at all. They used to share a `Stage`/`HeadStage` R3F wrapper behind a `variant` prop; Hero doesn't use R3F any more, so that prop is gone. If you find a `mode` or `variant` prop on `Stage`, or references to `data-hero-field`, `VideoField`, `videoFieldShaders.ts`, `bakeHeroVideo.ts`, `HeadPoints.tsx`, `usePortraitPoints.ts`, or `portraitSampler.ts`, they're stale: two earlier Hero designs (a static-portrait particle head, then a full video-particle field) were both replaced after user feedback, most recently "no particle animation, background removed, subject as it is, no effects." Neither pipeline exists any more.

**Work and Contact have no 3D or canvas at all.**

### The Hero cutout

`src/components/HeroCutoutStage.tsx` (mobile-hide, idle-deferred load, matches `Stage.tsx`'s shape) renders `HeroCutout.tsx`, a `<canvas>` that steps through a baked sprite sheet of the subject with the background removed, driven by the same `usePinnedStage` scroll progress every other stage uses. No WebGL, no shader, no glow, no hover effect: the brief was explicitly "clean... subject as it is... no effects."

| File | Role |
|---|---|
| `src/three/backgroundSeparation.ts` | Bounded flood-fill background separation. Pure function of pixel data in, mask out. Shared by the bake tool; not React/Three-specific despite living in `three/` |
| `src/dev/bakeHeroCutout.ts` | Dev-only, committed (not throwaway): video frames → baked cutout sprite sheet. Read it before touching the Hero visual |
| `src/dev/bake.html` | Run this in the dev server to re-bake after the source video changes; see its own instructions |
| `src/hooks/useHeroCutout.ts` | Loads and decodes `hero-cutout.png` + `.json`, degrades to `unavailable` on any failure |
| `src/components/HeroCutout.tsx` | The canvas: crops the current frame out of the sprite sheet and draws it, `object-fit: contain` |

**Motion is scroll-scrubbed by stepping to the nearest baked frame, never crossfading two.** Crossfading two independently-masked frames overlays two full poses at partial opacity mid-transition, which reads as a double-exposure ghost wherever the pose changed between frames, exactly the "effect" this design removed. Stepping is also what real scroll-scrubbed video does: decode and show the one frame nearest the scroll position.

**Frame positions in the sprite share one fixed crop window, computed as a union across every sampled frame,** the same reasoning the deleted particle bake used: frames must line up pixel-for-pixel when stepped through, or the subject would visibly jump on every frame change instead of moving the way it does in the source clip.

**That union's bounding box is trimmed by mass, not raw min/max.** A single frame's stray misclassified pixel (a corner vignette a hair's-breadth outside the backdrop bound, in a frame the clip's own exposure had drifted for) otherwise dictates the crop for all 36 frames on its own. Walking each axis's per-column/row subject-pixel count until it passes a small fraction (0.03%) of the total mass finds the real edge and ignores that kind of speck, the way a percentile ignores a handful of outliers.

**`backdropBound` is 0.4 here, not the portrait-era 0.3.** This clip's backdrop isn't evenly lit: a patch of it can sit far enough from the single top-strip reference colour to fail a tighter bound while still plainly being backdrop, and because it's real fabric texture (not a flat colour) that patch can be large enough to fully wall itself off from every seeded border, which local-continuity flood fill can't cross no matter how patient it is. Measured on the clip's darkest stretch: subject-classified area drops from 54.5% at bound 0.3 to 46.5% at 0.4, then flattens, so 0.4 is the point past which more tolerance stops buying anything. **A per-pixel colour-distance cleanup pass was tried first instead of raising this bound, and rejected**: being neighbour-blind, it also ate into beard and hair detail wherever a stray pixel's colour happened to fall inside the bound by chance. Raising the bound instead keeps the fix inside the flood fill, which only ever admits a pixel that is both colour-plausible *and* continuous with an already-admitted neighbour, so it can't do that. **If a future source video leaks background in an isolated patch, reach for this bound (and `keepLargestComponent` in `bakeHeroCutout.ts`, which discards every subject-classified island except the largest) before reaching for a blanket colour filter.**

**Alpha is feathered, not a hard cutout**, via a 1px erosion (strips the ring of mixed subject/backdrop colour the source video's own encoding leaves right at the silhouette edge) followed by a 2-pixel box blur. Erosion first matters: blurring the raw mask straight from `separateBackground` would smear that mixed-colour ring into a visible fringe instead of removing it.

**The first paint does not wait on `requestAnimationFrame`.** `HeroCutout.tsx` calls its draw function directly on mount, then lets it reschedule itself via rAF for every update after that. rAF never fires for a tab that mounts this while backgrounded (there's nothing to sync to until the tab is foregrounded), so gating the *first* draw behind it left the canvas blank until the user switched to the tab. Scroll-driven updates still run through rAF, which is fine: a user can't scroll a tab they can't see.

**`reducedMotion` holds one representative frame** (`still` prop, frame index `round(0.5 * (frameCount - 1))`, not the near-empty first or last frame of the clip) instead of stepping.

### The About field

Files: `harmonicGeometry.ts` (seeds, parameter sets, fit scale), `harmonicShaders.ts`, `HarmonicField.tsx`, rendered through `src/three/Stage.tsx` → `HeadStage.tsx`, which now only ever mounts this one scene.

**The harmonic form is solved per frame, never stored.** Each point knows only its angle on a Fibonacci-lattice sphere; position comes from `r = sin(m0 phi)^m1 + cos(m2 phi)^m3 + sin(m4 theta)^m5 + cos(m6 theta)^m7`, and scroll interpolates the eight exponents between two sets. **Exponents near 1 make it a fuzzy ball** (the first attempt filled the entire frame as noise); high exponents are what carve distinct lobes. `harmonicFitScale()` samples across the morph rather than just the endpoints, because the midpoint can be wider than either end. Verified: zero frame-edge contact at morph 0, 0.5 and 1.

`harmonicGeometry.ts` and `HarmonicField.tsx` differ only in casing from each other's original names; the data module was renamed for exactly that reason, since a case-insensitive filesystem collides on it.

**Point size must be set against the 1px floor, not by eye.** `gl_PointSize` is clamped to `ALIASED_POINT_SIZE_RANGE`, whose minimum is 1. At the stage's real scale (`uScale = canvasHeight * dpr / 2`, about 491 for a 561px box) a `uSize` of 0.0135 works out to 0.91px, so every point clamped to 1px and the tone-driven size modulation became inert regardless of point count. **Always check the pixel size before adding points if this field ever looks dim.**

**All per-point motion is in the vertex shader, not JavaScript.** The reference implementation in `docs/direction/` mutates thousands of positions in a JS loop every frame; that does not hold 60fps once cursor response is added on top. Measured on Intel UHD 620: 60fps steady at 26,000+ points, hovering adds no measurable cost. **Do not move per-point work back into JS.**

**The cursor test happens in NDC, not world space.** It matches what the user sees on screen rather than what is near in 3D.

**Every canvas must stay `pointer-events: none`,** including the inline `style` passed to `<Canvas>` — R3F writes `pointer-events: auto` on its own container and will otherwise swallow clicks near it. Cursor position comes from a `window` listener, so hover works without the canvas intercepting anything.

**Glow is done in-shader**, via additive blending plus a radial falloff and over-driven colour near the cursor. There is no postprocessing pass and no bloom dependency.

**`reducedMotion` holds a representative form rather than animating**, via the same `still` prop pattern as the Hero cutout.

### Shared by both

**Pinning is compatible with Lenis's default configuration** (`wrapper: window`, native scrollTop, no transformed wrapper div), so ScrollTrigger's `pin: true` works with GSAP's default `pinType: 'fixed'` and needs no extra config. Confirmed by reading Lenis's source, not just its docs. `scrub: true` (not a numeric lerp) is deliberate: Lenis already smooths scroll, so a second lerp on top would compound lag.

**Both sections are hidden entirely under 768px**, not shrunk. Pinning plus a mobile browser's address-bar show/hide resize is a well-known source of jank; per the mobile non-negotiable below, the right answer is no pinned visual there, not a smaller/glitchier version of it.

**Background separation is a bounded flood fill inward from the border**, in `backgroundSeparation.ts`, used by the Hero bake tool. Two failed approaches are worth not repeating: comparing each pixel to a reference colour (however carefully modelled, per-row included) keeps misreading the dark end of a vignette as subject, and an unbounded flood fill leaks through soft edges and hollows the subject into an outline. The fill needs *both* local step continuity and a global bound on how far a filled pixel may sit from the backdrop reference. `seedEdges` is configurable per side; the hero video seeds top/left/right only, since the subject's shoulders run off the bottom edge in every frame.

## Non-negotiables

- **Real DOM content.** Every section must have real, semantic HTML in the DOM independent of the canvas. Headings, paragraphs and links must exist and be readable/crawlable/accessible whether or not WebGL runs. The 3D canvas is a decorative/enhancement layer, never the only place content lives.
- **Respect `prefers-reduced-motion` everywhere.** GSAP/ScrollTrigger animations, Lenis smooth scroll, and any R3F/Three.js motion must check for and honor this media query, not just the CSS `scroll-behavior` fallback.
- **Mobile is a deliberate lighter experience**, not a shrunken desktop scene. Simplify or drop expensive 3D/scroll effects on mobile rather than scaling the same scene down.
- **No layout shift on load.** Fonts, canvas mounting, and async-loaded 3D assets must not cause CLS. Reserve space, use font-display strategies, etc.

## Working rules

- **Plan before executing** for any task touching more than 3 files. Produce a plan and wait for approval before making changes.
- **Ask before adding any new dependency.** Don't `npm install` anything not already in the stack list above without checking first.
