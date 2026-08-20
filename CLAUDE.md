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

### Work: the typed project hooks

Each project's hook line types itself out as it scrolls into view, led by a drawn pointer that moves in, clicks the insertion point, and hands over to a blinking caret (`src/components/TypeOnScroll.tsx`). Only the hook is typed, not the detail bodies: a hook is around 90 characters and lands in about 1.5s, where a 250-character detail body would read as waiting rather than typing.

**Two ordering rules keep it from breaking the site's content guarantees, and both are easy to undo by accident:**

- **The split happens when the ScrollTrigger fires, never at mount.** An earlier revision built the character spans in the effect body, which left every hook sitting at `color: transparent` from load until its trigger fired. A trigger that never fires (a script error, a refresh landing oddly) would then have hidden that copy permanently. Verified after the fix: before scrolling, all four hooks are plain text with zero spans.
- **Characters are hidden with `color: transparent`, not `visibility` or `display`.** Transparent text stays in the accessibility tree and keeps its layout box, so the line is readable to assistive tech while animating and nothing reflows as it fills in. The other two would drop it from the tree and, for `display`, collapse the line.

**The pointer must be anchored `left: 0; top: 0`.** It is absolutely positioned inside the paragraph, and an absolutely-positioned element with no offsets keeps its *static* position, which for one appended after the text is wherever the text flow ended. Without the anchor every transform is measured from the end of the last line: measured, the pointer settled 256px right of its target. With it, the pointer lands exactly on the first character.

**Split characters use a plain space, never `&nbsp;`.** An early revision substituted U+00A0 for every space, reasoning that spaces might collapse while their neighbours were hidden. They would not have: collapsing applies to *sequences* of whitespace, and each space here sits alone inside its own span. What it did do was make the entire line unbreakable, so the hook ran straight out of its grid column and across the detail column beside it. The regression check that catches this is comparing line count before and after the split: they must match, since the split is not supposed to change layout at all.

**The caret is re-inserted into the DOM after the last revealed character each frame**, rather than positioned by coordinate. Line breaking then carries it onto the next line for free, which a tracked coordinate would get wrong the moment the text wraps.

The drawn pointer is skipped under `(pointer: coarse)`, since imitating a mouse cursor on a touch device is a lie. Typing still runs there. Under `prefers-reduced-motion` nothing runs at all and the text is simply never touched.

### The Hero cutout

