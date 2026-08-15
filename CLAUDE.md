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

**There is no page-wide canvas.** Two independent "stages" live inside their own section's layout column: Hero (mode `assemble`) and About (mode `turn`). Work and Contact have no 3D. Each stage is pinned via GSAP ScrollTrigger while its section is in view — the viewport holds in place and the scroll gesture drives that section's animation to completion (progress 0→1), then the section unpins and normal scrolling continues. This replaced an earlier single full-page fixed background layer; if you find references to that design elsewhere, they're stale.

| File | Role |
|---|---|
| `src/three/portraitSampler.ts` | Photo → point cloud. Bounded flood-fill background separation, depth envelope, tone normalisation, palette recolour |
| `src/three/headSurface.ts` | Parametric head volume + area-weighted point sampling. **Fallback only** |
| `src/three/headShaders.ts` | GLSL. All per-point motion lives here |
| `src/three/HeadPoints.tsx` | Uniform wiring, easing, group rotation; takes `progress` + `mode` + optional `portrait` as props, computes nothing about scroll itself |
| `src/three/HeadStage.tsx` | The section-scoped canvas: token reading, mobile-hide, IntersectionObserver-gated frame loop, portrait loading |
| `src/hooks/usePortraitPoints.ts` | Loads the portrait photo, samples it, degrades to `unavailable` on any failure |
| `src/hooks/usePinnedStage.ts` | GSAP ScrollTrigger `pin: true, scrub: true` on a section ref → a 0..1 progress ref |
| `src/hooks/usePointer.ts` | Window pointer → NDC |

### The point cloud is a photograph

Both stages sample **`src/assets/portrait.*`** into points, so the head is the subject's actual likeness rather than a generic form. See [`src/assets/README.md`](src/assets/README.md) for how to swap the photo and every tuning constant.

The path is resolved with `import.meta.glob` at build time, not fetched from a fixed public URL. The photo is optional, and probing a fixed path for a file that is not there logs a 404 in every visitor's console; this way an absent portrait produces no request at all. It also gets content hashing and immutable cache headers, which a `public/` file would not.

**The parametric head is now a fallback, not the primary.** If the photo is missing or undecodable, `usePortraitPoints` reports `unavailable` and `HeadPoints` renders `sampleHeadPoints` instead. The 3D layer is decorative, so a missing asset must never be able to break the page. Don't delete `headSurface.ts`.

**Missing files can return HTTP 200.** Vite's dev server answers an absent `/images/portrait.jpg` with `index.html` and a 200 status. The loader therefore keys off `Image.onerror`, which correctly rejects undecodable content, rather than checking the response status, which would be fooled. Verified directly. Don't "improve" this into a `fetch`-status check.

**The portrait is a bas-relief, not a closed volume.** It has a front and nothing behind it, so it rotates far less than the parametric head did: `PORTRAIT_TURN_ANGLE` and `PORTRAIT_IDLE_SWAY` in `HeadPoints.tsx` are deliberately small. Raising them swings the flat side toward the camera.

**Colours are remapped into the palette by luminance**, not taken from the photo, so the locked visual direction survives a full-colour source. `colorMode: 'photo'` opts out.

**Point size must be set against the 1px floor, not by eye.** `gl_PointSize` is clamped to `ALIASED_POINT_SIZE_RANGE`, whose minimum is 1. At the stage's real scale (`uScale = canvasHeight * dpr / 2`, about 491 for a 561px box) a `uSize` of 0.0135 works out to 0.91px, so every point clamped to 1px, the tone-driven size modulation became inert, and the face rendered dim and sparse no matter how many points were thrown at it. Measured at that scale: 0.035 gives ~2.3px and mean face brightness 39; 0.045 ~3.0px and 64; 0.055 ~3.7px and 94 to 120. The shipped value is 0.055, which costs 1.71ms per frame for 48.8k points, roughly ten times under the 60fps budget. **If the portrait ever looks dim again, check the pixel size before adding points.**

**Tone is normalised across the subject, and drives point size and opacity, not just hue.** This is what makes a sampled photo read as a face rather than an evenly lit blob. Absolute luminance is useless: this subject is *darker* than his own backdrop, so the range that matters is the one inside the subject. The `aLuma` attribute carries it, and the parametric fallback supplies the same attribute as a depth cue so both paths share one shader.

