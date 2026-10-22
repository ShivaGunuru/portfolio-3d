# CLAUDE.md

## Project

3D personal portfolio website for Shiva Gunuru, an AI engineer, built to support an active AI engineering job search. Four project case studies, an about section, and contact. Hero plays a real video of the subject on a white background that merges into the page, scroll-locked and effect-free; About runs a generative 3D spherical-harmonic point field. See "The Hero cutout" and "The About field" below.

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

Colors: `bg`, `bg-soft`, `fg`, `body`, `muted`, `dim`, `faint`, `accent`, `edge`, `head-fg`, `head-glow`.
Fonts: `font-display` (Syne), `font-sans` (IBM Plex Sans), `font-mono` (IBM Plex Mono).

**The palette is light: near-black ink on white, one reserved amber accent.** It was violet-on-near-black until the Nike-inspired revamp (`docs/superpowers/plans/2026-09-02-nike-design-revamp.md`). If you find `bg-glow`, a radial-gradient background layer, or a marquee chromatic-glitch class, they are stale. `bg-soft` is not used by either section any more. The Hero deliberately never carries it: its baked frames keep their own white background, so its box has to be the page's white (see "The Hero keeps its background"). The About field dropped it too: a soft-cloud rectangle puts a hard edge around a form that is meant to be points in space. The token currently has no consumer in `src/`.

**A colour that cleared AA on the old dark background will usually fail on white,** because flipping the background flips which colour of the pair has to be the darker one. The original accent `#e8a33d` measured 9.12:1 on `#0b0a14` and only ~2.15:1 on white; it is now `#8b6225`. `src/__tests__/palette.test.ts` reads `index.css` directly and enforces this, so changing a token is enough to be checked.

Read `src/index.css` for the values and what each is for. Note `edge` is the hairline/border token, not `border`, which would collide with Tailwind's own `border-*` utilities.

Fonts are **self-hosted via `@fontsource`**, never loaded from the Google Fonts CDN. A CDN request sends every visitor's IP to Google, which is live GDPR exposure for a site meant to be found by EU recruiters. Syne and IBM Plex Sans use variable builds; IBM Plex Mono has no variable build, so its 400/500 weights are imported individually.

**Never hardcode a color or font in a component.** Use the utilities, or read the custom property.

## The Hero cutout and the About field

**The two sections render fundamentally different things, not two variants of one system.** Hero plays real video of the subject, a plain 2D canvas with no shader effects. About runs a generative 3D spherical-harmonic point field in WebGL, no source footage at all. They used to share a `Stage`/`HeadStage` R3F wrapper behind a `variant` prop; Hero doesn't use R3F any more, so that prop is gone. If you find a `mode` or `variant` prop on `Stage`, or references to `data-hero-field`, `VideoField`, `videoFieldShaders.ts`, `bakeHeroVideo.ts`, `HeadPoints.tsx`, `usePortraitPoints.ts`, or `portraitSampler.ts`, they're stale: two earlier Hero designs (a static-portrait particle head, then a full video-particle field) were both replaced after user feedback, most recently "no particle animation, background removed, subject as it is, no effects." The background removal itself was then dropped too, in favour of letting the clip's own white background merge into the white page. Neither pipeline exists any more.

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

