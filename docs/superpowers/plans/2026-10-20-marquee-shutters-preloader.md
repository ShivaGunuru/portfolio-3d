# Marquee Shutters Preloader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hold the page behind six drifting ink bands until fonts, `window` `load` and the Hero sprite are ready, then slide the bands off and reveal the whole site at once.

**Architecture:** The static overlay markup is injected into `index.html` at build time from `site.ts` and styled by `index.css`, so it paints on the first frame without JS. A pure `waitForGate` decides when to reveal. `run.ts` wires it to the DOM and exposes `whenRevealed()` for Lenis.

**Tech Stack:** Vite `transformIndexHtml`, Tailwind v4 `@layer` CSS, Vitest fake timers, Lenis, GSAP ScrollTrigger.

**Spec:** `docs/superpowers/specs/2026-10-20-marquee-shutters-preloader-design.md`

## Global Constraints

- No em dashes in any rendered string or in `index.html`.
- No invented copy: band text comes only from `site.name`, `site.role`, `projects[n].title`.
- No hex values or font names outside `src/index.css`.
- No new dependencies.
- Plays on every load. Minimum 1200ms, maximum 6000ms.
- The overlay is `aria-hidden`; page content stays in the DOM.
- Commit directly on `main`.

---

### Task 1: Band model and markup (pure)

**Files:**
- Create: `src/preloader/bands.ts`, `src/preloader/markup.ts`
- Test: `src/__tests__/preloader.test.ts`

**Interfaces:**
- Produces: `interface Band { text: string; emphasis: boolean; direction: 'left' | 'right' }`, `BAND_COUNT = 6`, `NAME_BAND = 2`, `buildBands(name: string, role: string, projects: readonly { title: string }[]): Band[]`, `renderPreloaderMarkup(bands: readonly Band[]): string`, `PRELOADER_PLACEHOLDER = '<!-- preloader -->'`.

- [x] Write `src/__tests__/preloader.test.ts`: six bands; centre band is `site.name` and emphasised; every band's text is in `{site.name, site.role, ...titles}`; directions alternate; throws on fewer than 4 titles; markup escapes `<`, `&`, `"`; markup has `aria-hidden="true"` and `<noscript>`; no em dash; `index.html` contains `PRELOADER_PLACEHOLDER`.
- [x] Run `npx vitest run src/__tests__/preloader.test.ts`. Expect FAIL (modules missing).
- [x] Implement `bands.ts`: texts `[role, t0, name, t1, t2, t3]`, `direction: i % 2 === 0 ? 'left' : 'right'`.
- [x] Implement `markup.ts`: each band is `<div class="preloader-band[ preloader-band--name]" data-dir="…" style="--i:N"><div class="preloader-track"><span>RUN</span><span>RUN</span></div></div>`. RUN is `text · ` repeated (6 times for the name band, 20 for mono, so one run outspans a wide viewport), HTML-escaped. Wrap in `<div id="preloader" class="preloader" aria-hidden="true">…<div class="preloader-progress"></div></div><noscript><style>#preloader{display:none}</style></noscript>`.
- [x] Run tests. Expect PASS except the placeholder test (Task 3).

### Task 2: Gate (pure)

**Files:**
- Create: `src/preloader/gate.ts`
- Test: `src/__tests__/preloaderGate.test.ts`

**Interfaces:**
- Produces: `type GateOutcome = 'ready' | 'timeout'`, `waitForGate(tasks: readonly Promise<unknown>[], opts: { minMs: number; maxMs: number; onProgress?: (fraction: number) => void }): Promise<GateOutcome>`.

