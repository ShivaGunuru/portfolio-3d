# Marquee shutters preloader: design

**Date:** 20 October 2026
**Status:** Approved (concept 08 of 8, picked from animated previews)

## Goal

Hold the page behind a full-screen loader until its above-the-fold assets are ready, then reveal the whole site in one move, instead of fonts, the Hero sprite and layout arriving one at a time.

## The look

Six full-width bands in the page's ink colour (`--color-fg`), stacked to fill the viewport. Each band drifts its text horizontally, alternating direction band to band, reusing the existing `marquee-drift` keyframe. A 2px accent line along the top edge shows real progress.

Band copy, all from `src/content/site.ts` (no new copy):

| Band | Text | Style |
|---|---|---|
| 1 | `site.role` | mono, `--color-faint` |
| 2 | `projects[0].title` | mono |
| 3 | `site.name` | Syne extra-bold, `--color-bg` |
| 4 | `projects[1].title` | mono |
| 5 | `projects[2].title` | mono |
| 6 | `projects[3].title` | mono |

Reveal: the bands slide off-screen, alternating left and right, each starting 70ms after the one above it, over about 0.9s total. Then the overlay is removed from the DOM.

## Decisions

- **Plays on every page load**, including cached reloads (user's choice). A 1.2s minimum keeps a fast load from reading as a flicker.
- **The markup is in `index.html`, not React.** A React loader cannot paint until the JS bundle has downloaded and run, so the visitor would see a blank page first, the exact problem being solved. In a production build `index.css` becomes a render-blocking `<link>`, so the static markup paints styled on the first frame.
- **The band text is injected at build time** by a Vite `transformIndexHtml` plugin that replaces a `<!-- preloader -->` placeholder. `site.ts` stays the single source of copy. Only `index.html` carries the placeholder, so the legal pages get no loader.
- **The scroll lock is pure CSS:** `html:has(#preloader) { overflow: hidden }`. It releases itself when the node is removed. `scrollbar-gutter: stable` moves from `body` to `html`, so dropping the scrollbar during the lock does not shift the layout. Lenis is also stopped until the reveal, since it scrolls programmatically and `overflow: hidden` does not stop that.

## What the gate waits for

1. `document.fonts.ready`
2. `window` `load`
3. The Hero sprite sheet (`loadHeroCutout()`, the existing memoised loader), only above 768px. Below that the Hero visual never mounts.

A task that rejects still counts as settled: the loader is gating the reveal, not checking that every asset succeeded.

Timing: reveal when **every task has settled and at least 1.2s has passed**, or **at 6s regardless**. Progress is `settled / total` and drives the accent line.

**Not gated:** the About WebGL field. It is far below the fold and lazy by design.

**Knock-on change:** `HeroCutoutStage` drops its `requestIdleCallback` deferral. The loader now hides the load, and keeping the idle wait would let the Hero pop in after the reveal.

## Accessibility and fallbacks

- The overlay is `aria-hidden`. All page content stays in the DOM underneath it.
- Reduced motion: the base layer already forces animations and transitions to 0.01ms, so the bands sit still and the reveal is an instant cut. No extra branch is needed.
- No JS: `<noscript><style>#preloader{display:none}</style></noscript>`.
- Dev server: CSS is injected by JS there, so the unstyled markup flashes briefly. This is production-only behaviour, which is acceptable.

## Units

| File | Role |
|---|---|
| `src/preloader/bands.ts` | Pure: `site`/`projects` → six band definitions |
| `src/preloader/markup.ts` | Pure: bands → escaped HTML string (runs in Node at build time) |
| `src/preloader/gate.ts` | Pure: tasks + timing → `Promise<'ready' \| 'timeout'>` with progress callback |
| `src/preloader/run.ts` | DOM wiring: starts the gate, sets `--p`, plays the reveal, removes the node, exposes `whenRevealed()` |
| `vite.config.ts` | `preloaderHtml()` plugin |
| `src/index.css` | Band, track, progress and reveal styles |

## Testing

- `preloader.test.ts`: six bands, all sourced from `site.ts`; centre band is `site.name`; no em dashes; markup escapes HTML; `index.html` carries the placeholder.
- `preloaderGate.test.ts` (fake timers): waits out the minimum when tasks finish early; waits for slow tasks; times out at the maximum; counts a rejection as settled; reports progress.
- Browser, against the production preview: first-frame paint, the reveal plays, no layout shift, and the page scrolls normally afterwards.
