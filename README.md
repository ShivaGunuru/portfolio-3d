# portfolio-3d

Personal portfolio for Shiva Gunuru, an AI engineer. Single page, four sections,
with a scroll-driven point cloud as the visual centrepiece.

**Live:** https://portfolio-3d-jade-chi.vercel.app

## Stack

Vite · React 19 · TypeScript · React Three Fiber · GSAP ScrollTrigger · Lenis · Tailwind v4

No UI framework, no animation wrapper library, no postprocessing dependency.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
npm run preview  # serve the production build
npm test         # vitest
```

## How it works

### The point cloud

Two scenes, two shaders. Each of the Hero and About sections owns a canvas scoped
to its own layout column, pinned by ScrollTrigger while in view: the viewport
holds still and the scroll gesture drives the animation to completion, then the
section releases and the page continues.

Every per-point transform (breathing, scatter, cursor displacement) runs in the
vertex shader. The reference implementation this was ported from mutated tens of
thousands of positions in a JavaScript loop each frame, which cannot absorb a
per-point cursor response on top. Moving the work to the GPU holds 60fps on
integrated graphics, with hovering adding no measurable cost.

About runs a generative spherical-harmonic field with no source image. Hero
plays a real video: the subject is isolated from its background and turned into
a particle field whose motion is locked to scroll, baked offline (`src/dev/bakeHeroVideo.ts`)
rather than computed live, since per-frame background separation runs at
roughly 175ms/frame, far too slow for scroll-scrubbing. Point positions are a
fixed grid, unioned across every sampled frame of the source clip; only each
point's tone (which frames it's visible in, and how bright) varies, read from a
baked, tiled texture and blended between the two nearest frames by scroll
position. Background separation itself is a flood fill inward from the border,
bounded so it can only claim backdrop-coloured pixels. Comparing against a
reference colour, however carefully modelled, kept failing at the extremes of a
vignette; an unbounded fill went the other way and hollowed the subject out
through soft edges.

### Performance

three.js is roughly 860kB and the 3D layer is decorative, so it is kept off the
critical path entirely: the scene is imported lazily and deferred to
`requestIdleCallback`, and its layout box is reserved up front so the canvas
arriving later cannot shift anything.

Getting this right required pinning React to its own bundle chunk. Left
unassigned it was folded into the three.js chunk, which forced the entry to
import that chunk statically and pulled the whole of three.js into first paint
regardless of how lazily the scene itself was imported.

| | eager JS |
|---|---|
| before | ~1221 kB |
| after | ~333 kB |

Below 768px the 3D is not rendered, imported, or downloaded at all.

### Accessibility

- Every section is real semantic HTML, independent of the canvas. The 3D layer
  is `aria-hidden` and `pointer-events: none`; nothing on the page depends on
  WebGL to be readable.
- One `h1`, section titles as `h2`, project titles as `h3`. The small monospace
  eyebrow labels are the real headings rather than styled `span`s, so each
  section has an accessible name without a visually hidden duplicate.
- `prefers-reduced-motion` is honoured throughout: Lenis is never constructed,
  ScrollTrigger pins are skipped, the frame loop drops to `demand`, and reveal
  animations do not run.
- Every text colour meets WCAG AA against the background. Two tokens originally
  did not, one of them at 1.96:1; the palette test keeps that from returning.
- Text is visible by default and only ever animated by JavaScript, so a failed
  script cannot leave the page blank.

### Fonts

Self-hosted via `@fontsource`. Loading them from the Google Fonts CDN would send
every visitor's IP address to a third party, which is live GDPR exposure for a
site meant to be found by recruiters in the EU.

## Tests

```bash
npm test
```

Covers the invariants that are otherwise enforced only by remembering to check
them: WCAG contrast for every text token, the copy rules (no em dashes, no
placeholders, metadata in step with the content module), link schemes, and the
reduced-motion branches.

## Structure

```
src/
  components/     sections and shared UI
  content/site.ts every rendered word on the site
  hooks/          smooth scroll, scroll pinning, pointer, reduced motion
  three/          background separation, shaders, field components, canvas, lazy boundary
  dev/            bakeHeroVideo.ts, the committed video-to-particle bake tool
  assets/         baked hero field data (hero-field.bin/.json)
  index.css       design tokens. The only file with a hex value or font name
docs/             content inventory and the locked visual direction
```

`CLAUDE.md` documents the constraints and the reasoning behind them.