**Background separation is a bounded flood fill inward from the border.** Two failed approaches are worth not repeating: comparing each pixel to a reference colour (however carefully modelled, per-row included) keeps misreading the dark end of a vignette as subject, and an unbounded flood fill leaks through soft edges and hollows the subject into an outline. The fill needs *both* local step continuity and a global bound on how far a filled pixel may sit from the backdrop reference.

**Each stage exposes `data-portrait` and `data-points`** on its container, so whether the photo loaded is inspectable rather than guessed at.

**All per-point motion is in the vertex shader, not JavaScript.** The reference implementation in `docs/direction/` mutates thousands of positions in a JS loop every frame. Adding per-point cursor response on top of that does not hold 60fps. Breathing, scatter and cursor push are computed per-point on the GPU from `uScatter`, `uTime` and `uPointer`. Measured on Intel UHD 620: 60fps steady at 26,000 points in a single stage, and hovering adds no measurable cost. **Do not move per-point work back into JS.** 18,000 points per stage now that two can exist; each stage's `frameloop` drops to `'demand'` while off-screen, so an unpinned stage isn't still paying full render cost.

**`uScatter` is a plain 0..1 shader value, not a scroll phase.** `HeadPoints` decides what it means per `mode`: `assemble` maps it directly to `1 - progress` (formed at progress 1); `turn` holds it at 0 (head never dissolves) and instead rotates the group from front-facing to `TURN_ANGLE`. `TURN_ANGLE` is deliberately short of a full 90°, since a true profile points the head edge-on to the fixed front camera and reads as empty space, not a turned head.

**Pinning is compatible with Lenis's default configuration** (`wrapper: window`, native scrollTop, no transformed wrapper div), so `pin: true` works with GSAP's default `pinType: 'fixed'` and needs no extra config. Confirmed by reading Lenis's source, not just its docs. `scrub: true` (not a numeric lerp) is deliberate: Lenis already smooths scroll, so a second lerp on top would compound lag.

**Both stages are hidden entirely under 768px**, not shrunk. Pinning plus a mobile browser's address-bar show/hide resize is a well-known source of jank; per the mobile non-negotiable below, the right answer is no 3D there, not a smaller/glitchier version of it.

**The cursor test happens in NDC, not world space.** It survives the group's scroll-driven rotation and matches what the user sees on screen rather than what is near in 3D. Hover stays active throughout the pinned animation (a deliberate choice, not an oversight) — it's a separate uniform from `uScatter`/rotation, so both run simultaneously without conflict.

**Every canvas must stay `pointer-events: none`,** including the inline `style` passed to `<Canvas>` — R3F writes `pointer-events: auto` on its own container and will otherwise swallow clicks near it. Cursor position comes from a `window` listener, so hover works without the canvas intercepting anything.

**Glow is done in-shader**, via additive blending plus a radial falloff and over-driven colour near the cursor. There is no postprocessing pass and no bloom dependency.

## Non-negotiables

- **Real DOM content.** Every section must have real, semantic HTML in the DOM independent of the canvas. Headings, paragraphs and links must exist and be readable/crawlable/accessible whether or not WebGL runs. The 3D canvas is a decorative/enhancement layer, never the only place content lives.
- **Respect `prefers-reduced-motion` everywhere.** GSAP/ScrollTrigger animations, Lenis smooth scroll, and any R3F/Three.js motion must check for and honor this media query, not just the CSS `scroll-behavior` fallback.
- **Mobile is a deliberate lighter experience**, not a shrunken desktop scene. Simplify or drop expensive 3D/scroll effects on mobile rather than scaling the same scene down.
- **No layout shift on load.** Fonts, canvas mounting, and async-loaded 3D assets must not cause CLS. Reserve space, use font-display strategies, etc.

## Working rules

- **Plan before executing** for any task touching more than 3 files. Produce a plan and wait for approval before making changes.
- **Ask before adding any new dependency.** Don't `npm install` anything not already in the stack list above without checking first.