`src/components/HeroCutoutStage.tsx` (mobile-hide, idle-deferred load, matches `Stage.tsx`'s shape) renders `HeroCutout.tsx`, a `<canvas>` that steps through a baked sprite sheet of the subject, driven by the same `usePinnedStage` scroll progress every other stage uses. No WebGL, no shader, no glow, no hover effect: the brief was explicitly "clean... subject as it is... no effects."

**The current bake removes no background at all (`matte: 'none'`), and that is the whole point.** Read "The Hero keeps its background" below before touching any of the keying machinery, because most of that machinery is not currently in the path.

| File | Role |
|---|---|
| `src/three/chromaKey.ts` | Green-screen keyer plus despill. **Not currently in the path**; kept for footage whose backdrop is not the page colour. Pure per-pixel function: pixels in, soft alpha out |
| `src/three/backgroundSeparation.ts` | Bounded flood-fill separation, for footage with an ordinary (non-green) backdrop. Pure function of pixel data in, mask out. Not React/Three-specific despite living in `three/` |
| `src/dev/bakeHeroCutout.ts` | Dev-only, committed (not throwaway): video frames → baked cutout sprite sheet. Read it before touching the Hero visual |
| `src/dev/bake.html` | Run this in the dev server to re-bake after the source video changes; see its own instructions |
| `src/hooks/useHeroCutout.ts` | Loads and decodes `hero-cutout.png` + `.json`, degrades to `unavailable` on any failure |
| `src/components/HeroCutout.tsx` | The canvas: crops the current frame out of the sprite sheet and draws it, `object-fit: contain` |

**Motion is scroll-scrubbed by stepping to the nearest baked frame, never crossfading two.** Crossfading two independently-masked frames overlays two full poses at partial opacity mid-transition, which reads as a double-exposure ghost wherever the pose changed between frames, exactly the "effect" this design removed. Stepping is also what real scroll-scrubbed video does: decode and show the one frame nearest the scroll position.

**Frame positions in the sprite share one fixed crop window, computed as a union across every sampled frame,** the same reasoning the deleted particle bake used: frames must line up pixel-for-pixel when stepped through, or the subject would visibly jump on every frame change instead of moving the way it does in the source clip.

**That union's bounding box is trimmed by mass, not raw min/max.** A single frame's stray misclassified pixel (a corner vignette a hair's-breadth outside the backdrop bound, in a frame the clip's own exposure had drifted for) otherwise dictates the crop for all 36 frames on its own. Walking each axis's per-column/row subject-pixel count until it passes a small fraction (0.03%) of the total mass finds the real edge and ignores that kind of speck, the way a percentile ignores a handful of outliers.

#### The poster into lens sequence

The Hero is one pinned sequence, 250% of the viewport long. Spec: `docs/superpowers/specs/2026-10-22-poster-into-lens-hero-design.md`.

| Pin progress | Phase |
|---|---|
| 0 to 0.55 | **Poster.** Frames scrub; a giant pale `site.name` drifts left behind the head; an ink band of `site.role` drifts right over the chest cut |
| 0.55 to 0.9 | **Push.** The whole Hero (text, name, portrait, band) scales into the left lens as one CSS transform |
| 0.84 to 1 | **Inside the lens.** A fixed ink card; the four project titles rise in |
| after the pin | **Bands.** As `#work` scrolls up behind the card, six strips slide off alternately |

| File | Role |
|---|---|
| `src/hero/heroTimeline.ts` | Pure: phases, cover zoom, push zoom, camera transform, title and strip offsets. Tested |
| `src/hooks/useHeroCamera.ts` | Measures the layout, then one rAF loop of direct style writes |
| `src/components/HeroLensCard.tsx` | The ink card, portalled to `body` |
| `src/assets/hero-lens-still.png` + `.json` | Last poster pose at source resolution, plus its lens centre |

**The portrait multiplies over the back name, and nothing between the two may start a stacking context.** The frames keep their white background (see below), and `mix-blend-mode: multiply` is what makes that white disappear over the type. Blending only sees what is painted beneath it inside the same stacking context, so `transform`, `translate`, `opacity < 1`, or `z-index` on anything between the back name and the canvas makes multiply blend against an empty backdrop, and the white rectangle comes back. That is why `useHeroCamera` moves the portrait box with `top`, not `translate`, and why the content grid has no `z-index`.

**The push zoom is capped relative to the cover zoom, not at a fixed number.** `pushZoom` goes up to 1.15 times the zoom at which the lens covers the viewport, so the cut to ink lands at the same moment for every window size. A fixed cap was tried in the prototype: 40x never covered the lens at all, and 150x overshot and spent the end of the push on solid black.

**The bands cannot open inside the pin.** `#work` sits below the pinned Hero, so opening there reveals an empty Hero. The card is fixed and portalled to `body`, and its strips are driven by a second ScrollTrigger on `#work` (`top bottom` to `top 35%`).

**The hi-res still swaps in at the start of the push, with `visibility`, not a fade.** It is the same pose as the sprite's last frame, located in the source by template match (best at 9.33s; crop `(83, 621)` at 1080px wide). It is rgb24 PNG so its white is exactly 255 under multiply. **Re-extracting it means re-measuring the lens** in `hero-lens-still.json`. The lens centre was set by eye and checked with a marker, because automatic darkest-pixel detection kept catching the black frame and temple arm. **Hide the still explicitly when inside the lens.** Visibility is the one hiding property a child can override, and the still's own inline `visible` once kept the zoomed lens showing beneath the opening bands.

**The desktop headline is sized by height as well as width** (`min(4.2vw, 6.8svh)`), and the card titles by `min(3.3vw, 6.4svh)`. Syne is wide: the width-only headline wrapped to seven lines at 1366x768 and pushed the subline and CTA under the band. Measured clearance above the band after the change: 38px at 1280x720, 50 at 1366x768, 58 at 1440x900, 54 at 1024x768. At 800x600 the CTA still sits under the band, which is a known limit at that size.

**The pinned section has no margins of its own.** Its edge-to-edge negative margins live on a wrapper div, because GSAP moves a pinned element's margins onto its pin spacer and fixes its width at the content width, which cut the band and the name a gutter short of the right edge.

#### The Hero keeps its background

**`matte: 'none'` is the default, and it is why this Hero finally stopped flickering.** Every matte in this module is an estimate recomputed per frame, so wherever the estimate is marginal it wobbles frame to frame, and that wobble *is* the flicker. Three separate attempts fought it with better estimates (flood fill with a shared reference, then a green screen, then tuning both). The fix was to stop estimating. The source clip `no bg 1.mp4` arrives already matted onto pure white, and the Hero now sits on a pure white page, so the background can simply be **kept**: the frame's white and the page's white are the same colour, so the rectangle has no visible edge, and the silhouette that used to shimmer is no longer a boundary between two different things. **A matte that is never computed cannot drift.**

Measured on that clip before committing to it: background exactly `255,255,255` at every sampled point in all 36 sampled frames, 86.4% of pixels pure white, **zero** non-white pixels touching the frame border, and the antialiased edge only 0.41% of pixels, concentrated at 252-254. Left/right/top edges of the union crop are 0-0.15% subject, i.e. real white margin. The browser decodes those frames to exactly 255 and canvas-downscales them to exactly 255, so the merge is pixel-exact rather than merely close.

**This works only while three things stay true, and all three are easy to break:**

1. **The Hero stage box must have no background of its own.** It deliberately does *not* carry `bg-bg-soft`, and the About field's box no longer does either. Staging it on soft-cloud would put a `#f5f5f5` frame around a `#ffffff` rectangle, drawing a box around the very thing that is supposed to have no edges.
2. **`--color-bg` must stay pure white.** Change the page background and the Hero rectangle becomes visible immediately.
3. **The sprite must not be lossy.** WebP q92 measured 6x smaller and was rejected: it pushes background pixels up to 30 levels off white, exactly the speckle this approach exists to avoid. The shipped PNG is converted to `rgb24` after baking, which is bit-exact on the colour channels, drops a constant alpha channel worth ~1.6 MB, and strips the colour-profile chunks ffmpeg's frame extraction adds (those chunks are what would let a browser colour-manage the white a level or two off).

**Everything from here down describes the two matte paths, which are not currently used.** They are kept because footage will not always arrive pre-matted onto the page colour, and because their failure modes are expensive to rediscover.

**`matte: 'chroma'` is what to reach for if the page ever stops being the backdrop colour, and shoot green if there is a choice.** Shoot green whenever there is a choice. A key green backdrop is a colour nothing on a person is, so the matte becomes a per-pixel function with no reference sampled from the footage at all, which means there is no mechanism by which it can drift or flicker between frames, and alpha comes out genuinely soft (from the greenness falloff across an antialiased edge) rather than being a hard mask that has to be eroded and blurred back into softness. Measured on this clip: backdrop greenness 0.992 against every sampled subject region at 0.04 or below (white shirt -0.02, jacket -0.016, hair -0.075, skin -0.141, beard -0.192), with almost no pixel mass in between, so `keyLow`/`keyHigh` of 0.08/0.32 sit inside a very wide gap. Stability against the flood-fill path on comparable footage: **max frame-to-frame jump 0.351% versus 0.979%, mean pair difference 0.423% versus 1.153%.** Green spill is neutralised by clamping green to the next-highest channel (`despill`), without which the backdrop leaves a green rim on hair and shoulders once it is gone.

**Everything below this point describes the `floodfill` path**, kept because it is what handles footage that does *not* have a green backdrop, and because its failure modes are expensive to rediscover.

**Every frame is separated against one shared backdrop reference, averaged across the whole clip, never a per-frame one.** This is the main defence against flicker, and it is worth understanding why: with a per-frame reference, an exposure or white-balance drift between frames moves the classification threshold itself, so the silhouette breathes frame to frame even where the subject is perfectly still. The thing being measured did not change, the ruler did. Measured on this clip, frame-to-frame standard deviation of subject area: **3.443% with per-frame references, 0.869% with one shared reference**, a 4x improvement from this change alone. Residual frame-to-frame pixel churn of roughly 1.2% is genuine subject motion (sampled frames are 0.28s apart), not flicker.

**Enclosed backdrop pockets are recovered by hue, not by distance, and that distinction is load-bearing.** A patch of backdrop that the subject's own silhouette walls off from every seeded border (hair plus a raised hand can enclose one completely) is unreachable by a border-seeded flood fill at *any* tolerance, because the barrier is topological, not chromatic. The obvious fix, widening `backdropBound` until the fill reaches it, is a trap, and the measurement that proves it is worth not repeating: on this clip every connected region larger than 300px sitting within Euclidean distance 0.32 of the backdrop reference was **skin** (RGB around 149, 112, 86), so widening far enough to reach the real pocket would have dissolved the face and hand. Plain RGB distance cannot tell lit backdrop from skin. Hue can: the backdrop is neutral (R-B of 14 against a reference of 117, 115, 103) while skin is strongly warm (R-B of 63). `pocketChromaTolerance` gates on that spread and leaves brightness slack, which matches how a real backdrop actually varies, since uneven lighting moves brightness and leaves hue alone. With the gate in place every recovered region came back neutral (167, 164, 151 and similar) and no skin region qualified at any tolerance tried (14, 18, 24 all behaved identically, so this is not a knife-edge setting).

**The pocket area floor protects hair, and must not be lowered to chase specks.** Hair *highlights* are neutral grey, the same signature the backdrop has, so the hue gate cannot hold them out; only the area floor can. Lowering `pocketMinAreaFraction` from 0.001 to 0.0005 was tried to clear the last 149-160px specks, and it bit visible chunks out of the hairline, because lit hair forms neutral regions in exactly that size range. A few small specks are a far smaller problem than holes in the hair. **Known remaining limitation:** a handful of ~150px backdrop specks survive per frame, bridged to the main subject blob through thin connections so `keepLargestComponent` cannot see them either. Removing them needs something that can distinguish a highlight from a gap, not a looser threshold.

**`backdropBound` is 0.32, and an earlier revision's 0.4 was a workaround, not a tuning.** That value existed only to muscle the fill into enclosed pockets; `pocketBound` handles those directly now, so this is back to governing what it actually should: how far a pixel may sit from the reference before it stops being credible as backdrop at all. Keeping it tight is what protects hair and beard edges.

**Historical note, previous source video:** the paragraph below documents a since-superseded tuning from the AI-matted clip that briefly replaced this one. Kept because the reasoning about per-pixel filters still applies.

**`backdropBound` was raised to 0.4 for one revision, not the portrait-era 0.3.** This clip's backdrop isn't evenly lit: a patch of it can sit far enough from the single top-strip reference colour to fail a tighter bound while still plainly being backdrop, and because it's real fabric texture (not a flat colour) that patch can be large enough to fully wall itself off from every seeded border, which local-continuity flood fill can't cross no matter how patient it is. Measured on the clip's darkest stretch: subject-classified area drops from 54.5% at bound 0.3 to 46.5% at 0.4, then flattens, so 0.4 is the point past which more tolerance stops buying anything. **A per-pixel colour-distance cleanup pass was tried first instead of raising this bound, and rejected**: being neighbour-blind, it also ate into beard and hair detail wherever a stray pixel's colour happened to fall inside the bound by chance. Raising the bound instead keeps the fix inside the flood fill, which only ever admits a pixel that is both colour-plausible *and* continuous with an already-admitted neighbour, so it can't do that. **If a future source video leaks background in an isolated patch, reach for this bound (and `keepLargestComponent` in `bakeHeroCutout.ts`, which discards every subject-classified island except the largest) before reaching for a blanket colour filter.**

**On the matte paths, alpha is feathered, not a hard cutout** (the `none` path writes every pixel opaque and skips all of this), via an erosion (`erodePx`, strips the ring of mixed subject/backdrop colour the source video's own encoding leaves right at the silhouette edge) followed by a 2-pixel box blur. Erosion first matters: blurring the raw mask straight from `separateBackground` would smear that mixed-colour ring into a visible fringe instead of removing it. **How deep the erosion needs to be depends on the backdrop, not just the subject.** 1px was enough against this clip's muted grey/beige backdrop, where the leftover ring reads as a faint colour fringe easy to miss. Against the white backdrop of an AI-matted clip that briefly replaced it, the exact same leftover ring read as a stark, obviously-wrong white outline around the whole silhouette, since white is about as far from this subject's actual colours (skin, dark hair, black jacket) as a colour gets. `erodePx` is 3, which covers both. If a future video reintroduces edge fringing, this is the first knob to reach for, and re-check it visually against the site's actual dark background, not a white preview background, which hides a white fringe by definition.

**If you are going to pull a matte, prefer a raw clip with its real backdrop over a pre-matted one.** A clip run through an AI background remover arrives with per-frame independent mattes and no temporal coherence, so its edges wobble frame to frame and no amount of work in this pipeline can undo that: the information is already gone. One such clip was tried and reverted for exactly this reason. The matte paths here apply one shared, deterministic rule to every frame, which is what makes their output temporally stable. **Note the twist:** the clip once rejected for having a baked-in wobbly matte is the one now in use, because on the `none` path its matte is never re-derived and its wobble is between white and white.

**The reserved box's aspect ratio comes from the baked manifest, not a fixed Tailwind class.** `HeroCutoutStage.tsx` imports `hero-cutout.json` directly (a small bundled JSON import, not a fetch, so this is known synchronously at first render) and sets `style={{ aspectRatio: frameWidth / frameHeight }}` on the wrapper. A mismatched box (the original shipped with a forced `aspect-square`, while the baked crop is never square) letterboxes under `object-fit: contain`, which is what read as the cutout "floating" with dead space above and below instead of filling its column. Matching the box to the content's real proportions removes that gap without needing to fake it any other way. **If the box ever looks like it has dead margin again, check whether its aspect ratio still matches the current manifest before touching sizing or positioning.**

**There is no bottom fade any more: the chest cut is covered by the role band.** The source clip cuts the subject off mid-chest, and the bake reports where as `bottomCutFraction`. It used to be hidden with a CSS mask that dissolved the bottom of the frame; the poster sequence below replaced that with an ink band, and `useHeroCamera` positions the portrait box so the cut sits 30% of the way down into the band. If you ever bring a fade back, the lesson from the old one still holds: it had to reach full transparency *above* the cut, because a straight line at even 7% opacity rendered as a visible 450px rule.

Same lesson as the aspect ratio above: **anything that depends on the crop must be read from the manifest, because the crop is recomputed on every bake.**

**The first paint does not wait on `requestAnimationFrame`.** `HeroCutout.tsx` calls its draw function directly on mount, then lets it reschedule itself via rAF for every update after that. rAF never fires for a tab that mounts this while backgrounded (there's nothing to sync to until the tab is foregrounded), so gating the *first* draw behind it left the canvas blank until the user switched to the tab. Scroll-driven updates still run through rAF, which is fine: a user can't scroll a tab they can't see.

**`reducedMotion` holds one representative frame** (`still` prop, frame index `round(0.5 * (frameCount - 1))`, not the near-empty first or last frame of the clip) instead of stepping.

**Hero's grid column split favours the visual side** (`md:grid-cols-[1fr_1.2fr]` in `Hero.tsx`, not an even `grid-cols-2`), a direct response to "keep it a bit bigger... rather than floating." The text column doesn't need the space it gave up: its content already sits well under its own `max-w-160`, so narrowing the column slightly doesn't change how the copy wraps.

### The About field

Files: `harmonicGeometry.ts` (seeds, parameter sets, fit scale), `harmonicShaders.ts`, `HarmonicField.tsx`, rendered through `src/three/Stage.tsx` → `HeadStage.tsx`, which now only ever mounts this one scene.

**The harmonic form is solved per frame, never stored.** Each point knows only its angle on a Fibonacci-lattice sphere; position comes from `r = sin(m0 phi)^m1 + cos(m2 phi)^m3 + sin(m4 theta)^m5 + cos(m6 theta)^m7`, and scroll interpolates the eight numbers between two sets. A is a sphere, B is a four-pointed star, so the scroll reads as a system resolving out of a ball into structure.

**Exponents are the load-bearing part, and there is a window.** Near 1 the four terms sum into a fuzzy ball that fills the frame as noise. At 6, which an earlier revision used almost throughout, the lobes are carved so hard that equal-area sphere sampling stretches them into thin radiating sprays: the field read as a firework, and that was most of why it looked amateurish. 2 to 4 keeps the surface closed and legible. **If this field ever looks like a splatter again, look at the exponents before anything else.**

**Scale is fitted per morph, from a precomputed table.** `buildMorphFitTable` builds 17 fit scales at mount and `sampleMorphFit` interpolates between them each frame. One scale spanning the whole morph renders the smaller-radius endpoint smaller, so the form swells as it reorganises rather than just changing shape. Fitting per frame is not available: one fit costs 2.37ms against a 16.7ms budget. Use `harmonicFitScaleAt`, not `harmonicFitScale`, for a single shape: the latter walks five morph steps and, handed one set twice, scans the same shape six times. Verified: zero frame-edge contact across the morph, and both endpoints fit to the same maximum radius.

**That is not the same as a constant on-screen size, and no code here claims it is.** The fit normalises the form's maximum radius, not its projected on-screen size, and how much of that radius survives projection still shifts with the shape. Measured: the projected bounding box runs about 90% of the frame at morph 0 down to about 70% at morph 1, a residual 1.44x variation across the morph. That is a known property of max-radius fitting, not a bug. It is an improvement over the previous single-scale approach, which varied 1.70x, not a solved problem.

**Every point is one colour, and that is deliberate.** An earlier revision recoloured 14% of points to the accent so the highlight would "read as sparkle through the volume". That worked on a near-black page. On white, randomly placed coloured specks read as dirt, and this is the single change that most made the field look unfinished. Emphasis is the cursor's job. `src/__tests__/harmonicGeometry.test.ts` guards it.

**Depth is cued by alpha, not by perspective.** The camera sits at z 7.3 and the form is fitted to radius 1.55, so perspective varies point size by roughly 25% across the depth range, which reads as nothing. A `vDepth` varying fades the far side toward the page instead, and it is the difference between 42,000 dots as a flat speckle field and as a volume.

**Points on the radius floor are faded out.** `harmonicRadius` floors at 0.12, and every angle where all four terms cancel lands there, piling a dark knot at the origin. `smoothstep(0.13, 0.45, r)` on `vTone` removes it. They carry no shape information, so nothing is lost.

**The field sits on the page, with no backdrop.** `About.tsx` deliberately carries no `bg-bg-soft`: a soft-cloud rectangle puts a hard edge around a form that is supposed to be points in space. `--color-bg-soft` currently has no consumer in `src/` at all.

`harmonicGeometry.ts` and `HarmonicField.tsx` differ only in casing from each other's original names; the data module was renamed for exactly that reason, since a case-insensitive filesystem collides on it.

**Point size must be set against the 1px floor, not by eye.** `gl_PointSize` is clamped to `ALIASED_POINT_SIZE_RANGE`, whose minimum is 1. At the stage's real scale (`uScale = canvasHeight * dpr / 2`, about 491 for a 561px box) a `uSize` of 0.0135 works out to 0.91px, so every point clamped to 1px and the tone-driven size modulation became inert regardless of point count. **Always check the pixel size before adding points if this field ever looks dim.**

**All per-point motion is in the vertex shader, not JavaScript.** The reference implementation in `docs/direction/` mutates thousands of positions in a JS loop every frame; that does not hold 60fps once cursor response is added on top. Measured on Intel UHD 620: 60fps steady at 26,000+ points, hovering adds no measurable cost. **Do not move per-point work back into JS.**

**The cursor test happens in NDC, not world space.** It matches what the user sees on screen rather than what is near in 3D.

**Every canvas must stay `pointer-events: none`,** including the inline `style` passed to `<Canvas>` — R3F writes `pointer-events: auto` on its own container and will otherwise swallow clicks near it. Cursor position comes from a `window` listener, so hover works without the canvas intercepting anything.

**Glow is done in-shader**, via a radial falloff and a colour shift toward `head-glow` near the cursor. There is no postprocessing pass and no bloom dependency.

**The material blends normally, not additively, and that is not a style choice.** Additive blending only ever *adds* to the framebuffer, so on this section's near-white backdrop it is a mathematical no-op: measured, pure black points at three different sizes left 0% of pixels distinguishable from the background. It was the right mode while the page was near-black and points accumulated into light. **If this field ever looks invisible or washed out, check the blend mode before touching any colour** — no token value can compensate.

**Three constants downstream of the blend equation were tuned for additive light and had to change with it.** Near-cursor emphasis now rides on alpha, because the old `color *= 1.0 + vGlow * 2.0` overdrive accumulated as glow before and merely clips to white now. The near-cursor point-size boost dropped from 2.4 to 0.8, because under alpha blending overlapping points produce flat coverage rather than brighter light, so the highlight rendered as a hard-edged disc with no points visible in it.

**`uPush` is 0, for the same reason the Hero head's was.** The displacement is radially outward from the cursor, so any positive value evacuates the middle of the influence circle and the hover reads as a ring with a hole rather than as a highlight. On the old dark page that hole was just more background; on white it is a stark white disc ringed in amber. **This is the second time this shape has been rediscovered by rendering it. Do not raise `uPush` without looking at the result.**

**`reducedMotion` holds a representative form rather than animating**, via the same `still` prop pattern as the Hero cutout.

### The preloader

Six ink bands drift the role, the name and the four project titles (all from `site.ts`) until the page is ready, then slide off alternately and the whole site is revealed at once. It plays on every load, including cached reloads. Spec: `docs/superpowers/specs/2026-10-20-marquee-shutters-preloader-design.md`.

| File | Role |
|---|---|
| `src/preloader/bands.ts`, `markup.ts` | Pure: content → static HTML. Run in Node at build time |
| `vite.config.ts` `preloaderHtml()` | Replaces `<!-- preloader -->` in `index.html` with that HTML |
| `src/preloader/gate.ts` | Pure: when to lift. Opens once every task has settled **and** 1200ms has passed, or at 6000ms regardless |
| `src/preloader/run.ts` | DOM wiring, called from `main.tsx` before React renders. Exposes `whenRevealed()` / `isPreloading()` |

**The overlay is static HTML on purpose.** A React loader cannot paint until the bundle has downloaded and run, which shows a blank page first, the exact thing being prevented. In production `index.css` is a render-blocking `<link>`, so the overlay paints styled on frame one. In dev, CSS is injected by JS, so the unstyled markup flashes briefly. That is expected, and not a bug to chase.

**The gate waits for fonts, `window` `load`, and the Hero sprite (above 768px only), never the About field**, which is far below the fold and lazy by design. A rejected task counts as settled: the overlay gates the reveal, it does not validate assets. **`HeroCutoutStage` no longer defers to `requestIdleCallback`** for the same reason. The idle wait would let the Hero pop in after the reveal.

**The scroll lock is `html:has(#preloader) { overflow: hidden }`, so it releases itself when the node is removed.** That only works without a layout jump because `scrollbar-gutter: stable` sits on `html`; it used to be on `body`, where it did nothing. Lenis scrolls programmatically, which `overflow: hidden` does not stop, so `useSmoothScroll` also calls `lenis.stop()` until `whenRevealed()`.

**The reveal removes the node on the last band's `transitionend`, with a 1600ms fallback timer.** The fallback is not optional: transitionend never fires in a page that is not compositing (verified in the Claude browser pane, where even a bare 300ms test transition never ends). Without the fallback, the page would stay locked forever.

Fonts: the band text is `opacity: 0` until `document.fonts.ready` adds `has-fonts`, so the bands never visibly swap from a fallback face.

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
