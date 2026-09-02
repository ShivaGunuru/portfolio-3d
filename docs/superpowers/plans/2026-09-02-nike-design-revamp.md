# Nike Design-Language Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the site from its current dark violet-glow palette to a light, high-contrast, Nike-inspired visual language — white canvas, near-black ink, pill-shaped solid CTAs, flat zero-shadow cards, a single reserved accent — without touching content, copy, or interaction mechanics.

**Architecture:** Almost the entire visual system is driven by CSS custom properties declared once in `src/index.css` and consumed everywhere else via Tailwind utility classes (`bg-fg`, `text-accent`, etc.) or, for the 3D layer, via `getComputedStyle` at runtime (`HeadStage.tsx`). Changing the token *values* therefore re-colors most of the site with zero component-code changes. The remaining work is a small number of targeted component edits where the *shape* of something changes (button becomes a pill, chip becomes a pill, a color role moves from "always accent" to "neutral"), plus removing two decorative effects (the violet radial glow, the marquee's chromatic glitch) that have no equivalent in Nike's flat, gradient-free system.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.js`), React Three Fiber, Vitest.

## Global Constraints

- Every text color must clear WCAG AA (4.5:1) against its background — enforced by the existing `src/__tests__/palette.test.ts`, which reads `src/index.css` directly at test time. No test-file edit is needed for this plan; changing the CSS values is what the test validates.
- No em dashes anywhere in code comments or copy.
- No new npm dependencies.
- `prefers-reduced-motion` behavior must not regress — verified by the existing `src/__tests__/reducedMotion.test.ts` and a manual check in the final task.
- No changes to `src/content/site.ts` (copy), the Hero video-cutout bake pipeline, chroma-key logic, scroll-lock mechanics, or Lenis/GSAP scroll infrastructure.
- `docs/superpowers/specs/2026-09-02-nike-design-revamp-design.md` is the approved design spec this plan implements. Where this plan gives an exact value the spec left open (the 3D field's starting colors, the corrected accent hex), that value supersedes the spec's placeholder language.

---

### Task 1: Rewrite the color tokens in `src/index.css`

**Files:**
- Modify: `src/index.css:18-53` (the `@theme` block's Surfaces/Text/Accent/3D token groups)
- Test: `src/__tests__/palette.test.ts` (existing, unmodified — it reads `index.css` directly)

**Interfaces:**
- Produces: the token values every later task in this plan consumes (`--color-bg`, `--color-bg-soft` [new], `--color-fg`, `--color-body`, `--color-muted`, `--color-dim`, `--color-faint`, `--color-accent`, `--color-edge`, `--color-head-fg`, `--color-head-glow`). `--color-bg-glow` is removed here; Task 2 removes its one consumer.

The accent color cannot be copied verbatim from Nike's doc or from the current site: `#e8a33d` clears AA against the *old* dark background (9.12:1) but only manages ~2.15:1 against white, since flipping the background from dark to light flips which color needs to be the darker one for a fixed contrast ratio. It has been darkened to `#8b6225` — same hue (~36°), same role, recomputed to clear AA on white (5.43:1). Nike's own `stone` (#9e9ea0, ~2.7:1 on white) was considered for the `dim`/`faint` roles and rejected for the same reason: it fails AA outright. The other four grays below (`ink`, `charcoal`, `ash`, `mute`) are Nike's own values, verified to already clear AA on white, so they're used unmodified; `dim` has no Nike equivalent that fits the gap between `muted` and `faint`, so it's a computed midpoint.

- [ ] **Step 1: Replace the `@theme` block's Surfaces, Text, Accent, and 3D token groups**

Replace this (lines 18-44 of the current file):

```css
@theme {
  /* Surfaces */
  --color-bg: #0b0a14; /* page background */
  --color-bg-glow: #1b1740; /* radial gradient centre behind the hero */

  /* Text */
  --color-fg: #e6e3dc; /* primary, warm off-white */
  --color-body: #c9c5e4; /* case-study paragraph copy */
  /* Text tokens are ordered by WCAG contrast against --color-bg, and every one
     clears AA 4.5:1 for normal text. `dim` and `faint` were originally #6e6aa8
     (4.02:1) and #413c6e (1.96:1), both failing, the sign-off effectively
     invisible. They are lifted to the values below; `faint` is deliberately
     desaturated rather than merely darkened so it still reads as the quietest
     tier without dropping below the threshold.
     Ladder: faint 4.56 < dim 5.21 < muted 7.03 < accent 9.12 < body 11.79 < fg 15.35 */
  --color-muted: #9a95c8; /* nav links, subline, secondary labels. 7.03:1 */
  --color-dim: #807dba; /* eyebrow labels, tertiary meta. 5.21:1 */
  --color-faint: #797699; /* lowest emphasis, footer sign-off. 4.56:1 */

  /* Accent + structure */
  --color-accent: #e8a33d; /* links on hover, section labels, selection */
  --color-edge: #221e3c; /* hairline dividers, tag borders */

  /* 3D */
  --color-head-fg: #b9b4e8; /* head visualisation point colour */
  --color-head-glow: #ffe3b0; /* tint points take under the cursor */
```

with:

```css
@theme {
  /* Surfaces. Neither is text, so neither needs a contrast check on its own.
     Values are Nike's canvas/soft-cloud, adopted directly. */
  --color-bg: #ffffff; /* page background */
  --color-bg-soft: #f5f5f5; /* neutral "staging" backdrop behind the hero cutout and the 3D field, Nike's soft-cloud */

  /* Text. Reworked from a light-on-#0b0a14 ladder to a dark-on-white one.
     Values are Nike's own ink/charcoal/ash/mute where those already clear AA
     on white; `dim` has no Nike equivalent that fits between `muted` and
     `faint`, so it is a computed midpoint. Nike's own lightest tier, stone
     (#9e9ea0), was tried for that gap and rejected: it measures ~2.7:1 on
     white, well under the 4.5:1 floor, the same failure mode this file's
     dark-theme ladder hit once before.
     Ladder: faint 4.94 < dim 5.82 < muted 8.71 < body 11.51 < fg 18.88 */
  --color-fg: #111111; /* primary text, headlines. Nike ink. 18.88:1 */
  --color-body: #39393b; /* case-study paragraph copy. Nike charcoal. 11.51:1 */
  --color-muted: #4b4b4d; /* nav links, secondary labels. Nike ash. 8.71:1 */
  --color-dim: #656567; /* eyebrow labels, tertiary meta. Computed midpoint. 5.82:1 */
  --color-faint: #707072; /* lowest emphasis, footer sign-off. Nike mute. 4.94:1 */

  /* Accent + structure */
  --color-accent: #8b6225; /* links on hover, active nav, repo-status signal,
    selection. Darkened from the original #e8a33d, which cleared AA at 9.12:1
    against the old #0b0a14 background but manages only ~2.15:1 against white:
    flipping the background from dark to light flips which color needs to be
    the darker one of the pair. Same hue (~36 degrees), same role, darkened
    until it clears AA again. 5.43:1 against white. */
  --color-edge: #cacacb; /* hairline dividers, tag borders. Nike hairline */

  /* 3D. Starting points for the About field against the new light background.
     Both are tuned by rendering in Task 8, not fixed by this comment. */
  --color-head-fg: #1a1a1a; /* head visualisation point colour */
  --color-head-glow: #d98a2e; /* tint points take under the cursor */
```

- [ ] **Step 2: Run the existing palette test**

Run: `npx vitest run src/__tests__/palette.test.ts`
Expected: PASS, all cases — every text token clears 4.5:1, the ladder is strictly ascending, `head-fg`/`head-glow` are present.

- [ ] **Step 3: Typecheck and confirm nothing else referenced the removed `--color-bg-glow` Tailwind utility**

Run: `npx tsc -b --noEmit`
Expected: PASS. (This step only catches TypeScript errors; `--color-bg-glow`'s one consumer is a Tailwind arbitrary-value string in `App.tsx`, which Task 2 removes next. It is not a compile error today — an unresolved CSS custom property falls back to nothing, not a build failure — but leaving it in place even briefly is why Task 2 comes immediately after this one.)

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style: rework color tokens for the Nike-inspired light palette"
```

---

### Task 2: Remove the violet radial-gradient background layer

**Files:**
- Modify: `src/App.tsx:23-27`

**Interfaces:**
- Consumes: nothing new (this task only removes code).

Nike's system has no decorative gradients; this is the last consumer of `--color-bg-glow`, now removed from the token set.

- [ ] **Step 1: Delete the gradient div and its comment**

Remove these lines from `src/App.tsx` (currently lines 23-27):

```tsx
      {/* The gradient sits behind everything and never affects layout. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_70%_at_68%_26%,var(--color-bg-glow)_0%,var(--color-bg)_58%)]"
      />

```

The file's return block should read, immediately after `<SiteHeader />`:

```tsx
      <SiteHeader />

      {/* 3D stages live inside Hero and About, scoped to their own layout
          column — there is no page-wide canvas anymore. */}
      <main id="main" className="relative px-6 sm:px-gutter">
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: PASS

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds, no reference-to-undefined-variable warnings for `--color-bg-glow` anywhere in the build output.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "style: remove the violet radial-gradient background layer"
```

---

### Task 3: Remove the marquee's chromatic glitch, keep the plain scroll

**Files:**
- Modify: `src/index.css:109-259` (the Bottom marquee doc comment, `.marquee-run` rule and its `::before`/`::after`, and the `marquee-glow`/`marquee-glitch-warm`/`marquee-glitch-cool` keyframes)
- Modify: `src/components/BottomMarquee.tsx:44,56` (the two `marquee-run` class references) and its function doc comment

**Interfaces:**
- Consumes: nothing new.
- Produces: `.marquee-track` (kept, unchanged) is the only CSS class this component's motion still depends on.

- [ ] **Step 1: Replace the Bottom marquee CSS block**

Replace the whole comment-and-rules block from `/* -----... Bottom marquee. ... ----- */` through the end of `@keyframes marquee-glitch-cool { ... }` (lines 109-259 of the current file) with:

```css
/* ---------------------------------------------------------------------------
   Bottom marquee.

   Only what utilities cannot express lives here: the drift keyframe. Layout,
   type and colour stay in BottomMarquee.tsx as Tailwind utilities.

   Nothing in here needs a `prefers-reduced-motion` branch of its own. The
   base-layer block above already forces every animation to 0.01ms and a
   single iteration, which lands the drift on its first keyframe: the track
   sits still, which is the correct reduced-motion state for a decorative
   scrolling band.
   --------------------------------------------------------------------------- */
@layer components {
  .marquee-track {
    /* Slow enough to read as atmosphere rather than a stock ticker. */
    animation: marquee-drift 28s linear infinite;
  }
}

/* Travels rightward: content enters from the left edge and exits at the right.
   The track holds the word run twice, so -50% of the track is exactly one run
   wide, which puts the second copy where the first began. Start and end frames
   are therefore pixel-identical and the loop has no visible seam. */
@keyframes marquee-drift {
  from {
    transform: translate3d(-50%, 0, 0);
  }
  to {
    transform: translate3d(0, 0, 0);
  }
}
```

- [ ] **Step 2: Drop the now-unused `marquee-run` class from the component, and update its doc comment**

In `src/components/BottomMarquee.tsx`, change the JSDoc comment above `export function BottomMarquee()` from:

```tsx
/**
 * The band that closes the page: three words drifting rightward forever,
 * glowing, with an occasional chromatic glitch.
 *
```

to:

```tsx
/**
 * The band that closes the page: three words drifting rightward forever.
 *
```

Then change both occurrences of the span className (currently `"marquee-run shrink-0 font-display text-[clamp(2.5rem,8vw,6rem)] leading-none font-extrabold tracking-[-0.02em] whitespace-nowrap uppercase"`) to drop the leading `marquee-run `:

```tsx
          className="shrink-0 font-display text-[clamp(2.5rem,8vw,6rem)] leading-none font-extrabold tracking-[-0.02em] whitespace-nowrap uppercase"
```

(There are two identical spans; change both.)

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/components/BottomMarquee.tsx
git commit -m "style: drop the marquee's chromatic glitch, keep the plain scroll"
```

---

### Task 4: Restyle the Hero CTA as a solid pill, move the eyebrow off accent

**Files:**
- Modify: `src/components/sections/Hero.tsx:25-27,41-46`

**Interfaces:**
- Consumes: `--color-fg`, `--color-bg`, `--color-dim` from Task 1.

- [ ] **Step 1: Move the eyebrow from accent to the neutral `dim` role**

Change:

```tsx
          <p className="font-mono text-xs tracking-[0.2em] text-accent uppercase">
            {hero.eyebrow}
          </p>
```

to:

```tsx
          <p className="font-mono text-xs tracking-[0.2em] text-dim uppercase">
            {hero.eyebrow}
          </p>
```

This is the first of three eyebrow-color changes in this plan (`SectionHeading` is Task 5); together they move every section label off the reserved accent color, per the design spec's "accent is signal, not decoration" rule.

- [ ] **Step 2: Replace the outlined CTA with a solid ink pill**

Change:

```tsx
            <a
              href={hero.cta.href}
              className="border border-dim px-[22px] py-[13px] transition-colors hover:border-accent hover:text-accent"
            >
              {hero.cta.label}
            </a>
```

to:

```tsx
            <a
              href={hero.cta.href}
              className="rounded-full bg-fg px-8 py-4 text-bg transition-opacity hover:opacity-80"
            >
              {hero.cta.label}
            </a>
```

`px-8 py-4` is Tailwind's 32px/16px, matching Nike's `button-primary` padding exactly. `text-bg` reads as "white text" now that `--color-bg` is white, the same way it always read as "the page's own background color" — no new token needed for an inverse-text role.

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/Hero.tsx
git commit -m "style: restyle the Hero CTA as a solid pill, move the eyebrow off accent"
```

---

### Task 5: Move `SectionHeading`'s label off accent

**Files:**
- Modify: `src/components/SectionHeading.tsx:22-24`

**Interfaces:**
- Consumes: `--color-dim` from Task 1.
- Produces: recolored eyebrow used by Work, About, and Contact's section headers (`Work.tsx`, `About.tsx`, `Contact.tsx` all render `<SectionHeading>` with no other markup of their own for this element, so this one change covers all three sections).

- [ ] **Step 1: Change the label's color**

Change:

```tsx
      <h2
        id={id}
        className="font-mono text-xs tracking-[0.2em] text-accent uppercase"
      >
```

to:

```tsx
      <h2
        id={id}
        className="font-mono text-xs tracking-[0.2em] text-dim uppercase"
      >
```

- [ ] **Step 2: Typecheck and build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add src/components/SectionHeading.tsx
git commit -m "style: move the WORK/ABOUT/CONTACT eyebrow labels off accent"
```

---

### Task 6: Restyle Work — uppercase titles, neutral hook color, pill tags

**Files:**
- Modify: `src/components/sections/Work.tsx:22-24,29,36`

**Interfaces:**
- Consumes: `--color-body`, `--color-edge`, `--color-muted` from Task 1; `TypeOnScroll`'s `className` prop (unchanged signature, only the class string passed to it changes).

Project titles are short noun-phrase labels ("AI Farmer Helpline"), exactly what Nike's big/bold/uppercase display tier is for — unlike the Hero H1, which is a full sentence and stays as-is per the design spec. The hook line currently sits on the reserved accent color; under the "accent is signal, not decoration" rule established in Tasks 4-5, it moves to the neutral body color. Tags move from bordered rectangles to pill chips.

- [ ] **Step 1: Uppercase the project title**

Change:

```tsx
        <h3
          id={headingId}
          className="font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.02em]"
        >
```

to:

```tsx
        <h3
          id={headingId}
          className="font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.02em] uppercase"
        >
```

- [ ] **Step 2: Move the hook line off accent, onto body**

Change:

```tsx
        <TypeOnScroll
          text={project.hook}
          className="text-lg leading-snug font-light text-accent text-pretty sm:text-[19px]"
        />
```

to:

```tsx
        <TypeOnScroll
          text={project.hook}
          className="text-lg leading-snug font-light text-body text-pretty sm:text-[19px]"
        />
```

- [ ] **Step 3: Make the tag chips pill-shaped**

Change:

```tsx
            <li
              key={tag}
              className="border border-edge px-2.5 py-1.5 font-mono text-[11px] tracking-[0.1em] text-muted uppercase"
            >
```

to:

```tsx
            <li
              key={tag}
              className="rounded-full border border-edge px-2.5 py-1.5 font-mono text-[11px] tracking-[0.1em] text-muted uppercase"
            >
```

- [ ] **Step 4: Typecheck and build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Work.tsx
git commit -m "style: uppercase project titles, move the hook off accent, pill-shape tags"
```

---

### Task 7: Stage the Hero cutout and About field on a soft-cloud backdrop

**Files:**
- Modify: `src/components/sections/Hero.tsx:56-59`
- Modify: `src/components/sections/About.tsx:68-71`

**Interfaces:**
- Consumes: `--color-bg-soft` from Task 1, via Tailwind's `bg-bg-soft` utility (generated automatically from the token by Tailwind v4's `@theme` block — no new utility needs registering).

Nike's rule: "Stage every product photograph on soft-cloud — the gray is the system's studio." Neither box currently sets a background, so both currently show bare white behind the subject/field. Adding the soft-cloud fill gives both the same "staged on a neutral backdrop" read Nike uses for all of its photography. Neither box has a border-radius today (Tailwind's default is none unless set), so this already satisfies Nike's zero-radius container rule with no extra class needed.

- [ ] **Step 1: Add the backdrop to the Hero cutout box**

Change:

```tsx
        <HeroCutoutStage
          progress={progress}
          className="w-full max-w-2xl justify-self-center"
        />
```

to:

```tsx
        <HeroCutoutStage
          progress={progress}
          className="w-full max-w-2xl justify-self-center bg-bg-soft"
        />
```

- [ ] **Step 2: Add the backdrop to the About field box**

Change:

```tsx
        <Stage
          progress={progress}
          className="aspect-square w-full max-w-xl justify-self-center"
        />
```

to:

```tsx
        <Stage
          progress={progress}
          className="aspect-square w-full max-w-xl justify-self-center bg-bg-soft"
        />
```

- [ ] **Step 3: Typecheck and build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 4: Visually confirm the backdrop renders where expected**

Start the dev server (`npm run dev`), open the site, and inspect both boxes:

```bash
npm run dev
```

In a browser at `http://localhost:5173`, scroll to Hero and to About. Confirm both the cutout box and the 3D-field box show a light gray rectangle (not pure white, not visibly darker than the page in a way that reads as an error) behind their content, at both mobile (<768px, where the boxes should not render *at all* — this is the existing mobile-hide rule, unaffected by this task) and desktop widths.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Hero.tsx src/components/sections/About.tsx
git commit -m "style: stage the Hero cutout and About field on a soft-cloud backdrop"
```

---

### Task 8: Tune the About field's colors against the light background

**Files:**
- Modify: `src/index.css` (the `--color-head-fg` / `--color-head-glow` values set as a starting point in Task 1, tuned here)

**Interfaces:**
- Consumes: `HarmonicField`'s existing `baseColor`/`accentColor`/`glowColor` props (unchanged signature — `HeadStage.tsx` already resolves these from `--color-head-fg`/`--color-accent`/`--color-head-glow` via `getComputedStyle`, so no component code changes, only the CSS values feeding it).

Task 1 set `--color-head-fg: #1a1a1a` and `--color-head-glow: #d98a2e` as a reasoned starting point (dark points against the light background, mirroring the site's own ink/accent relationship), not a verified final answer — additive-blend glow behaves very differently composited over white than over near-black, and this needs to be confirmed by rendering, the same way this project's Hero field brightness and hover-glow were tuned earlier by rendering and measuring rather than by picking numbers upfront.

- [ ] **Step 1: Start the dev server and open the About section**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser, scroll to the About section, and let the pinned scroll animation settle so the field is fully visible.

- [ ] **Step 2: Check baseline legibility**

At rest (no cursor over the field), confirm:
- The point cloud is clearly visible against the `--color-bg-soft` backdrop from Task 7 — not so dark it looks like a solid black blob with no internal structure, not so light it disappears into the backdrop.
- Moving the cursor over the field visibly brightens/warms the nearby points (the existing hover-glow behavior, unchanged in code, only in color).

If the resting point color is too flat or too dark to show structure, lighten `--color-head-fg` toward a dark warm gray (for example `#2a2622`) rather than pure near-black, and re-check.

- [ ] **Step 3: Check the hover glow**

Hover over several different areas of the field and confirm the glow color (`--color-head-glow`) reads as a distinct warm highlight against both the point color and the soft-cloud backdrop — not so pale it blends into the backdrop, not so saturated it clips to solid white in the brightened area.

If the glow washes out against the light backdrop, deepen `--color-head-glow` toward a more saturated/darker amber (for example `#b8681c`) and re-check. If it reads muddy or barely different from the resting point color, brighten or increase saturation instead.

- [ ] **Step 4: Confirm reduced motion still holds the field still**

With the OS-level "reduce motion" setting enabled, reload the page and scroll to About. Confirm the field renders a single static frame with no rotation or breathing motion (existing behavior, driven by `usePrefersReducedMotion`, not touched by this task — this step is verifying the color change didn't accidentally disturb it, not testing new logic).

- [ ] **Step 5: Record the final values and re-run the palette test**

Whatever values Steps 2-3 converged on, confirm they're what's currently in `src/index.css`, then run:

```bash
npx vitest run src/__tests__/palette.test.ts
```

Expected: PASS (this test only checks that `head-fg`/`head-glow` exist as valid hex values, not their contrast — any reasonable color chosen in Steps 2-3 will pass).

- [ ] **Step 6: Commit**

```bash
git add src/index.css
git commit -m "style: tune the About field's colors against the light background"
```

(If Steps 2-3 didn't need to change anything from Task 1's starting values, commit is still worth making as a no-op-if-unchanged checkpoint — skip only if `git status` shows no changes.)

---

### Task 9: Full-site verification pass

**Files:**
- None modified — this task is verification only. Fix-forward if it finds a problem (see Step 6).

**Interfaces:**
- Consumes: everything produced by Tasks 1-8.

- [ ] **Step 1: Full test suite**

```bash
npx vitest run
```

Expected: all suites pass, including `palette.test.ts`, `content.test.ts`, and `reducedMotion.test.ts`.

- [ ] **Step 2: Typecheck and production build**

```bash
npx tsc -b --noEmit
npm run build
```

Expected: both succeed with no new warnings.

- [ ] **Step 3: Visual pass at desktop width**

```bash
npm run dev
```

Open `http://localhost:5173` and check, section by section:
- Header/nav: light background, ink text, no leftover violet.
- Hero: no radial glow behind it; eyebrow is neutral gray, not amber; "See the work" is a solid ink pill with white text; the video cutout sits on the soft-cloud backdrop.
- Work: each project title is uppercase and large; the hook line types in a neutral (not amber) color; tags are pill-shaped; the "repo available" links are the one amber-colored element on the page.
- About: eyebrow is neutral gray; the 3D field sits on the soft-cloud backdrop and is legible at rest and under cursor hover.
- Contact: unchanged structurally, recolored.
- Bottom marquee: scrolls plainly, with no RGB-split flicker at any point in a 30-second observation window.

- [ ] **Step 4: Visual pass at mobile width (<768px)**

Resize the browser (or use device emulation) to under 768px. Confirm:
- Neither the Hero cutout nor the About field renders at all (existing mobile-hide rule).
- No layout shift or leftover reserved space where they would have been.
- All text remains legible against the light background at this width.

- [ ] **Step 5: Reduced-motion pass**

With the OS-level "reduce motion" setting enabled, reload and scroll through the whole page. Confirm: no scroll-pin animation plays (both stages hold a still frame), the marquee track doesn't drift, and all copy is fully visible (not stuck mid-reveal) — this is all pre-existing behavior this plan didn't touch, being reconfirmed rather than re-implemented.

- [ ] **Step 6: Fix forward if anything in Steps 3-5 looks wrong**

If a problem surfaces, fix it in the relevant file from the task list above and re-run the specific check that caught it, rather than batching fixes to the end. Commit each fix separately with a message describing what was wrong (for example `fix: About field points too dark to read against soft-cloud backdrop`).

- [ ] **Step 7: Final commit**

If Steps 1-5 required no fixes, there's nothing new to commit — this task's value is the verification record, not new code. If Step 6 produced fixes, they're already committed individually; no separate wrap-up commit is needed.
