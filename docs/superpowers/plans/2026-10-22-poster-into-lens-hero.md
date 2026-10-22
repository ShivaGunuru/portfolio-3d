# Poster into Lens Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Hero into one pinned sequence: a poster lock-up, then a camera push into the left lens, an ink title card, and bands opening onto Work.

**Architecture:** A pure `heroTimeline.ts` maps pin progress to phases and camera math. `useHeroCamera` measures the layout once per resize and, in a single rAF loop, writes styles to the camera layer, the back name, the band run, the hi-res still and the portalled lens card. A second ScrollTrigger on `#work` opens the card's bands.

**Tech Stack:** React 19, GSAP ScrollTrigger (existing pin), Tailwind v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-22-poster-into-lens-hero-design.md`

## Global Constraints

- Copy only from `site.ts` (`site.name`, `site.role`, `work.eyebrow`, `work.meta`, `projects[].title`). No em dashes.
- No hex outside `src/index.css`. New surface token: `--color-poster`.
- No new dependencies.
- No fades in the sequence. Layer switches are `visibility` swaps.
- Nothing between the back name and the portrait may create a stacking context, or `multiply` breaks. That rules out `transform`/`translate` on the portrait box and `z-index` on the grid. Push the box down with `position: relative; top`.
- Compact (768px and under) and reduced motion: no pin, no push, no card.
- Commit on `main`. Push only on request.

---

### Task 1: Pure timeline

**Files:** Create `src/hero/heroTimeline.ts`, `src/__tests__/heroTimeline.test.ts`.

**Produces:** `HERO_PIN_DISTANCE = 250`; `heroPhases(p) → { poster, push, titles }` (push eased); `coverZoom(w, h, lensRadiusPx)`; `pushZoom(push, cover)` (`= exp(ln(cover * 1.15) * push)`); `isInsideLens(zoom, cover)`; `cameraTransform({ lensX, lensY, width, height, zoom, push }) → { tx, ty, scale }`, applied as `translate(tx, ty) scale(scale)` with origin `0 0`.

- [ ] Write the tests first. Phase boundaries: poster ends at 0.55, push spans 0.55 to 0.9, titles start at 0.84. `pushZoom` is 1 at push 0 and passes `cover` before push 1. The transform is the identity at push 0, and at push 1 it maps the lens point to the viewport centre.
- [ ] Run them and expect FAIL. Implement. Run them and expect PASS. Commit.

### Task 2: Assets and portrait

**Files:** `src/assets/hero-lens-still.png`, `.json` (already extracted: 996x680 at 9.33s, lens `x 0.4789 y 0.3882 r 0.0529`, normalised); `src/index.css` (add `--color-poster`); `HeroCutout.tsx` (delete `bottomFade` and the mask); `HeroCutoutStage.tsx` (accept `boxRef` and `stillRef`, render the still `<img>` as an invisible overlay, and use `mix-blend-multiply` on both).

- [ ] Make the edits; typecheck and run the tests; commit.

### Task 3: Layers and camera

**Files:** Create `src/hooks/useHeroCamera.ts` and `src/components/HeroLensCard.tsx`; modify `Hero.tsx`.

- [ ] `Hero.tsx`: the section becomes `md:h-svh`, with negative side margins so its layers run edge to edge. Inside it: a camera layer containing the back name, the content grid (sitting above `--band-h`) and the band, all `aria-hidden` except the existing content.
- [ ] `useHeroCamera`: `measure()` places the box so its chest cut sits 30% into the band, and computes the lens point, the lens radius and `cover`. It runs on resize, `fonts.ready` and the ScrollTrigger `refresh` event. The rAF loop writes poster progress to the ref the cutout reads, the drifts, the camera transform, the still and camera visibility, the card visibility, the title rises and the band offsets. Each value is written only when it changes.
- [ ] Bands trigger: `ScrollTrigger.create({ trigger: '#work', start: 'top bottom', end: 'top 35%', scrub: true })`.
- [ ] `HeroLensCard`: a portal to `body`, fixed, z-40, invisible by default, with six strips each holding a 600%-tall copy of the card offset by `-i * 100%`.
- [ ] Typecheck, test and build; commit.

### Task 4: Verify and document

- [ ] Production preview at 1440x900 and 1280x720. Sample the phases at `p` = 0.3, 0.6, 0.75, 0.83, 0.95, then Work at the bands' midpoint and end. Check reverse scroll, a nav click to Work, reduced motion, 768px, and the console.
- [ ] Update the Hero section of `CLAUDE.md` (the fade mask is gone; the poster, the push, the lens card, the stacking-context rule, and the still manifest). Commit.