- [x] Write the tests with `vi.useFakeTimers()` and `vi.advanceTimersByTimeAsync`: (a) a fast task waits out `minMs`, not resolved at 1199, `'ready'` at 1200; (b) a slow task: not resolved at 3000, `'ready'` immediately after it resolves; (c) a never-settling task gives `'timeout'` at exactly 6000; (d) a rejected task counts as settled; (e) progress reports `[0, 0.5, 1]` for two tasks; (f) zero tasks gives `'ready'` at `minMs`.
- [x] Run. Expect FAIL.
- [x] Implement: one `setTimeout` for `maxMs` → `'timeout'`, one for `minMs` → set `minElapsed`; each task `.then(onSettle, onSettle)`; resolve `'ready'` once `minElapsed && settled === total`; settle once; clear the max timer on resolve.
- [x] Run. Expect PASS.

### Task 3: Build injection and styles

**Files:**
- Modify: `vite.config.ts` (add `preloaderHtml()` plugin), `index.html` (placeholder as first child of `<body>`), `src/index.css` (styles; move `scrollbar-gutter: stable` from `body` to `html`; add `html:has(#preloader) { overflow: hidden }`).

- [x] Plugin: `transformIndexHtml(html)` replaces `PRELOADER_PLACEHOLDER` with `renderPreloaderMarkup(buildBands(site.name, site.role, projects))`, and returns other HTML untouched.
- [x] CSS, in `@layer components`: `.preloader` fixed full-screen column at z-index 100; `.preloader-band` flex 1, `--color-fg` background, `box-shadow: 0 1px 0 var(--color-fg)` to hide seams, `transition: transform 0.9s cubic-bezier(0.65, 0, 0.35, 1)` with delay `calc(var(--i) * 70ms)`; `.preloader-track` reuses `marquee-drift` (30s, 45s for the name band, `reverse` for `data-dir='left'`), `opacity: 0` until `.preloader.has-fonts`; mono spans in `--color-faint` at 0.75rem / 0.14em; the name span in Syne 800 at `clamp(2.5rem, 7vw, 5.5rem)` in `--color-bg`; `.preloader-progress` 2px accent line using `scaleX(var(--p, 0))`; `.is-leaving` translates `left` bands to -101% and `right` bands to 101%, fades the progress line and sets `pointer-events: none`.
- [x] Run `npm test` (placeholder test now passes) and `npm run build`. Then `grep -c preloader-band dist/index.html` should print 6 or more, and `dist/privacy.html` should have none.

### Task 4: Runtime wiring

**Files:**
- Create: `src/preloader/run.ts`
- Modify: `src/main.tsx`, `src/hooks/useHeroCutout.ts` (export `loadHeroCutout`), `src/components/HeroCutoutStage.tsx` (drop the idle deferral), `src/hooks/useSmoothScroll.ts` (stop Lenis until reveal, refresh ScrollTrigger after).

**Interfaces:**
- Consumes: `waitForGate`, `loadHeroCutout(): Promise<HeroCutoutData>`.
- Produces: `startPreloader(): void`, `whenRevealed(): Promise<void>`, `isPreloading(): boolean`.

- [x] `run.ts`: tasks are `document.fonts.ready`, `windowLoaded()`, plus `loadHeroCutout()` when `(max-width: 768px)` does not match. `fonts.ready` adds `has-fonts`. `onProgress` sets `--p`. On gate, add `is-leaving`, then remove the node on the last band's `transitionend`, with a 1600ms fallback timer.
- [x] `main.tsx`: call `startPreloader()` before `createRoot`.
- [x] `useSmoothScroll`: after constructing Lenis, `if (isPreloading()) lenis.stop()`; `whenRevealed().then(() => { if (!cancelled) { lenis.start(); ScrollTrigger.refresh() } })`.
- [x] `HeroCutoutStage`: mount `HeroCutoutLoader` immediately above 768px. Remove `mayLoad` and the idle callback.
- [x] `npm run typecheck && npm test && npm run build`. All green.

### Task 5: Verify and document

- [x] Run `npm run preview` (port 4173). Check: the bands paint before JS runs, the text fades in, the progress line fills, the bands slide off alternately, `#preloader` is gone afterwards, the page scrolls, the Hero sprite is already drawn at reveal, and there are no console errors.
- [x] Add a "The preloader" section to `CLAUDE.md`.
- [x] Commit per task; push only on request.
