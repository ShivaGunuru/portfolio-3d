# portfolio-3d

Personal portfolio for Shiva Gunuru, an AI engineer. Single page, four sections.
Hero plays a real, background-removed video of the subject locked to scroll
position; About runs a generative 3D point field.

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

### Hero and About

Two independent sections, two different techniques, not two variants of one
system. Each owns a canvas (or plain element, for Hero) scoped to its own
layout column, pinned by ScrollTrigger while in view: the viewport holds still
and the scroll gesture drives the animation to completion, then the section
releases and the page continues.

**Hero** plays a real video of the subject with the background removed: no
particles, no shader effects, the actual footage. The subject is isolated from
its background and baked offline into a sprite sheet (`src/dev/bakeHeroCutout.ts`)
rather than computed live, since per-frame background separation runs at
roughly 175ms/frame, far too slow for scroll-scrubbing. A plain 2D canvas steps
to the single baked frame nearest the current scroll position as the user
scrolls; frames are never blended, which is what avoids a double-exposure ghost
wherever the subject's pose changed between frames and is also how real
scroll-scrubbed video works. Background separation itself is a flood fill
inward from the border, bounded so it can only claim backdrop-coloured pixels.
Comparing against a reference colour, however carefully modelled, kept failing
at the extremes of a vignette; an unbounded fill went the other way and
hollowed the subject out through soft edges.

**About** runs a generative spherical-harmonic point field in WebGL, entirely
computed from an equation with no source image. Every per-point transform
(breathing, scatter, cursor displacement) runs in the vertex shader. The
reference implementation this was ported from mutated thousands of positions
in a JavaScript loop each frame, which cannot absorb a per-point cursor
response on top; moving the work to the GPU holds 60fps on integrated
graphics, with hovering adding no measurable cost.

### Performance

three.js is roughly 860kB, needed only for About's WebGL field (Hero's cutout
is a plain 2D canvas with no three.js dependency at all), and every decorative
asset is kept off the critical path: both the three.js chunk and Hero's sprite
sheet are deferred to `requestIdleCallback`, and each section's layout box is
reserved up front so the visual arriving later cannot shift anything.

Getting the three.js deferral right required pinning React to its own bundle
chunk. Left unassigned it was folded into the three.js chunk, which forced the
entry to import that chunk statically and pulled the whole of three.js into
first paint regardless of how lazily the scene itself was imported.

| | eager JS |
|---|---|
| before | ~1221 kB |
| after | ~333 kB |

Below 768px, neither section's visual is rendered, imported, or downloaded at
all.

### Accessibility

- Every section is real semantic HTML, independent of the canvas or the Hero
  cutout. Both are `aria-hidden` and `pointer-events: none`; nothing on the
  page depends on WebGL or canvas to be readable.
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
  components/     sections, shared UI, and the Hero cutout (canvas, no three.js)
  content/site.ts every rendered word on the site
  hooks/          smooth scroll, scroll pinning, pointer, reduced motion, asset loaders
  three/          About's WebGL field, shaders, background separation (shared with the bake tool)
  dev/            bakeHeroCutout.ts + bake.html, the committed video-to-cutout bake tool
  assets/         baked Hero sprite sheet (hero-cutout.png/.json)
  index.css       design tokens. The only file with a hex value or font name
docs/             content inventory and the locked visual direction
```

`CLAUDE.md` documents the constraints and the reasoning behind them.