`src/components/HeroCutoutStage.tsx` (mobile-hide, idle-deferred load, matches `Stage.tsx`'s shape) renders `HeroCutout.tsx`, a `<canvas>` that steps through a baked sprite sheet of the subject with the background removed, driven by the same `usePinnedStage` scroll progress every other stage uses. No WebGL, no shader, no glow, no hover effect: the brief was explicitly "clean... subject as it is... no effects."

| File | Role |
|---|---|
| `src/three/chromaKey.ts` | Green-screen keyer plus despill. **The path the current source video uses.** Pure per-pixel function: pixels in, soft alpha out |
| `src/three/backgroundSeparation.ts` | Bounded flood-fill separation, for footage with an ordinary (non-green) backdrop. Pure function of pixel data in, mask out. Not React/Three-specific despite living in `three/` |
| `src/dev/bakeHeroCutout.ts` | Dev-only, committed (not throwaway): video frames → baked cutout sprite sheet. Read it before touching the Hero visual |
| `src/dev/bake.html` | Run this in the dev server to re-bake after the source video changes; see its own instructions |
| `src/hooks/useHeroCutout.ts` | Loads and decodes `hero-cutout.png` + `.json`, degrades to `unavailable` on any failure |
| `src/components/HeroCutout.tsx` | The canvas: crops the current frame out of the sprite sheet and draws it, `object-fit: contain` |

**Motion is scroll-scrubbed by stepping to the nearest baked frame, never crossfading two.** Crossfading two independently-masked frames overlays two full poses at partial opacity mid-transition, which reads as a double-exposure ghost wherever the pose changed between frames, exactly the "effect" this design removed. Stepping is also what real scroll-scrubbed video does: decode and show the one frame nearest the scroll position.

**Frame positions in the sprite share one fixed crop window, computed as a union across every sampled frame,** the same reasoning the deleted particle bake used: frames must line up pixel-for-pixel when stepped through, or the subject would visibly jump on every frame change instead of moving the way it does in the source clip.

**That union's bounding box is trimmed by mass, not raw min/max.** A single frame's stray misclassified pixel (a corner vignette a hair's-breadth outside the backdrop bound, in a frame the clip's own exposure had drifted for) otherwise dictates the crop for all 36 frames on its own. Walking each axis's per-column/row subject-pixel count until it passes a small fraction (0.03%) of the total mass finds the real edge and ignores that kind of speck, the way a percentile ignores a handful of outliers.

**The current source is a green screen, and `matte: 'chroma'` is the default for that reason.** Shoot green whenever there is a choice. A key green backdrop is a colour nothing on a person is, so the matte becomes a per-pixel function with no reference sampled from the footage at all, which means there is no mechanism by which it can drift or flicker between frames, and alpha comes out genuinely soft (from the greenness falloff across an antialiased edge) rather than being a hard mask that has to be eroded and blurred back into softness. Measured on this clip: backdrop greenness 0.992 against every sampled subject region at 0.04 or below (white shirt -0.02, jacket -0.016, hair -0.075, skin -0.141, beard -0.192), with almost no pixel mass in between, so `keyLow`/`keyHigh` of 0.08/0.32 sit inside a very wide gap. Stability against the flood-fill path on comparable footage: **max frame-to-frame jump 0.351% versus 0.979%, mean pair difference 0.423% versus 1.153%.** Green spill is neutralised by clamping green to the next-highest channel (`despill`), without which the backdrop leaves a green rim on hair and shoulders once it is gone.

**Everything below this point describes the `floodfill` path**, kept because it is what handles footage that does *not* have a green backdrop, and because its failure modes are expensive to rediscover.

**Every frame is separated against one shared backdrop reference, averaged across the whole clip, never a per-frame one.** This is the main defence against flicker, and it is worth understanding why: with a per-frame reference, an exposure or white-balance drift between frames moves the classification threshold itself, so the silhouette breathes frame to frame even where the subject is perfectly still. The thing being measured did not change, the ruler did. Measured on this clip, frame-to-frame standard deviation of subject area: **3.443% with per-frame references, 0.869% with one shared reference**, a 4x improvement from this change alone. Residual frame-to-frame pixel churn of roughly 1.2% is genuine subject motion (sampled frames are 0.28s apart), not flicker.

**Enclosed backdrop pockets are recovered by hue, not by distance, and that distinction is load-bearing.** A patch of backdrop that the subject's own silhouette walls off from every seeded border (hair plus a raised hand can enclose one completely) is unreachable by a border-seeded flood fill at *any* tolerance, because the barrier is topological, not chromatic. The obvious fix, widening `backdropBound` until the fill reaches it, is a trap, and the measurement that proves it is worth not repeating: on this clip every connected region larger than 300px sitting within Euclidean distance 0.32 of the backdrop reference was **skin** (RGB around 149, 112, 86), so widening far enough to reach the real pocket would have dissolved the face and hand. Plain RGB distance cannot tell lit backdrop from skin. Hue can: the backdrop is neutral (R-B of 14 against a reference of 117, 115, 103) while skin is strongly warm (R-B of 63). `pocketChromaTolerance` gates on that spread and leaves brightness slack, which matches how a real backdrop actually varies, since uneven lighting moves brightness and leaves hue alone. With the gate in place every recovered region came back neutral (167, 164, 151 and similar) and no skin region qualified at any tolerance tried (14, 18, 24 all behaved identically, so this is not a knife-edge setting).

**The pocket area floor protects hair, and must not be lowered to chase specks.** Hair *highlights* are neutral grey, the same signature the backdrop has, so the hue gate cannot hold them out; only the area floor can. Lowering `pocketMinAreaFraction` from 0.001 to 0.0005 was tried to clear the last 149-160px specks, and it bit visible chunks out of the hairline, because lit hair forms neutral regions in exactly that size range. A few small specks are a far smaller problem than holes in the hair. **Known remaining limitation:** a handful of ~150px backdrop specks survive per frame, bridged to the main subject blob through thin connections so `keepLargestComponent` cannot see them either. Removing them needs something that can distinguish a highlight from a gap, not a looser threshold.

**`backdropBound` is 0.32, and an earlier revision's 0.4 was a workaround, not a tuning.** That value existed only to muscle the fill into enclosed pockets; `pocketBound` handles those directly now, so this is back to governing what it actually should: how far a pixel may sit from the reference before it stops being credible as backdrop at all. Keeping it tight is what protects hair and beard edges.

**Historical note, previous source video:** the paragraph below documents a since-superseded tuning from the AI-matted clip that briefly replaced this one. Kept because the reasoning about per-pixel filters still applies.

**`backdropBound` was raised to 0.4 for one revision, not the portrait-era 0.3.** This clip's backdrop isn't evenly lit: a patch of it can sit far enough from the single top-strip reference colour to fail a tighter bound while still plainly being backdrop, and because it's real fabric texture (not a flat colour) that patch can be large enough to fully wall itself off from every seeded border, which local-continuity flood fill can't cross no matter how patient it is. Measured on the clip's darkest stretch: subject-classified area drops from 54.5% at bound 0.3 to 46.5% at 0.4, then flattens, so 0.4 is the point past which more tolerance stops buying anything. **A per-pixel colour-distance cleanup pass was tried first instead of raising this bound, and rejected**: being neighbour-blind, it also ate into beard and hair detail wherever a stray pixel's colour happened to fall inside the bound by chance. Raising the bound instead keeps the fix inside the flood fill, which only ever admits a pixel that is both colour-plausible *and* continuous with an already-admitted neighbour, so it can't do that. **If a future source video leaks background in an isolated patch, reach for this bound (and `keepLargestComponent` in `bakeHeroCutout.ts`, which discards every subject-classified island except the largest) before reaching for a blanket colour filter.**

**Alpha is feathered, not a hard cutout**, via an erosion (`erodePx`, strips the ring of mixed subject/backdrop colour the source video's own encoding leaves right at the silhouette edge) followed by a 2-pixel box blur. Erosion first matters: blurring the raw mask straight from `separateBackground` would smear that mixed-colour ring into a visible fringe instead of removing it. **How deep the erosion needs to be depends on the backdrop, not just the subject.** 1px was enough against this clip's muted grey/beige backdrop, where the leftover ring reads as a faint colour fringe easy to miss. Against the white backdrop of an AI-matted clip that briefly replaced it, the exact same leftover ring read as a stark, obviously-wrong white outline around the whole silhouette, since white is about as far from this subject's actual colours (skin, dark hair, black jacket) as a colour gets. `erodePx` is 3, which covers both. If a future video reintroduces edge fringing, this is the first knob to reach for, and re-check it visually against the site's actual dark background, not a white preview background, which hides a white fringe by definition.

**Prefer a raw clip with its real backdrop over a pre-matted one.** A clip run through an AI background remover arrives with per-frame independent mattes and no temporal coherence, so its edges wobble frame to frame and no amount of work in this pipeline can undo that: the information is already gone. One such clip was tried and reverted for exactly this reason. This pipeline applies one shared, deterministic rule to every frame, which is what makes its output temporally stable.

**The reserved box's aspect ratio comes from the baked manifest, not a fixed Tailwind class.** `HeroCutoutStage.tsx` imports `hero-cutout.json` directly (a small bundled JSON import, not a fetch, so this is known synchronously at first render) and sets `style={{ aspectRatio: frameWidth / frameHeight }}` on the wrapper. A mismatched box (the original shipped with a forced `aspect-square`, while the baked crop is never square) letterboxes under `object-fit: contain`, which is what read as the cutout "floating" with dead space above and below instead of filling its column. Matching the box to the content's real proportions removes that gap without needing to fake it any other way. **If the box ever looks like it has dead margin again, check whether its aspect ratio still matches the current manifest before touching sizing or positioning.**

**The bottom edge is eased out with a CSS mask, not a second baked alpha ramp.** `HeroCutout.tsx`'s canvas gets `mask-image: linear-gradient(to bottom, black 72%, transparent 96%)`. A mask composes with whatever alpha the sprite already has, so background pixels stay at zero and only the subject's own bottom edge (where the source video's frame boundary cuts across the chest) fades, without the bake needing to know anything about where the canvas will eventually place that frame. **A CSS mask is invisible against a white preview background just like a colour fringe is** — verify it against the real dark page, e.g. by replaying the same gradient math against a raw canvas capture, not by eyeballing a screenshot tool that composites transparency onto white.

**The first paint does not wait on `requestAnimationFrame`.** `HeroCutout.tsx` calls its draw function directly on mount, then lets it reschedule itself via rAF for every update after that. rAF never fires for a tab that mounts this while backgrounded (there's nothing to sync to until the tab is foregrounded), so gating the *first* draw behind it left the canvas blank until the user switched to the tab. Scroll-driven updates still run through rAF, which is fine: a user can't scroll a tab they can't see.

**`reducedMotion` holds one representative frame** (`still` prop, frame index `round(0.5 * (frameCount - 1))`, not the near-empty first or last frame of the clip) instead of stepping.

**Hero's grid column split favours the visual side** (`md:grid-cols-[1fr_1.2fr]` in `Hero.tsx`, not an even `grid-cols-2`), a direct response to "keep it a bit bigger... rather than floating." The text column doesn't need the space it gave up: its content already sits well under its own `max-w-160`, so narrowing the column slightly doesn't change how the copy wraps.

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
